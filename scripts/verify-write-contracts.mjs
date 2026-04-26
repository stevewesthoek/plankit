#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.LOCAL_DASHBOARD_BASE_URL || 'http://127.0.0.1:3054'
const TOKEN = process.env.BUILDFLOW_ACTION_TOKEN || ''
const ROOT = process.cwd()

if (!TOKEN) {
  console.error('BUILDFLOW_ACTION_TOKEN is required')
  process.exit(1)
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {})
    }
  })
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()
  assert(contentType.includes('application/json'), `Expected JSON from ${url}, got ${response.status} ${contentType}\n${text.slice(0, 500)}`)
  const json = JSON.parse(text)
  return { response, json, text }
}

function cleanup(filePath) {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

function resolveReturnedPath(returnedPath) {
  return path.isAbsolute(returnedPath) ? returnedPath : path.resolve(ROOT, returnedPath)
}

async function verifyWriteArtifact() {
  const title = `Internal write contract smoke ${Date.now()}`
  const content = 'Internal write contract smoke test.'
  const folder = 'docs/buildflow/notes'

  const result = await requestJson(`${BASE_URL}/api/actions/write-artifact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceId: 'buildflow',
      artifactType: 'general_doc',
      title,
      content,
      folder
    })
  })

  assert(result.response.status === 200, `write-artifact should return 200, got ${result.response.status}`)
  assert(result.json.verified === true, 'write-artifact must return verified:true')
  assert(typeof result.json.path === 'string' && result.json.path.length > 0, 'write-artifact path missing')

  const diskPath = resolveReturnedPath(result.json.path)
  assert(fs.existsSync(diskPath), `written artifact missing on disk: ${diskPath}`)
  assert(fs.readFileSync(diskPath, 'utf8') === content, 'written artifact content mismatch')

  return { apiPath: result.json.path, diskPath }
}

async function verifyApplyFileChange() {
  const pathOnDisk = `docs/buildflow/tasks/internal-write-smoke-${Date.now()}.md`
  const content = 'Internal apply-file-change smoke test.'

  const result = await requestJson(`${BASE_URL}/api/actions/apply-file-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changeType: 'create',
      sourceId: 'buildflow',
      path: pathOnDisk,
      content,
      reason: 'Internal write contract smoke test'
    })
  })

  assert(result.response.status === 200, `apply-file-change should return 200, got ${result.response.status}`)
  assert(result.json.verified === true, 'apply-file-change must return verified:true')
  assert(typeof result.json.path === 'string' && result.json.path.length > 0, 'apply-file-change path missing')

  const diskPath = resolveReturnedPath(result.json.path)
  assert(fs.existsSync(diskPath), `applied file missing on disk: ${diskPath}`)
  assert(fs.readFileSync(diskPath, 'utf8') === content, 'applied file content mismatch')

  const readBack = await requestJson(`${BASE_URL}/api/actions/read-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'read_paths',
      sourceId: 'buildflow',
      paths: [result.json.path],
      maxBytesPerFile: 10000
    })
  })

  assert(readBack.response.status === 200, `read-context should return 200, got ${readBack.response.status}`)
  const files = Array.isArray(readBack.json.files) ? readBack.json.files : []
  const applied = files.find(entry => entry.path === result.json.path)
  assert(applied && typeof applied.content === 'string' && applied.content === content, 'apply-file-change read-back mismatch')

  return { apiPath: result.json.path, diskPath }
}

async function main() {
  const artifact = await verifyWriteArtifact()
  const applied = await verifyApplyFileChange()

  cleanup(artifact.diskPath)
  cleanup(applied.diskPath)
  assert(!fs.existsSync(artifact.diskPath), 'artifact cleanup failed')
  assert(!fs.existsSync(applied.diskPath), 'apply-file cleanup failed')

  console.log('Write contract verification passed.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
