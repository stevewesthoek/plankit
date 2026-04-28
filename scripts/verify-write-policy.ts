import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getDefaultWritePolicy, validateWriteTarget } from '../packages/cli/src/agent/safe-access'

const policy = getDefaultWritePolicy()
assert.equal(policy.allowCreate, true)
assert.equal(policy.allowOverwrite, true)
assert.equal(policy.allowAppend, true)
assert.equal(policy.allowPatch, true)
assert.equal(policy.allowCreateParentDirectories, true)
assert(policy.allowedRoots.includes('*.md'))
assert(policy.blockedGlobs.includes('.env'))
assert(policy.protectedGlobs.includes('package.json'))
assert.equal(policy.maxWriteBytes, 1000000)

const root = path.resolve(process.cwd(), 'packages/cli')

const safe = validateWriteTarget({ requestedPath: '.buildflow/write-policy-test.md', changeType: 'create', sourceRoot: root })
assert.equal(safe.ok, true)
if (safe.ok) {
  assert.equal(safe.normalizedPath, '.buildflow/write-policy-test.md')
}

const blockedCases = [
  { requestedPath: '.env', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: '.env.local', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: '../outside.md', code: 'PATH_TRAVERSAL_BLOCKED' },
  { requestedPath: '/tmp/outside.md', code: 'ABSOLUTE_PATH_BLOCKED' },
  { requestedPath: 'secrets.pem', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: 'id_rsa', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: '.git/config', code: 'PROTECTED_PATH' },
  { requestedPath: 'node_modules/example.md', code: 'PROTECTED_PATH' }
]

for (const testCase of blockedCases) {
  const result = validateWriteTarget({ requestedPath: testCase.requestedPath, changeType: 'create', sourceRoot: root })
  assert.equal(result.ok, false, testCase.requestedPath)
  if (!result.ok) {
    assert.equal(result.error.code, testCase.code, testCase.requestedPath)
    assert.equal(result.requestedPath, testCase.requestedPath)
    assert.ok(result.normalizedPath.length > 0)
  }
}

const openapiSource = fs.readFileSync(path.join(process.cwd(), 'apps/web/src/app/api/openapi/route.ts'), 'utf8')
assert(openapiSource.includes('dryRun'))
assert(openapiSource.includes('preflight'))
assert(openapiSource.includes('writable'))
assert(openapiSource.includes('writePolicy'))

console.log('write policy contract checks passed')
