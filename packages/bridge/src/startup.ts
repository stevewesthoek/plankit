import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { loadConfig, validateConfig, redactedConfig, type RuntimeConfig } from './config'
import { logToFile } from './logger'

export interface StartupResult {
  config: RuntimeConfig
  readyForTraffic: boolean
}

async function testDirectoryWritable(dir: string): Promise<void> {
  const testFile = path.join(dir, `.startup-test-${crypto.randomBytes(8).toString('hex')}`)

  try {
    // Create directory if missing
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o750 })
    }

    // Test write
    fs.writeFileSync(testFile, 'startup-test', { mode: 0o600 })

    // Test read
    const content = fs.readFileSync(testFile, 'utf-8')
    if (content !== 'startup-test') {
      throw new Error('test file content mismatch')
    }

    // Clean up
    fs.unlinkSync(testFile)
  } catch (err) {
    throw new Error(`Data directory not writable: ${dir} — ${err instanceof Error ? err.message : String(err)}`)
  }
}

export async function startup(): Promise<StartupResult> {
  console.log('[Startup] Loading configuration...')

  const config = loadConfig()

  // Validate config structure
  const configErrors = validateConfig(config)
  if (configErrors.length > 0) {
    console.error('[Startup] Configuration validation failed:')
    configErrors.forEach(err => console.error(`  • ${err}`))
    process.exit(1)
  }

  // Log config (redacted)
  console.log('[Startup] Configuration loaded:')
  const redacted = redactedConfig(config)
  Object.entries(redacted).forEach(([key, value]) => {
    console.log(`  • ${key}: ${JSON.stringify(value)}`)
  })

  // Test data directory writability
  console.log('[Startup] Testing data directory writability...')
  try {
    await testDirectoryWritable(config.dataDir)
    console.log(`[Startup] ✓ Data directory ready: ${config.dataDir}`)
  } catch (err) {
    console.error(`[Startup] ✗ Data directory check failed: ${err instanceof Error ? err.message : String(err)}`)

    logToFile({
      timestamp: new Date().toISOString(),
      tool: 'startup',
      status: 'error',
      reason: 'data_dir_not_writable'
    })

    process.exit(1)
  }

  // All checks passed
  console.log('[Startup] ✓ All startup checks passed')

  logToFile({
    timestamp: new Date().toISOString(),
    tool: 'startup',
    status: 'ready',
    reason: 'all_checks_passed'
  })

  return {
    config,
    readyForTraffic: true
  }
}
