import Fastify from 'fastify'
import fs from 'fs'
import { Indexer } from './indexer'
import { VaultSearcher } from './search'
import { readFile, createFile, appendFile, listFolder } from './vault'
import { logToFile } from '../utils/logger'
import { createExportPlan } from './export'
import { loadConfig, getWorkspaces, getEnabledSources } from './config'
import { listWorkspaceTree, grepWorkspace, getWorkspaceInfo, resolveWorkspacePath, validateWorkspacePath } from './workspace'
import type { Workspace } from '@brainbridge/shared'

export async function startLocalServer(port: number = 3052): Promise<void> {
  const fastify = Fastify({ logger: true })

  const indexer = new Indexer()

  // Build index if empty
  if (indexer.getDocs().length === 0) {
    console.log('[Indexer] Building index on startup...')
    await indexer.buildIndex()
    console.log(`[Indexer] Built index with ${indexer.getDocs().length} files`)
  }

  let searcher = new VaultSearcher(indexer.getDocs())
  const config = loadConfig()

  // Health endpoint
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      port,
      vaultPath: config?.vaultPath || 'not configured',
      indexedFiles: indexer.getDocs().length,
      version: '0.1.0'
    }
  })

  // Status endpoint
  fastify.post<{ Body: Record<string, unknown> }>('/api/status', async (request, reply) => {
    return {
      online: true,
      deviceName: 'Local Agent',
      vaultConnected: true
    }
  })

  // Search endpoint
  fastify.post<{ Body: { query: string; limit?: number } }>('/api/search', async (request, reply) => {
    const { query, limit = 10 } = request.body
    const results = searcher.search(query, limit)

    logToFile({
      timestamp: new Date().toISOString(),
      tool: 'search',
      status: 'success'
    })

    return { results }
  })

  // Read endpoint (multi-source aware with guardrails)
  fastify.post<{ Body: { path: string; workspace?: string; sourceId?: string } }>('/api/read', async (request, reply) => {
    try {
      const { path, workspace, sourceId } = request.body

      if (workspace) {
        // Workspace-aware read with guardrails
        const ws = getWorkspaceInfo(workspace)
        const validation = validateWorkspacePath(ws, path)
        if (!validation.valid) {
          return reply.code(400).send({ error: validation.error })
        }

        const fullPath = resolveWorkspacePath(ws, path)

        // Check file existence and size
        if (!fs.existsSync(fullPath)) {
          return reply.code(404).send({ error: 'File not found' })
        }

        const stat = fs.statSync(fullPath)
        if (!stat.isFile()) {
          return reply.code(400).send({ error: 'Not a file' })
        }

        // Enforce safe file size limit (1MB)
        const maxSize = 1024 * 1024
        if (stat.size > maxSize) {
          return reply.code(400).send({ error: `File too large (${stat.size} bytes, max ${maxSize})` })
        }

        // Enforce safe file extensions for workspace reads
        const safeExtensions = ['.md', '.txt', '.json', '.yaml', '.yml', '.ts', '.tsx', '.js', '.jsx', '.sh', '.env.example', '.csv']
        const fileExt = path.toLowerCase().slice(path.lastIndexOf('.'))
        if (!safeExtensions.includes(fileExt)) {
          return reply.code(400).send({ error: `Unsupported file type: ${fileExt}` })
        }

        const content = fs.readFileSync(fullPath, 'utf-8')

        logToFile({
          timestamp: new Date().toISOString(),
          tool: 'read_file',
          path,
          workspace,
          status: 'success',
          size: stat.size
        })

        return { path, content }
      } else {
        // Multi-source read: use sourceId hint if provided
        const result = await readFile(path, sourceId)
        return result
      }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // Create endpoint
  fastify.post<{ Body: { path?: string; content: string } }>('/api/create', async (request, reply) => {
    try {
      let { path, content } = request.body

      // Generate path if not provided
      if (!path) {
        const timestamp = new Date().toISOString().split('T')[0]
        const slug = content.slice(0, 50).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
        path = `BrainBridge/Inbox/${timestamp}-${slug}.md`
      }

      // Add frontmatter
      const frontmatter = `---\ncreated: ${new Date().toISOString()}\nsource: brainbridge\ntype: plan\n---\n\n`
      const fullContent = frontmatter + content

      const result = await createFile(path, fullContent)
      await indexer.buildIndex()
      searcher = new VaultSearcher(indexer.getDocs())

      return result
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // Append endpoint
  fastify.post<{ Body: { path: string; content: string } }>('/api/append', async (request, reply) => {
    try {
      const { path, content } = request.body
      const result = await appendFile(path, content)
      await indexer.buildIndex()
      searcher = new VaultSearcher(indexer.getDocs())

      return result
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // Export plan endpoint
  fastify.post<{ Body: Record<string, unknown> }>('/api/export-plan', async (request, reply) => {
    try {
      const result = await createExportPlan(request.body)
      await indexer.buildIndex()
      searcher = new VaultSearcher(indexer.getDocs())

      return result
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // List folder endpoint
  fastify.get<{ Querystring: { path?: string } }>('/api/list', async (request, reply) => {
    try {
      const { path } = request.query
      const result = await listFolder(path)
      return { items: result }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // Knowledge sources listing endpoint (multi-source aware)
  fastify.get<{ Params: Record<string, unknown> }>('/api/sources', async (request, reply) => {
    try {
      const sources = getEnabledSources()
      return { sources }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // Workspaces listing endpoint
  fastify.get<{ Params: Record<string, unknown> }>('/api/workspaces', async (request, reply) => {
    try {
      const workspaces = getWorkspaces()
      const details = workspaces.map(ws => ({
        name: ws.name,
        root: ws.root,
        mode: ws.mode
      }))
      return { workspaces: details }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // Tree inspection endpoint
  fastify.post<{ Body: { workspace: string; path?: string; maxDepth?: number; maxEntries?: number } }>(
    '/api/tree',
    async (request, reply) => {
      try {
        const { workspace, path = '', maxDepth = 3, maxEntries = 100 } = request.body
        const tree = listWorkspaceTree(workspace, path, maxDepth, 0, maxEntries)

        logToFile({
          timestamp: new Date().toISOString(),
          tool: 'tree',
          workspace,
          path,
          status: 'success'
        })

        return { tree, count: tree.length }
      } catch (err) {
        return reply.code(400).send({ error: String(err) })
      }
    }
  )

  // Grep/search endpoint
  fastify.post<{
    Body: {
      workspace: string
      pattern: string
      maxResults?: number
      maxLineLength?: number
    }
  }>('/api/grep', async (request, reply) => {
    try {
      const { workspace, pattern, maxResults = 100, maxLineLength = 500 } = request.body
      const results = grepWorkspace(workspace, pattern, { maxResults, maxLineLength })

      logToFile({
        timestamp: new Date().toISOString(),
        tool: 'grep',
        workspace,
        pattern,
        status: 'success',
        matches: results.length
      })

      return { results, count: results.length }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  // Context assembly endpoint (workspace-native)
  fastify.post<{
    Body: {
      workspace: string
      query?: string
      maxDepth?: number
      maxResults?: number
    }
  }>('/api/context', async (request, reply) => {
    try {
      const { workspace, query = '', maxDepth = 2, maxResults = 20 } = request.body
      const ws = getWorkspaceInfo(workspace)
      const tree = listWorkspaceTree(workspace, '', maxDepth, 0, 50)

      // Search within workspace only (not global vault)
      let matches = []
      if (query) {
        matches = grepWorkspace(workspace, query, { maxResults })
      }

      const summary = `Workspace: ${ws.name}\nRoot: ${ws.root}\nMode: ${ws.mode}\nTree items: ${tree.length}`

      // Find entrypoints: check all tree items for common names
      const entrypointNames = ['README.md', 'index.md', 'MANIFEST.md', 'package.json', 'tsconfig.json']
      const entrypoints = entrypointNames.filter(
        name => tree.some(n => n.name === name && n.type === 'file')
      )

      // Extract key files: get content of identified entrypoints
      const keyFiles = []
      for (const ep of entrypoints.slice(0, 3)) {
        try {
          const epPath = tree.find(n => n.name === ep && n.type === 'file')?.path
          if (epPath) {
            const fullPath = resolveWorkspacePath(ws, epPath)
            const stat = fs.statSync(fullPath)
            // Enforce safe read limits
            if (stat.size > 50000) {
              continue // Skip files > 50KB
            }
            const content = fs.readFileSync(fullPath, 'utf-8')
            keyFiles.push({
              path: epPath,
              content: content.slice(0, 2000)
            })
          }
        } catch (err) {
          // Skip if can't read
        }
      }

      logToFile({
        timestamp: new Date().toISOString(),
        tool: 'context',
        workspace,
        query,
        status: 'success',
        matchCount: matches.length
      })

      return {
        workspace,
        summary,
        tree,
        matches,
        entrypoints,
        keyFiles
      }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  await fastify.listen({ port, host: '127.0.0.1' })
  console.log(`Local agent running on http://127.0.0.1:${port}`)
}
