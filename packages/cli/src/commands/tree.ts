import { log, error } from '../utils/logger'
import { listWorkspaceTree } from '../agent/workspace'

export async function treeCommand(workspace: string, path: string = '', maxDepth: number = 3): Promise<void> {
  try {
    const tree = listWorkspaceTree(workspace, path, maxDepth, 0, 100)

    if (tree.length === 0) {
      log('No items found.')
      return
    }

    log(`Tree for workspace: ${workspace}${path ? `/${path}` : ''}`)
    log('')

    for (const node of tree) {
      const icon = node.type === 'directory' ? '📁' : '📄'
      log(`  ${icon} ${node.name}`)
      if (node.size) {
        log(`     Size: ${node.size} bytes`)
      }
      if (node.modifiedAt) {
        log(`     Modified: ${new Date(node.modifiedAt).toLocaleDateString()}`)
      }
    }

    log('')
    log(`Total items: ${tree.length}`)
  } catch (err) {
    error(`Failed to list tree: ${String(err)}`)
  }
}
