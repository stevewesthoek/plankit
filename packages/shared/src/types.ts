export type SearchResult = {
  path: string
  title: string
  score: number
  snippet: string
  modifiedAt: string
}

export type FileContent = {
  path: string
  content: string
}

export type FileCreated = {
  path: string
  created: boolean
}

export type FileAppended = {
  path: string
  appended: boolean
}

export type IndexedDoc = {
  id: string
  path: string
  title: string
  extension: string
  modifiedAt: string
  size: number
  tags: string[]
  contentPreview: string
  content: string
}

export type ToolCallMessage = {
  id: string
  tool: string
  input: Record<string, unknown>
}

export type ToolResponseMessage = {
  id: string
  status: 'success' | 'error'
  result?: Record<string, unknown>
  error?: string
}

export type Device = {
  id: string
  userId: string
  name: string
  deviceToken: string
  status: 'online' | 'offline'
  lastSeenAt?: string
  createdAt: string
}

export type User = {
  id: string
  email: string
  apiKey: string
  createdAt: string
}

export type Workspace = {
  name: string
  root: string
  mode: 'read_only' | 'default'
  includePatterns?: string[]
  excludePatterns?: string[]
}

export type TreeNode = {
  name: string
  type: 'file' | 'directory'
  path: string
  size?: number
  modifiedAt?: string
}

export type GrepMatch = {
  file: string
  line: number
  content: string
  context?: string
}

export type ContextAssembly = {
  workspace: string
  summary: string
  tree: TreeNode[]
  docs: SearchResult[]
  entrypoints: string[]
  keyFiles: FileContent[]
}
