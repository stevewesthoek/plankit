#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'

const LOCAL_BASE_URL = process.env.LOCAL_DASHBOARD_BASE_URL || 'http://127.0.0.1:3054'
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'https://buildflow.prochat.tools'
const TOKEN = process.env.BUILDFLOW_ACTION_TOKEN || ''
const ROOT = process.cwd()
const DOCS_SCHEMA_FILE = path.join(ROOT, 'docs/openapi.chatgpt.json')
const INSTRUCTIONS_FILE = path.join(ROOT, 'docs/CUSTOM_GPT_INSTRUCTIONS.md')
const DOCS_SCHEMA_DIR = path.join(ROOT, 'docs/openapi.chatgpt')
const EXPECTED_OPERATION_IDS = [
  'getBuildFlowStatus',
  'listBuildFlowSources',
  'getBuildFlowActiveContext',
  'setBuildFlowActiveContext',
  'inspectBuildFlowContext',
  'readBuildFlowContext',
  'writeBuildFlowArtifact',
  'applyBuildFlowFileChange'
]
const LEGACY_NAMES = [
  'setBuildFlowContext',
  'action=list_sources',
  'action=get_active',
  'action=set_active'
]

if (!TOKEN) {
  console.error('BUILDFLOW_ACTION_TOKEN is required')
  process.exit(1)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function parseJsonSafe(text, label) {
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`Invalid JSON from ${label}: ${error instanceof Error ? error.message : String(error)}\n${text.slice(0, 500)}`)
  }
}

async function requestRaw(url, options = {}, timeoutMs = 45000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
  const startedAt = Date.now()
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        ...(options.headers || {})
      }
    })
    const text = await response.text()
    return {
      response,
      text,
      durationMs: Date.now() - startedAt,
      contentType: response.headers.get('content-type') || ''
    }
  } finally {
    clearTimeout(timer)
  }
}

async function requestJson(url, options = {}, timeoutMs = 45000) {
  const result = await requestRaw(url, options, timeoutMs)
  assert(result.contentType.includes('application/json'), `Expected JSON from ${url}, got ${result.response.status} ${result.contentType}\n${result.text.slice(0, 500)}`)
  const json = parseJsonSafe(result.text, url)
  return { ...result, json, byteLength: Buffer.byteLength(result.text, 'utf8') }
}

function loadDocsSchema() {
  assert(fs.existsSync(DOCS_SCHEMA_FILE), `Missing docs schema file: ${DOCS_SCHEMA_FILE}`)
  return JSON.parse(fs.readFileSync(DOCS_SCHEMA_FILE, 'utf8'))
}

function loadInstructions() {
  assert(fs.existsSync(INSTRUCTIONS_FILE), `Missing instructions file: ${INSTRUCTIONS_FILE}`)
  return fs.readFileSync(INSTRUCTIONS_FILE, 'utf8')
}

function ensureNoStaleFragments() {
  assert(fs.existsSync(DOCS_SCHEMA_DIR), `Missing docs schema directory: ${DOCS_SCHEMA_DIR}`)
  const entries = fs.readdirSync(DOCS_SCHEMA_DIR)
  const staleFragments = entries.filter(entry => entry.endsWith('.json'))
  assert(staleFragments.length === 0, `Stale schema fragments found: ${staleFragments.join(', ')}`)
}

function collectOperations(schema) {
  const ops = []
  for (const [routePath, pathItem] of Object.entries(schema.paths || {})) {
    for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
      const op = pathItem?.[method]
      if (op && typeof op === 'object') {
        ops.push({ routePath, method, ...op })
      }
    }
  }
  return ops
}

