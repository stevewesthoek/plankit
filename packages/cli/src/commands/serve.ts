import { loadConfig, getLocalPort } from '../agent/config'
import { startLocalServer } from '../agent/server'
import { BridgeClient } from '../agent/bridge-client'
import { log, error } from '../utils/logger'

export async function serveCommand(): Promise<void> {
  const config = loadConfig()

  if (!config) {
    error('Please run: brainbridge init')
    return
  }

  if (!config.vaultPath) {
    error('No vault connected. Run: brainbridge connect <path>')
    return
  }

  try {
    // Start local HTTP server
    log('Starting local agent server...')
    const port = getLocalPort()
    startLocalServer(port)

    // Connect to SaaS bridge if configured
    if (config.deviceToken) {
      log('Connecting to SaaS bridge...')
      const bridgeClient = new BridgeClient(config.apiBaseUrl, config.deviceToken)

      try {
        await bridgeClient.connect()
      } catch (err) {
        log(`Note: Could not connect to SaaS bridge (${String(err)})`)
        log('Local agent will still work for local testing.')
      }
    } else {
      log('No device token configured. Local agent running in standalone mode.')
      log('To connect to ChatGPT, run: brainbridge login <api-key>')
    }

    log('')
    log('Brain Bridge agent is running!')
    log(`Local server: http://127.0.0.1:${port}`)
    log('Press Ctrl+C to stop.')

    // Keep process alive
    await new Promise(() => {})
  } catch (err) {
    error(`Failed to start server: ${String(err)}`)
  }
}
