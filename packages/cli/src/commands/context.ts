import { log, error } from '../utils/logger'
import { listWorkspaceTree, getWorkspaceInfo } from '../agent/workspace'

export async function contextCommand(workspace: string, query: string = '', maxDepth: number = 2): Promise<void> {
  try {
    const ws = getWorkspaceInfo(workspace)
    const tree = listWorkspaceTree(workspace, '', maxDepth, 0, 50)

    log(`Context Assembly for workspace: ${ws.name}`)
    log('')
    log(`Workspace: ${ws.name}`)
    log(`Root: ${ws.root}`)
    log(`Mode: ${ws.mode}`)
    log('')

    log(`Tree Summary (depth ${maxDepth}):`)
    log(`  Total items: ${tree.length}`)

    const files = tree.filter(n => n.type === 'file')
    const directories = tree.filter(n => n.type === 'directory')
    log(`  Files: ${files.length}`)
    log(`  Directories: ${directories.length}`)
    log('')

    const entrypoints = ['README.md', 'index.md', 'MANIFEST.md'].filter(
      name => tree.some(n => n.name === name && n.type === 'file')
    )

    if (entrypoints.length > 0) {
      log(`Entry points: ${entrypoints.join(', ')}`)
      log('')
    }

    if (query) {
      log(`Query: ${query}`)
      log('(Use /api/context endpoint to search with query)')
      log('')
    }

    log('Use /api/context endpoint for full context assembly with search.')
  } catch (err) {
    error(`Failed to assemble context: ${String(err)}`)
  }
}