function ensureSchemaRules(schema) {
  const ops = collectOperations(schema)
  const ids = ops.map(op => op.operationId)
  assert(ids.length === EXPECTED_OPERATION_IDS.length, `Expected ${EXPECTED_OPERATION_IDS.length} operations, found ${ids.length}`)
  assert(new Set(ids).size === ids.length, 'OperationIds must be unique')
  assert(JSON.stringify([...EXPECTED_OPERATION_IDS].sort()) === JSON.stringify([...ids].sort()), `OperationIds mismatch: ${ids.join(', ')}`)

  const schemaText = JSON.stringify(schema)
  assert(Buffer.byteLength(schemaText, 'utf8') < 100000, 'OpenAPI schema exceeds 100000 characters')

  for (const legacy of LEGACY_NAMES) {
    assert(!schemaText.includes(legacy), `Legacy reference exposed in schema: ${legacy}`)
  }
  assert(!Object.prototype.hasOwnProperty.call(schema.paths || {}, '/api/actions/context'), 'Legacy /api/actions/context path must not be exposed')

  for (const op of ops) {
    assert(Array.isArray(op.security) && op.security.length > 0, `${op.operationId} missing security`)
    assert(Object.prototype.hasOwnProperty.call(op, 'x-openai-isConsequential'), `${op.operationId} missing x-openai-isConsequential`)
    assert(typeof op.summary === 'string' && op.summary.length > 0 && op.summary.length <= 300, `${op.operationId} summary invalid`)
    assert(typeof op.description === 'string' && op.description.length > 0 && op.description.length <= 300, `${op.operationId} description invalid`)
    const requestSchema = op.requestBody?.content?.['application/json']?.schema
    if (requestSchema) {
      visitDescriptions(requestSchema, (value, location) => {
        assert(value.length <= 700, `${op.operationId} description too long at ${location}`)
      })
    }
  }

  const writeArtifactSchema = schema.paths?.['/api/actions/write-artifact']?.post?.requestBody?.content?.['application/json']?.schema?.properties || {}
  const applyChangeSchema = schema.paths?.['/api/actions/apply-file-change']?.post?.requestBody?.content?.['application/json']?.schema?.properties || {}
  assert(Object.prototype.hasOwnProperty.call(writeArtifactSchema, 'dryRun'), 'writeBuildFlowArtifact must accept dryRun')
  assert(Object.prototype.hasOwnProperty.call(writeArtifactSchema, 'preflight'), 'writeBuildFlowArtifact must accept preflight')
  assert(Object.prototype.hasOwnProperty.call(applyChangeSchema, 'dryRun'), 'applyBuildFlowFileChange must accept dryRun')
  assert(Object.prototype.hasOwnProperty.call(applyChangeSchema, 'preflight'), 'applyBuildFlowFileChange must accept preflight')
  for (const key of ['delete_file', 'delete_directory', 'move', 'rename', 'mkdir', 'rmdir']) {
    assert((applyChangeSchema.changeType?.enum || []).includes(key), `applyBuildFlowFileChange must accept ${key}`)
  }
  for (const key of ['from', 'to', 'recursive', 'onlyIfEmpty', 'overwrite', 'createParents', 'createParentDirectories', 'confirmedByUser', 'confirmationToken']) {
    assert(Object.prototype.hasOwnProperty.call(applyChangeSchema, key), `applyBuildFlowFileChange must accept ${key}`)
  }
}

function ensureConsequentialFlags(schema) {
  const expectedFlags = new Map([
    ['getBuildFlowStatus', false],
    ['listBuildFlowSources', false],
    ['getBuildFlowActiveContext', false],
    ['inspectBuildFlowContext', false],
    ['readBuildFlowContext', false],
    ['setBuildFlowActiveContext', true],
    ['writeBuildFlowArtifact', true],
    ['applyBuildFlowFileChange', true]
  ])
  for (const op of collectOperations(schema)) {
    assert(op['x-openai-isConsequential'] === expectedFlags.get(op.operationId), `${op.operationId} consequential flag mismatch`)
  }
}

function ensureInstructionAlignment(instructions) {
  for (const operationId of EXPECTED_OPERATION_IDS) {
    assert(instructions.includes(operationId), `Instructions must mention ${operationId}`)
  }
  for (const legacy of LEGACY_NAMES) {
    assert(!instructions.includes(legacy), `Legacy instruction reference exposed: ${legacy}`)
  }
  assert(instructions.includes('verified:true'), 'Instructions must mention verified:true')
  assert(instructions.includes('single enabled searchable source'), 'Instructions must mention single-source preference')
  assert(instructions.includes('repo_app_maintainer'), 'Instructions must mention repo_app_maintainer')
  assert(!instructions.includes('/api/actions/context'), 'Instructions must not reference hidden/internal context endpoints')
}

