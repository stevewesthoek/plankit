import fs from 'fs'
import path from 'path'
import { saveConfig } from '../agent/config'
import { getConfigDir } from '../utils/paths'
import { log } from '../utils/logger'
import os from 'os'

export async function initCommand(): Promise<void> {
  const configDir = getConfigDir()

  if (fs.existsSync(configDir)) {
    log('Brain Bridge is already initialized.')
    return
  }

  const config: any = {
    userId: '',
    deviceId: '',
    deviceToken: '',
    apiBaseUrl: process.env.BRAIN_BRIDGE_API || 'http://localhost:3000',
    vaultPath: '',
    localPort: 3052,
    mode: 'read_create_append',
    allowedExtensions: ['.md', '.txt'],
    ignorePatterns: ['.git/**', '.obsidian/**', 'node_modules/**', '.brainbridgeignore']
  }

  fs.mkdirSync(configDir, { recursive: true })
  saveConfig(config)

  log('Brain Bridge initialized.')
  log(`Config directory: ${configDir}`)
  log('')
  log('Next steps:')
  log('1. Run: brainbridge login')
  log('2. Run: brainbridge connect <path-to-vault>')
  log('3. Run: brainbridge serve')
}
