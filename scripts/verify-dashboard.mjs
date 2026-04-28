#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import os from 'os'

const BASE = process.env.LOCAL_DASHBOARD_BASE_URL || 'http://127.0.0.1:3054'
const AGENT = process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:3052'
const DASHBOARD_ONLY = process.env.LOCAL_DASHBOARD_ONLY === 'true'
const INDEX_STATE_PATH = path.join(os.homedir(), '.buildflow', 'index-state.json')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {})
    }
  })
  const contentType = response.headers.get('content-type') || ''
  const text = await response.text()
  if (!contentType.includes('application/json')) {
    throw new Error(`Expected JSON from ${url}, got ${response.status} ${contentType}\n${text.slice(0, 500)}`)
  }
  let json
  try {
    json = JSON.parse(text)
  } catch (err) {
    throw new Error(`Invalid JSON from ${url}: ${String(err)}\n${text.slice(0, 500)}`)
  }
  return { response, json }
}

function readJsonFile(filePath) {
  if (!fs.existsSync(filePath)) return null
  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function writeJsonFile(filePath, value) {
  const dir = path.dirname(filePath)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

async function main() {
  const openapi = await requestJson(`${BASE}/api/openapi`)
  assert(openapi.response.status === 200, 'dashboard openapi must be 200')
  assert(typeof openapi.json.openapi === 'string' && openapi.json.openapi.startsWith('3.'), 'openapi version missing')

  if (DASHBOARD_ONLY) {
    const dashboardResponse = await fetch(`${BASE}/dashboard`)
    const dashboardHtml = await dashboardResponse.text()
    assert(dashboardResponse.status === 200, 'dashboard page must be 200')
    assert(dashboardHtml.includes('<html') || dashboardHtml.includes('BuildFlow'), 'dashboard page markup missing')
    console.log('Dashboard-only verification passed.')
    return
  }

  const sourceList = await requestJson(`${BASE}/api/agent/sources`)
  assert(sourceList.response.status === 200, 'dashboard sources must be 200')
  assert(Array.isArray(sourceList.json.sources), 'sources array missing')
  assert(sourceList.json.sources.every(source => typeof source.id === 'string' && typeof source.label === 'string' && typeof source.enabled === 'boolean'), 'sources shape invalid')
  assert(sourceList.json.sources.every(source => typeof source.indexStatus === 'string'), 'sources must include indexStatus')

  const active = await requestJson(`${BASE}/api/agent/active-sources`)
  assert(active.response.status === 200, 'dashboard active-sources must be 200')
  assert(Array.isArray(active.json.sources), 'active sources array missing')
  assert(Array.isArray(active.json.activeSourceIds), 'activeSourceIds missing')
  assert(active.json.sources.every(source => typeof source.indexStatus === 'string'), 'active sources must include indexStatus')

  const writeMode = await requestJson(`${BASE}/api/agent/write-mode`)
  assert(writeMode.response.status === 200, 'dashboard write-mode must be 200')

  const nonCritical = sourceList.json.sources.find(source => source.id !== 'buildflow' && source.id !== 'mind' && source.id !== 'brain' && source.enabled) || sourceList.json.sources.find(source => source.enabled)
  assert(nonCritical, 'no enabled source found for toggle tests')

  const toggleOff = await requestJson(`${BASE}/api/agent/sources/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: nonCritical.id, enabled: false })
  })
  assert(toggleOff.response.status === 200, 'toggle disable must be 200')
  assert(toggleOff.json.sources.some(source => source.id === nonCritical.id && source.enabled === false), 'disable did not persist')
  assert(toggleOff.json.sources.some(source => source.id === nonCritical.id && source.indexStatus === 'disabled'), 'disabled source should report disabled index status')

  const reloadSources = await requestJson(`${BASE}/api/agent/sources`)
  assert(reloadSources.response.status === 200, 'reload sources after disable must be 200')

  const reloadActive = await requestJson(`${BASE}/api/agent/active-sources`)
  assert(reloadActive.response.status === 200, 'reload active sources after disable must be 200')

  const toggleOn = await requestJson(`${BASE}/api/agent/sources/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: nonCritical.id, enabled: true })
  })
  assert(toggleOn.response.status === 200, 'toggle enable must be 200')
  assert(toggleOn.json.sources.some(source => source.id === nonCritical.id && source.enabled === true), 'enable did not persist')
  assert(toggleOn.json.sources.some(source => source.id === nonCritical.id && source.indexStatus === 'pending'), 'enabled source should become pending until reindexed')

  const reindexDisabled = await requestJson(`${BASE}/api/agent/sources/reindex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: 'missing-source' })
  })
  assert(reindexDisabled.response.status === 404 || reindexDisabled.response.status === 400, 'missing source reindex must be 400/404')

  const reindex = await requestJson(`${BASE}/api/agent/sources/reindex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: nonCritical.id })
  })
  assert([200, 202].includes(reindex.response.status), 'reindex must be 200 or 202')
  assert(['indexing', 'ready'].includes(reindex.json.indexStatus), 'reindex should report indexing or ready')
  const duplicateReindex = await requestJson(`${BASE}/api/agent/sources/reindex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: nonCritical.id })
  })
  assert(duplicateReindex.response.status === 202, 'duplicate reindex must return 202 while indexing')
  let readySource = null
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const reloadAfterReindex = await requestJson(`${BASE}/api/agent/sources`)
    assert(reloadAfterReindex.response.status === 200, 'reload sources after reindex must be 200')
    readySource = reloadAfterReindex.json.sources.find(source => source.id === nonCritical.id)
    if (readySource?.indexStatus === 'ready') {
      break
    }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert(readySource && readySource.indexStatus === 'ready', 'reindexed source should become ready in source list')

  const searchCandidateSource = reindex.json.sourceId || nonCritical.id
  const fileList = await requestJson(`${BASE}/api/agent/sources`)
  const selectedSource = fileList.json.sources.find(source => source.id === searchCandidateSource)
  assert(selectedSource, 'reindexed source missing from source list')
  const sourceRoot = selectedSource.path
  function findReadableCandidate(root, depth = 2) {
    const entries = fs.readdirSync(root, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || ['node_modules', '.next', '.git', 'dist', 'build', 'coverage'].includes(entry.name)) {
        continue
      }
      const full = path.join(root, entry.name)
      if (entry.isFile()) return entry.name
      if (entry.isDirectory() && depth > 0) {
        const nested = findReadableCandidate(full, depth - 1)
        if (nested) return nested
      }
    }
    return null
  }
  const candidateQuery = findReadableCandidate(sourceRoot) || 'package'
  const search = await requestJson(`${AGENT}/api/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: candidateQuery, limit: 5, sourceId: searchCandidateSource })
  })
  assert(search.response.status === 200, 'search after reindex must be 200')
  assert(Array.isArray(search.json.results), 'search results must be array')
  assert(search.json.results.length > 0, 'search after reindex must return results')

  const staleStateBackup = readJsonFile(INDEX_STATE_PATH)
  try {
    const staleState = staleStateBackup && typeof staleStateBackup === 'object' ? { ...staleStateBackup } : {}
    staleState[nonCritical.id] = {
      ...(staleState[nonCritical.id] || {}),
      indexed: false,
      indexStatus: 'indexing',
      indexedFileCount: 0
    }
    writeJsonFile(INDEX_STATE_PATH, staleState)

    const reconciled = await requestJson(`${BASE}/api/agent/sources`)
    assert(reconciled.response.status === 200, 'source list after stale indexing state must be 200')
    const reconciledSource = reconciled.json.sources.find(source => source.id === nonCritical.id)
    assert(reconciledSource && reconciledSource.indexStatus === 'pending', 'stale indexing state should reconcile to pending')
  } finally {
    if (staleStateBackup) {
      writeJsonFile(INDEX_STATE_PATH, staleStateBackup)
    } else if (fs.existsSync(INDEX_STATE_PATH)) {
      fs.unlinkSync(INDEX_STATE_PATH)
    }
  }

  const activeSingle = sourceList.json.sources.find(source => source.enabled) || sourceList.json.sources[0]
  assert(activeSingle, 'no source available for active single test')

  const setActive = await requestJson(`${AGENT}/api/set-active-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'single', activeSourceIds: [activeSingle.id] })
  })
  assert(setActive.response.status === 200, 'set-active-sources single must be 200')

  const disableActive = await requestJson(`${BASE}/api/agent/sources/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: activeSingle.id, enabled: false })
  })
  assert(disableActive.response.status === 200, 'disable active source must be 200')
  assert(!disableActive.json.sources.some(source => source.id === activeSingle.id && source.active), 'disabled active source still active')
  assert(disableActive.json.sources.some(source => source.id === activeSingle.id && source.indexStatus === 'disabled'), 'disabled active source should report disabled index status')

  const activeAfterDisable = await requestJson(`${BASE}/api/agent/active-sources`)
  assert(activeAfterDisable.response.status === 200, 'active-sources after active disable must be 200')
  assert(Array.isArray(activeAfterDisable.json.activeSourceIds), 'activeSourceIds missing after active disable')

  const reenableActive = await requestJson(`${BASE}/api/agent/sources/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: activeSingle.id, enabled: true })
  })
  assert(reenableActive.response.status === 200, 'reenable active source must be 200')

  const invalidToggle = await requestJson(`${BASE}/api/agent/sources/toggle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceId: 'missing-source', enabled: false })
  })
  assert(invalidToggle.response.status === 400, 'unknown source toggle must be 400')
  assert(typeof invalidToggle.json.error === 'string', 'unknown source toggle error missing')

  const invalidActive = await requestJson(`${BASE}/api/agent/active-sources`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'single', activeSourceIds: ['missing-source'] })
  })
  assert(invalidActive.response.status === 400, 'invalid active source must be 400')
  assert(typeof invalidActive.json.error === 'string', 'invalid active source error missing')

  console.log('Dashboard verification passed.')
}

main().catch(err => {
  console.error(err instanceof Error ? err.stack || err.message : String(err))
  process.exit(1)
})
