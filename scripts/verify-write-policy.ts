import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { getDefaultWritePolicy, validateWriteTarget } from '../packages/cli/src/agent/safe-access'
import { validatePath } from '../packages/cli/src/agent/permissions'

const policy = getDefaultWritePolicy()
assert.equal(policy.allowCreate, true)
assert.equal(policy.allowOverwrite, true)
assert.equal(policy.allowAppend, true)
assert.equal(policy.allowPatch, true)
assert.equal(policy.allowCreateParentDirectories, true)
assert.equal(policy.allowDelete, true)
assert.equal(policy.allowDeleteDirectory, true)
assert.equal(policy.allowMove, true)
assert.equal(policy.allowRename, true)
assert.equal(policy.allowMkdir, true)
assert.equal(policy.allowRmdir, true)
assert.equal(policy.recursiveDeleteRequiresConfirmation, true)
assert.equal(policy.maxRecursiveDeleteFilesWithoutConfirmation, 0)
assert(policy.allowedRoots.includes('src/**'))
assert(policy.allowedRoots.includes('app/**'))
assert(policy.allowedRoots.includes('*.md'))
assert(policy.blockedGlobs.includes('.env'))
assert(policy.confirmationRequiredGlobs.includes('LICENSE'))
assert(policy.protectedGlobs.includes('package.json'))
assert(policy.blockedWriteGlobs?.includes('generated/**'))
assert(policy.generatedDeleteAllowedGlobs?.includes('tsconfig.tsbuildinfo'))
assert(policy.blockedContentPatterns.includes('BEGIN OPENSSH PRIVATE KEY'))
assert.equal(policy.maxWriteBytes, 1000000)
assert.equal(policy.maxCreateBytes, 200000)
assert.equal(policy.maxOverwriteBytes, 300000)
assert.equal(policy.maxPatchTargetBytes, 1000000)

const root = path.resolve(process.cwd(), 'packages/cli')

const safe = validateWriteTarget({ requestedPath: '.buildflow/write-policy-test.md', changeType: 'create', sourceRoot: root })
assert.equal(safe.ok, true)
if (safe.ok) {
  assert.equal(safe.normalizedPath, '.buildflow/write-policy-test.md')
}

const appSafe = validateWriteTarget({ requestedPath: 'src/lib/example.ts', changeType: 'create', sourceRoot: root, content: 'export const example = 1\n' })
assert.equal(appSafe.ok, true)
const envTemplate = validateWriteTarget({ requestedPath: '.env.example', changeType: 'create', sourceRoot: root, content: 'API_KEY=<your-api-key>\n' })
assert.equal(envTemplate.ok, true)

assert.equal(validatePath('.env.example').valid, true)
assert.equal(validatePath('.gitignore').valid, true)
assert.equal(validatePath('.github/workflows/example.yml').valid, true)
assert.equal(validatePath('.env').valid, false)
assert.equal(validatePath('.git/config').valid, false)
assert.equal(validatePath('.env.local').valid, false)

const generatedDelete = validateWriteTarget({ requestedPath: 'tsconfig.tsbuildinfo', changeType: 'delete_file', sourceRoot: root })
assert.equal(generatedDelete.ok, true)

const blockedCases = [
  { requestedPath: '.env', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: '.env.local', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: '../outside.md', code: 'PATH_TRAVERSAL_BLOCKED' },
  { requestedPath: '/tmp/outside.md', code: 'ABSOLUTE_PATH_BLOCKED' },
  { requestedPath: 'secrets.pem', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: 'id_rsa', code: 'SECRET_PATH_BLOCKED' },
  { requestedPath: '.git/config', code: 'PROTECTED_PATH' },
  { requestedPath: 'node_modules/example.md', code: 'PROTECTED_PATH' },
  { requestedPath: 'package-lock.json', code: 'REQUIRES_EXPLICIT_CONFIRMATION' },
  { requestedPath: '.github/workflows/build.yml', code: 'REQUIRES_EXPLICIT_CONFIRMATION' },
  { requestedPath: 'LICENSE', code: 'REQUIRES_EXPLICIT_CONFIRMATION' },
  { requestedPath: 'prisma/migrations/20260428_test/migration.sql', code: 'REQUIRES_EXPLICIT_CONFIRMATION' },
  { requestedPath: 'package.json', code: 'REQUIRES_EXPLICIT_CONFIRMATION', content: JSON.stringify({ name: 'demo', version: '1.0.0', dependencies: { lodash: '^4.17.21' } }, null, 2) },
  { requestedPath: 'dist/output.js', code: 'GENERATED_WRITE_BLOCKED' },
  { requestedPath: 'build/output.js', code: 'GENERATED_WRITE_BLOCKED' }
]

for (const testCase of blockedCases) {
  const result = validateWriteTarget({ requestedPath: testCase.requestedPath, changeType: 'create', sourceRoot: root, content: testCase.content })
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
assert(openapiSource.includes('writeProfile'))

console.log('write policy contract checks passed')
