import type { KnowledgeSource } from '@buildflow/shared'

export function getAgentHealthLabel(agentConnected: boolean): string {
  return agentConnected ? 'Agent connected' : 'Agent not connected'
}

export function getAgentHealthClassName(agentConnected: boolean): string {
  return agentConnected ? 'bg-green-500' : 'bg-red-500'
}

export function getSourceEnabledClassName(enabled: boolean): string {
  return enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
}

export function getSourceIndexStatusClassName(indexStatus?: string): string {
  switch (indexStatus) {
    case 'ready':
      return 'bg-emerald-100 text-emerald-800'
    case 'indexing':
      return 'bg-blue-100 text-blue-800'
    case 'pending':
      return 'bg-amber-100 text-amber-800'
    case 'failed':
      return 'bg-red-100 text-red-800'
    case 'disabled':
      return 'bg-gray-100 text-gray-600'
    default:
      return 'bg-gray-100 text-gray-600'
  }
}

export function getSourceIndexStatusLabel(source: KnowledgeSource): string {
  const status = source.indexStatus || 'unknown'
  const fileCount = typeof source.indexedFileCount === 'number' ? ` · ${source.indexedFileCount} files` : ''
  return `${status}${fileCount}`
}

export function getSourceActiveClassName(isActive: boolean): string {
  return isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
}
