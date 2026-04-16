import fs from 'fs'
import path from 'path'
import { getConfigPath, expandTilde } from '../utils/paths'

export interface AgentConfig {
  userId: string
  deviceId: string
  deviceToken: string
  apiBaseUrl: string
  vaultPath: string
  localPort?: number
  mode: 'read_create_append'
  allowedExtensions: string[]
  ignorePatterns: string[]
}

export function loadConfig(): AgentConfig | null {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    return null
  }
}

export function saveConfig(config: AgentConfig): void {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export function getVaultPath(): string {
  const config = loadConfig()
  if (!config?.vaultPath) {
    throw new Error('No vault path configured. Run: brainbridge connect <folder>')
  }

  return expandTilde(config.vaultPath)
}

export function getLocalPort(): number {
  const config = loadConfig()
  return config?.localPort ?? 3052
}