function visitDescriptions(node, fn, location = 'schema') {
  if (!node || typeof node !== 'object') return
  if (typeof node.description === 'string') fn(node.description, location)
  if (node.properties && typeof node.properties === 'object') {
    for (const [key, value] of Object.entries(node.properties)) {
      visitDescriptions(value, fn, `${location}.${key}`)
    }
  }
  if (node.items) visitDescriptions(node.items, fn, `${location}[]`)
  if (Array.isArray(node.allOf)) node.allOf.forEach((item, index) => visitDescriptions(item, fn, `${location}.allOf[${index}]`))
  if (Array.isArray(node.anyOf)) node.anyOf.forEach((item, index) => visitDescriptions(item, fn, `${location}.anyOf[${index}]`))
  if (Array.isArray(node.oneOf)) node.oneOf.forEach((item, index) => visitDescriptions(item, fn, `${location}.oneOf[${index}]`))
}

async function fetchSchema(baseUrl) {
  const result = await requestJson(`${baseUrl}/api/openapi`, {}, 15000)
  return result.json
}

function regenerateDocsSchema() {
  const before = fs.existsSync(DOCS_SCHEMA_FILE) ? fs.readFileSync(DOCS_SCHEMA_FILE, 'utf8') : null
  execFileSync('node', ['scripts/generate-openapi-chatgpt.mjs'], { cwd: ROOT, stdio: 'pipe', env: process.env })
  const after = fs.readFileSync(DOCS_SCHEMA_FILE, 'utf8')
  if (before !== after) {
    if (before !== null) {
      fs.writeFileSync(DOCS_SCHEMA_FILE, before)
    } else {
      fs.unlinkSync(DOCS_SCHEMA_FILE)
    }
    throw new Error('docs/openapi.chatgpt.json was stale. Regenerate it before importing.')
  }
}

