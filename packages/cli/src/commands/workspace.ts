import { loadConfig } from '../agent/config'
import { log, error } from '../utils/logger'
import { getWorkspaces } from '../agent/config'

export async function workspaceListCommand(): Promise<void> {
  try {
    const workspaces = getWorkspaces()

    if (workspaces.length === 0) {
      log('No workspaces configured.')
      return
    }

    log('Registered Workspaces:')
    log('')

    for (const ws of workspaces) {
      log(`  ${ws.name}`)
      log(`    Root: ${ws.root}`)
      log(`    Mode: ${ws.mode}`)
      if (ws.excludePatterns?.length) {
        log(`    Exclude: ${ws.excludePatterns.join(', ')}`)
      }
      log('')
    }
  } catch (err) {
    error(`Failed to list workspaces: ${String(err)}`)
  }
}
