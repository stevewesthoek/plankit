import path from 'path'
import os from 'os'

export function getDataDir(): string {
  const relayDataDir = process.env.RELAY_DATA_DIR
  return relayDataDir ? path.resolve(relayDataDir) : path.join(os.homedir(), '.brainbridge')
}

export function getDataPath(filename: string): string {
  return path.join(getDataDir(), filename)
}