async function runActionSuite(baseUrl, label) {
  const startedAt = Date.now()
  const steps = []
  const runStep = async (name, fn) => {
    const stepStartedAt = Date.now()
    try {
      const result = await fn()
      const step = {
        name,
        ok: true,
        status: result.response.status,
        durationMs: Date.now() - stepStartedAt,
        byteLength: result.byteLength,
        json: result.json
      }
      steps.push(step)
      return result
    } catch (error) {
      const step = {
        name,
        ok: false,
        durationMs: Date.now() - stepStartedAt,
        error: error instanceof Error ? error.message : String(error)
      }
      steps.push(step)
      throw error
    }
  }

  const status = await runStep('getBuildFlowStatus', () => requestJson(`${baseUrl}/api/actions/status`, { method: 'GET' }))
  assert(status.response.status === 200, `${label}: status must return 200`)
  assert(status.json.connected === true || status.json.connected === false, `${label}: status connected missing`)

  const sources = await runStep('listBuildFlowSources', () => requestJson(`${baseUrl}/api/actions/sources`, { method: 'GET' }))
  assert(sources.response.status === 200, `${label}: sources must return 200`)
  assert(Array.isArray(sources.json.sources), `${label}: sources missing`)
  assert(sources.json.sources.every(source => typeof source.indexStatus === 'string' && typeof source.searchable === 'boolean'), `${label}: sources readiness fields missing`)

  const buildflowSource = sources.json.sources.find(source => source.id === 'buildflow')
  assert(buildflowSource, `${label}: buildflow source unavailable`)
  if (buildflowSource.indexStatus !== 'ready' || buildflowSource.searchable !== true) {
    await runStep('reindex buildflow source', async () => {
      const result = await requestJson(`${baseUrl}/api/agent/sources/reindex`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId: 'buildflow' })
      }, 45000)
      assert([200, 202].includes(result.response.status), `${label}: reindex should return 200 or 202`)
      return result
    })

    await runStep('wait for buildflow ready', async () => {
      const ready = await waitForSourceReady(baseUrl, 'buildflow', 120000)
      assert(ready, `${label}: buildflow did not become ready`)
      return ready
    })
  }

  const active = await runStep('getBuildFlowActiveContext', () => requestJson(`${baseUrl}/api/actions/context/active`, { method: 'GET' }))
  assert(active.response.status === 200, `${label}: active context must return 200`)
  assert(Array.isArray(active.json.activeSourceIds), `${label}: activeSourceIds missing`)

  await runStep('setBuildFlowActiveContext missing contextMode', async () => {
    const result = await requestJson(`${baseUrl}/api/actions/context/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceIds: ['buildflow'] })
    })
    assert(result.response.status === 400, `${label}: missing contextMode should fail`)
    return result
  })

  await runStep('setBuildFlowActiveContext missing sourceIds', async () => {
    const result = await requestJson(`${baseUrl}/api/actions/context/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextMode: 'single' })
    })
    assert(result.response.status === 400, `${label}: missing sourceIds should fail`)
    return result
  })

  await runStep('setBuildFlowActiveContext reject all', async () => {
    const result = await requestJson(`${baseUrl}/api/actions/context/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextMode: 'all', sourceIds: ['buildflow'] })
    })
    assert(result.response.status === 400, `${label}: contextMode=all should fail`)
    return result
  })

  await runStep('setBuildFlowActiveContext reject single zero', async () => {
    const result = await requestJson(`${baseUrl}/api/actions/context/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextMode: 'single', sourceIds: [] })
    })
    assert(result.response.status === 400, `${label}: single with 0 ids should fail`)
    return result
  })

  await runStep('setBuildFlowActiveContext reject single two', async () => {
    const second = sources.json.sources.find(source => source.id !== 'buildflow')?.id || '__other__'
    const result = await requestJson(`${baseUrl}/api/actions/context/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextMode: 'single', sourceIds: ['buildflow', second] })
    })
    assert(result.response.status === 400, `${label}: single with 2 ids should fail`)
    return result
  })

  await runStep('setBuildFlowActiveContext reject unknown', async () => {
    const result = await requestJson(`${baseUrl}/api/actions/context/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextMode: 'single', sourceIds: ['__missing_source__'] })
    })
    assert(result.response.status === 400, `${label}: unknown source should fail`)
    return result
  })

  const disabledSource = sources.json.sources.find(source => source.enabled === false)
  assert(disabledSource, `${label}: no disabled source available to verify rejection`)
  await runStep('setBuildFlowActiveContext reject disabled', async () => {
    const result = await requestJson(`${baseUrl}/api/actions/context/active`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contextMode: 'single', sourceIds: [disabledSource.id] })
    })
    assert(result.response.status === 400, `${label}: disabled source should fail`)
    return result
  })

  const setSingle = await runStep('setBuildFlowActiveContext single buildflow', () => requestJson(`${baseUrl}/api/actions/context/active`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contextMode: 'single', sourceIds: ['buildflow'] })
  }))
  assert(setSingle.response.status === 200, `${label}: set active single should return 200`)
  assert(setSingle.json.contextMode === 'single', `${label}: single contextMode mismatch`)
  assert(Array.isArray(setSingle.json.activeSourceIds) && setSingle.json.activeSourceIds.length === 1, `${label}: single active ids mismatch`)

  const inspectList = await runStep('inspectBuildFlowContext list_files', () => requestJson(`${baseUrl}/api/actions/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'list_files', sourceId: 'buildflow', path: '', depth: 1, limit: 10 })
  }))
  assert(inspectList.response.status === 200, `${label}: inspect list_files must return 200`)
  assert(Array.isArray(inspectList.json.entries) || Array.isArray(inspectList.json.results), `${label}: inspect list_files payload missing`)

  const inspectSearch = await runStep('inspectBuildFlowContext search', () => requestJson(`${baseUrl}/api/actions/inspect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'search', sourceId: 'buildflow', query: 'package.json', limit: 5 })
  }))
  assert(inspectSearch.response.status === 200, `${label}: inspect search must return 200`)
  assert(Array.isArray(inspectSearch.json.results), `${label}: inspect search results missing`)

  const readPaths = await runStep('readBuildFlowContext read_paths', () => requestJson(`${baseUrl}/api/actions/read-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'read_paths', sourceId: 'buildflow', paths: ['package.json'], maxBytesPerFile: 5000 })
  }))
  assert(readPaths.response.status === 200, `${label}: read_paths must return 200`)
  assert(Array.isArray(readPaths.json.files), `${label}: read_paths files missing`)

  const searchAndRead = await runStep('readBuildFlowContext search_and_read', () => requestJson(`${baseUrl}/api/actions/read-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'search_and_read', sourceId: 'buildflow', query: 'package.json', limit: 3, maxBytesPerFile: 5000 })
  }))
  assert(searchAndRead.response.status === 200, `${label}: search_and_read must return 200`)
  assert(Array.isArray(searchAndRead.json.results), `${label}: search_and_read results missing`)

  const artifactTitle = `GPT contract smoke ${label} ${Date.now()}`
  const artifactContent = `Smoke test artifact for ${label}.`
  const writeArtifact = await runStep('writeBuildFlowArtifact', () => requestJson(`${baseUrl}/api/actions/write-artifact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceId: 'buildflow',
      artifactType: 'general_doc',
      title: artifactTitle,
      content: artifactContent
    })
  }))
  assert(writeArtifact.response.status === 200, `${label}: write artifact must return 200`)
  assert(writeArtifact.json.verified === true, `${label}: write artifact must return verified:true`)
  assert(typeof writeArtifact.json.path === 'string' && writeArtifact.json.path.length > 0, `${label}: write artifact path missing`)

  const artifactDiskPath = path.resolve(ROOT, writeArtifact.json.path)
  assert(fs.existsSync(artifactDiskPath), `${label}: written artifact missing on disk`)

  const applyPath = `docs/product/tasks/gpt-contract-smoke-${label.toLowerCase()}-${Date.now()}.md`
  const applyChange = await runStep('applyBuildFlowFileChange create', () => requestJson(`${baseUrl}/api/actions/apply-file-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changeType: 'create',
      sourceId: 'buildflow',
      path: applyPath,
      content: `Smoke file for ${label}.`,
      reason: 'Contract smoke test'
    })
  }))
  assert(applyChange.response.status === 200, `${label}: apply file change must return 200`)
  assert(applyChange.json.verified === true, `${label}: apply file change must return verified:true`)

  const applyDiskPath = path.resolve(ROOT, applyChange.json.path || applyPath)
  assert(fs.existsSync(applyDiskPath), `${label}: applied file missing on disk`)

  for (const filePath of [artifactDiskPath, applyDiskPath]) {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  assert(!fs.existsSync(artifactDiskPath), `${label}: write artifact cleanup failed`)
  assert(!fs.existsSync(applyDiskPath), `${label}: apply-file cleanup failed`)

  return { startedAt, finishedAt: Date.now(), steps }
}

