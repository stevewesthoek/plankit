import fs from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'
import type { TokenRecord } from './types'

function generateTokenId(): string {
  return `tok_${crypto.randomBytes(12).toString('hex')}`
}

const TOKENS_FILE = path.join(os.homedir(), '.brainbridge', 'relay-tokens.json')

let tokenRegistry: TokenRecord[] = []

function ensureDir(): void {
  const dir = path.dirname(TOKENS_FILE)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

function hashToken(plaintext: string): string {
  return crypto.createHash('sha256').update(plaintext).digest('hex')
}

function loadFromDisk(): TokenRecord[] {
  ensureDir()
  if (!fs.existsSync(TOKENS_FILE)) {
    return []
  }
  try {
    const content = fs.readFileSync(TOKENS_FILE, 'utf-8')
    const data = JSON.parse(content)
    return Array.isArray(data) ? data : []
  } catch (err) {
    console.error(`Failed to load tokens: ${err}`)
    return []
  }
}

function saveToDisk(): void {
  ensureDir()
  try {
    fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokenRegistry, null, 2))
  } catch (err) {
    console.error(`Failed to save tokens: ${err}`)
  }
}

export function initDefaultTokens(): void {
  if (tokenRegistry.length > 0) {
    return
  }

  const defaults: TokenRecord[] = [
    {
      tokenId: 'tok_dev_1',
      tokenHash: hashToken('dev-token-1'),
      description: 'Development token 1 for testing',
      deviceId: 'device-dev-1',
      createdAt: new Date().toISOString(),
      active: true,
      version: 1
    },
    {
      tokenId: 'tok_dev_2',
      tokenHash: hashToken('dev-token-2'),
      description: 'Development token 2 for testing',
      deviceId: 'device-dev-2',
      createdAt: new Date().toISOString(),
      active: true,
      version: 1
    },
    {
      tokenId: 'tok_local_device',
      tokenHash: hashToken('local-device'),
      description: 'Local device token for agent',
      deviceId: 'local-device',
      createdAt: new Date().toISOString(),
      active: true,
      version: 1
    }
  ]

  tokenRegistry = defaults
  saveToDisk()
}

export function loadTokens(): TokenRecord[] {
  tokenRegistry = loadFromDisk()
  if (tokenRegistry.length === 0) {
    initDefaultTokens()
  }
  return tokenRegistry
}

export function validateToken(plaintext: string): string | null {
  const hash = hashToken(plaintext)
  const token = tokenRegistry.find(t => t.tokenHash === hash && t.active)
  return token ? token.deviceId : null
}

export function saveToken(token: TokenRecord): void {
  const existing = tokenRegistry.findIndex(t => t.tokenId === token.tokenId)
  if (existing >= 0) {
    tokenRegistry[existing] = token
  } else {
    tokenRegistry.push(token)
  }
  saveToDisk()
}

export function listTokens(): TokenRecord[] {
  return tokenRegistry.map(t => ({
    ...t,
    // Don't expose hash in list
    tokenHash: `${t.tokenHash.slice(0, 8)}...`
  }))
}

export function isTokenActive(tokenHash: string): boolean {
  const token = tokenRegistry.find(t => t.tokenHash === tokenHash)
  return token ? token.active : false
}

export function registerNewToken(plaintext: string, deviceId: string): TokenRecord {
  const hash = hashToken(plaintext)
  const token: TokenRecord = {
    tokenId: generateTokenId(),
    tokenHash: hash,
    description: `Device token for ${deviceId}`,
    deviceId,
    createdAt: new Date().toISOString(),
    active: true,
    version: 1
  }
  saveToken(token)
  return token
}
