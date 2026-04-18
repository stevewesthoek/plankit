import { log, error } from '../utils/logger'
import { grepWorkspace } from '../agent/workspace'

export async function grepCommand(workspace: string, pattern: string, maxResults: number = 50): Promise<void> {
  try {
    const results = grepWorkspace(workspace, pattern, { maxResults })

    if (results.length === 0) {
      log(`No matches found for pattern: ${pattern}`)
      return
    }

    log(`Grep results for workspace: ${workspace}`)
    log(`Pattern: ${pattern}`)
    log('')

    for (const result of results) {
      log(`${result.file}:${result.line}`)
      log(`  ${result.content}`)
      log('')
    }

    log(`Total matches: ${results.length}`)
  } catch (err) {
    error(`Failed to grep: ${String(err)}`)
  }
}
