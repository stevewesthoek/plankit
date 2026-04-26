#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = process.env.PUBLIC_BASE_URL || process.env.LOCAL_DASHBOARD_BASE_URL || 'http://127.0.0.1:3054'
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

function cleanup(filePath, original) {
  fs.writeFileSync(filePath, original, 'utf8')
}

function resolveReturnedPath(returnedPath) {
  return path.isAbsolute(returnedPath) ? returnedPath : path.resolve(ROOT, returnedPath)
}

async function writeRootDesign(designPath) {
  const existed = fs.existsSync(designPath)
  const originalContent = existed ? fs.readFileSync(designPath, 'utf8') : ''
  const tempContent = 'BuildFlow verifier root DESIGN.md write contract smoke test.'
  const result = await requestJson(`${BASE_URL}/api/actions/apply-file-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changeType: 'overwrite',
      sourceId: 'buildflow',
      path: 'DESIGN.md',
      content: tempContent,
      reason: 'Verify root DESIGN.md overwrite is allowed'
    })
  })

  assert(result.response.status === 200, `DESIGN.md overwrite should return 200, got ${result.response.status}`)
  assert(result.json.verified === true, 'DESIGN.md overwrite must return verified:true')
  assert(typeof result.json.path === 'string' && result.json.path === 'DESIGN.md', 'DESIGN.md overwrite should target DESIGN.md')
  const diskPath = resolveReturnedPath(result.json.path)
  assert(diskPath === designPath, `DESIGN.md disk path mismatch: ${diskPath} !== ${designPath}`)
  assert(fs.existsSync(diskPath), `DESIGN.md missing on disk: ${diskPath}`)
  assert(fs.readFileSync(diskPath, 'utf8') === tempContent, 'DESIGN.md content mismatch after overwrite')

  const readBack = await requestJson(`${BASE_URL}/api/actions/read-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'read_paths',
      sourceId: 'buildflow',
      paths: ['DESIGN.md'],
      maxBytesPerFile: 10000
    })
  })

  assert(readBack.response.status === 200, `read-context should return 200 for DESIGN.md, got ${readBack.response.status}`)
  const files = Array.isArray(readBack.json.files) ? readBack.json.files : []
  const design = files.find(entry => entry.path === 'DESIGN.md')
  if (!design) {
    throw new Error(`DESIGN.md not found in read-back response. Available files: ${files.map(f => f.path).join(', ')}`)
  }
  if (typeof design.content !== 'string') {
    throw new Error(`DESIGN.md content is not a string, got ${typeof design.content}`)
  }
  if (design.content !== tempContent) {
    const expectedLines = tempContent.split('\n')
    const actualLines = design.content.split('\n')
    const mismatchLines = []
    for (let i = 0; i < Math.max(expectedLines.length, actualLines.length); i++) {
      if (expectedLines[i] !== actualLines[i]) {
        mismatchLines.push(`Line ${i}: expected ${JSON.stringify(expectedLines[i])}, got ${JSON.stringify(actualLines[i])}`)
      }
    }
    throw new Error(`DESIGN.md read-back mismatch:\n${mismatchLines.slice(0, 10).join('\n')}`)
  }

  if (existed) {
    cleanup(diskPath, originalContent)
    assert(fs.readFileSync(diskPath, 'utf8') === originalContent, 'DESIGN.md restore failed')
  } else {
    fs.unlinkSync(diskPath)
    assert(!fs.existsSync(diskPath), 'DESIGN.md cleanup failed')
  }
}

async function patchRootReadme(readmePath, originalContent) {
  const needle = 'For canonical documentation, roadmap context, and implementation guidance, see [`docs/product/README.md`](docs/product/README.md).'
  const patchedLine = 'Canonical docs live in [`docs/product/README.md`](docs/product/README.md) and [`docs/product/roadmap.md`](docs/product/roadmap.md).'

  const patchResult = await requestJson(`${BASE_URL}/api/actions/apply-file-change`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      changeType: 'patch',
      sourceId: 'buildflow',
      path: 'README.md',
      find: needle,
      replace: patchedLine,
      reason: 'Verify root README.md patch is allowed'
    })
  })

  assert(patchResult.response.status === 200, `README.md patch should return 200, got ${patchResult.response.status}`)
  assert(patchResult.json.verified === true, 'README.md patch must return verified:true')
  assert(typeof patchResult.json.path === 'string' && patchResult.json.path === 'README.md', 'README.md patch should target README.md')
  const diskPath = resolveReturnedPath(patchResult.json.path)
  assert(diskPath === readmePath, `README.md disk path mismatch: ${diskPath} !== ${readmePath}`)
  assert(fs.existsSync(diskPath), `README.md missing on disk: ${diskPath}`)
  const patchedContent = fs.readFileSync(diskPath, 'utf8')
  assert(patchedContent.includes('Canonical docs live in [`docs/product/README.md`](docs/product/README.md) and [`docs/product/roadmap.md`](docs/product/roadmap.md).'), 'README.md patch marker missing on disk')

  const readBack = await requestJson(`${BASE_URL}/api/actions/read-context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'read_paths',
      sourceId: 'buildflow',
      paths: ['README.md'],
      maxBytesPerFile: 10000
    })
  })

  assert(readBack.response.status === 200, `read-context should return 200 for README.md, got ${readBack.response.status}`)
  const files = Array.isArray(readBack.json.files) ? readBack.json.files : []
  const readme = files.find(entry => entry.path === 'README.md')
  assert(readme && typeof readme.content === 'string' && readme.content.includes('Canonical docs live in [`docs/product/README.md`](docs/product/README.md) and [`docs/product/roadmap.md`](docs/product/roadmap.md).'), 'README.md read-back mismatch after patch')

  cleanup(diskPath, originalContent)
  assert(fs.readFileSync(diskPath, 'utf8') === originalContent, 'README.md restore failed')
}

async function verifyPositiveWrites() {
  const designPath = path.resolve(ROOT, 'DESIGN.md')

  const readmePath = path.resolve(ROOT, 'README.md')
  assert(fs.existsSync(readmePath), 'Root README.md must exist for verification')
  const originalReadme = fs.readFileSync(readmePath, 'utf8')

  await writeRootDesign(designPath)
  await patchRootReadme(readmePath, originalReadme)

  console.log('Positive write checks passed.')
}

async function verifyBlockedPaths() {
  const cases = [
    { path: '.env', label: '.env' },
    { path: '.env.local', label: '.env.local' },
    { path: '../DESIGN.md', label: '../ traversal' },
    { path: '.git/config', label: '.git/config' },
    { path: 'node_modules/something.md', label: 'node_modules' },
    { path: 'RANDOM.md', label: 'arbitrary root markdown' },
    { path: 'random.txt', label: 'arbitrary root text' }
  ]

  for (const testCase of cases) {
    const result = await requestJson(`${BASE_URL}/api/actions/apply-file-change`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changeType: 'create',
        sourceId: 'buildflow',
        path: testCase.path,
        content: 'should not write',
        reason: `Blocked-path test: ${testCase.label}`
      })
    })

    assert(result.response.status >= 400 && result.response.status < 600, `${testCase.label} should fail with non-2xx, got ${result.response.status}`)
    assert(typeof result.json.error === 'string' && result.json.error.length > 0, `${testCase.label} should return JSON error`)
  }

  console.log('Blocked path checks passed.')
}

async function main() {
  await verifyPositiveWrites()
  await verifyBlockedPaths()
  console.log('Write contract verification passed.')
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