async function waitForSourceReady(baseUrl, sourceId, timeoutMs) {
  const startedAt = Date.now()
  while (Date.now() - startedAt < timeoutMs) {
    const result = await requestJson(`${baseUrl}/api/agent/sources`, { method: 'GET' })
    const source = Array.isArray(result.json.sources) ? result.json.sources.find(entry => entry.id === sourceId) : null
    if (source && source.indexStatus === 'ready' && source.searchable === true) {
      return result
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  return null
}

async function main() {
  const localSchema = await fetchSchema(LOCAL_BASE_URL)
  const publicSchema = await fetchSchema(PUBLIC_BASE_URL)
  const docsSchema = loadDocsSchema()
  const instructions = loadInstructions()

  assert(JSON.stringify(localSchema) === JSON.stringify(publicSchema), 'Local and public OpenAPI schemas must match exactly')
  assert(JSON.stringify(localSchema) === JSON.stringify(docsSchema), 'docs/openapi.chatgpt.json must match the live schema')

  ensureSchemaRules(localSchema)
  ensureConsequentialFlags(localSchema)
  ensureNoStaleFragments()
  ensureInstructionAlignment(instructions)
  regenerateDocsSchema()

  const localSuite = await runActionSuite(LOCAL_BASE_URL, 'local')
  const publicSuite = await runActionSuite(PUBLIC_BASE_URL, 'public')

  console.log(JSON.stringify({
    ok: true,
    status: 'passed',
    local: {
      durationMs: localSuite.finishedAt - localSuite.startedAt,
      steps: localSuite.steps
    },
    public: {
      durationMs: publicSuite.finishedAt - publicSuite.startedAt,
      steps: publicSuite.steps
    }
  }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
