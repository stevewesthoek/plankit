#!/usr/bin/env node

const BASE = process.env.LOCAL_DASHBOARD_BASE_URL || 'http://127.0.0.1:3054'
const AGENT = process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:3052'

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

async function main() {
  const sourceList = await requestJson(`${BASE}/api/agent/sources`)
  assert(sourceList.response.status === 200, 'dashboard sources must be 200')
  assert(Array.isArray(sourceList.json.sources), 'sources array missing')
  assert(sourceList.json.sources.every(source => typeof source.id === 'string' && typeof source.label === 'string' && typeof source.enabled === 'boolean'), 'sources shape invalid')

  const active = await requestJson(`${BASE}/api/agent/active-sources`)
  assert(active.response.status === 200, 'dashboard active-sources must be 200')
  assert(Array.isArray(active.json.sources), 'active sources array missing')
  assert(Array.isArray(active.json.activeSourceIds), 'activeSourceIds missing')

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
