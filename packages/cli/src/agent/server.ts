import Fastify from 'fastify'
import fs from 'fs'
import path from 'path'
import { Indexer } from './indexer'
import { VaultSearcher } from './search'
import { readFile, createFile, appendFile, createInboxNote, listFolder } from './vault'
import { logToFile } from '../utils/logger'
import { createExportPlan } from './export'
import { loadConfig, getWorkspaces, getSources, getSourcesSafe, addSource, removeSource, setSourceEnabled, getActiveSourceContext, setActiveSourceContext, getWriteMode, setWriteMode } from './config'
import { listWorkspaceTree, grepWorkspace, getWorkspaceInfo, resolveWorkspacePath, validateWorkspacePath } from './workspace'
import { getResolvedActiveSources, isAllowedArtifactRoot, isAllowedSafeWriteRoot, isBlockedWritePath, redactSecrets, resolveTargetSourceId, resolveWithinSource, shouldIncludeEntry, truncateContent } from './safe-access'
import type { Workspace } from '@buildflow/shared'

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

  const assertWriteMode = (isArtifact = false, relPath?: string): void => {
    const mode = getWriteMode()
    if (mode === 'readOnly') {
      throw new Error('Write mode is readOnly')
    }
    if (mode === 'artifactsOnly') {
      if (!relPath || !isAllowedArtifactRoot(relPath)) {
        throw new Error('Write mode blocks non-artifact paths')
      }
      if (!relPath.startsWith('docs/buildflow') && !relPath.startsWith('.buildflow')) {
        throw new Error('Write mode blocks non-artifact paths')
      }
    }
    if (mode === 'safeWrites') {
      if (!relPath || !isAllowedSafeWriteRoot(relPath)) {
        throw new Error('Write path blocked')
      }
    }
  }

  const rebuildIndexAndSearcher = async (): Promise<void> => {
    await indexer.buildIndex()
    searcher = new VaultSearcher(indexer.getDocs())
  }

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

  fastify.get('/api/status', async (request, reply) => {
    try {
      const sources = getSourcesSafe()
      const sourceCount = sources.length

      return reply.header('Cache-Control', 'no-store').send({
        connected: true,
        sourceCount,
        sourcesAvailable: sourceCount > 0
      })
    } catch (err) {
      return reply.code(500).header('Cache-Control', 'no-store').send({
        error: String(err)
      })
    }
  })

  // Search endpoint
  fastify.post<{ Body: { query: string; limit?: number; sourceId?: string; sourceIds?: string[] } }>('/api/search', async (request, reply) => {
    const { query, limit = 10, sourceId, sourceIds } = request.body
    const resolvedSourceIds = sourceIds && sourceIds.length > 0 ? sourceIds : sourceId ? [sourceId] : getActiveSourceContext().activeSourceIds
    const results = searcher.search(query, limit, resolvedSourceIds)

    logToFile({
      timestamp: new Date().toISOString(),
      tool: 'search',
      status: 'success'
    })

    return { results }
  })

  // Read endpoint (multi-source aware with guardrails)
  fastify.post<{ Body: { path: string; workspace?: string; sourceId?: string; sourceIds?: string[]; maxBytes?: number } }>('/api/read', async (request, reply) => {
    try {
      const { path: relPath, workspace, sourceId, sourceIds, maxBytes = 60000 } = request.body

      if (workspace) {
        // Workspace-aware read with guardrails
        const ws = getWorkspaceInfo(workspace)
        const validation = validateWorkspacePath(ws, relPath)
        if (!validation.valid) {
          return reply.code(400).send({ error: validation.error })
        }

        const fullPath = resolveWorkspacePath(ws, relPath)

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

        const content = fs.readFileSync(fullPath, 'utf-8')

        logToFile({
          timestamp: new Date().toISOString(),
          tool: 'read_file',
          path: relPath,
          workspace,
          status: 'success',
          size: stat.size
        })

        return { path: relPath, content }
      } else {
        const resolvedSourceIds = sourceIds && sourceIds.length > 0 ? sourceIds : sourceId ? [sourceId] : getActiveSourceContext().activeSourceIds
        const targets = getResolvedActiveSources(resolvedSourceIds.length > 0 ? resolvedSourceIds : undefined)
        const matches: Array<{ sourceId: string; content: string; size: number; modifiedAt: string }> = []
        for (const sid of targets.map(source => source.id)) {
          try {
            const result = await readFile(relPath, sid)
            const fullMatch = targets.find(source => source.id === sid)
            if (!fullMatch) continue
            const fullPath = path.join(fullMatch.path, path.normalize(relPath))
            const stat = fs.statSync(fullPath)
            matches.push({ sourceId: sid, content: result.content, size: stat.size, modifiedAt: stat.mtime.toISOString() })
          } catch {}
        }
        if (matches.length === 0) {
        return reply.code(404).send({ error: 'File not found in active sources' })
        }
        if (!sourceId && matches.length > 1) {
          return reply.code(400).send({ error: `Ambiguous path across active sources: ${matches.map(m => m.sourceId).join(', ')}` })
        }
        const chosen = matches[0]
        const content = redactSecrets(chosen.content)
        const truncated = truncateContent(content, maxBytes)
        return { sourceId: chosen.sourceId, path: relPath, content: truncated.content, truncated: truncated.truncated, sizeBytes: chosen.size, modifiedAt: chosen.modifiedAt }
      }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; sourceIds?: string[]; paths: string[]; maxBytesPerFile?: number } }>('/api/read-files', async (request, reply) => {
    try {
      const { sourceId, sourceIds, paths: relPaths, maxBytesPerFile = 30000 } = request.body
      if (!Array.isArray(relPaths) || relPaths.length === 0) return reply.code(400).send({ error: 'Paths required' })
      const resolvedSourceIds = sourceIds && sourceIds.length > 0 ? sourceIds : sourceId ? [sourceId] : getActiveSourceContext().activeSourceIds
      const targets = getResolvedActiveSources(resolvedSourceIds.length > 0 ? resolvedSourceIds : undefined)
      const files = []
      for (const relPath of relPaths.slice(0, 10)) {
        let found = false
        for (const source of targets) {
          try {
            const result = await readFile(relPath, source.id)
            const content = redactSecrets(result.content)
            const truncated = truncateContent(content, maxBytesPerFile)
            const fullPath = path.join(source.path, path.normalize(relPath))
            const stat = fs.statSync(fullPath)
            files.push({ sourceId: source.id, path: relPath, content: truncated.content, truncated: truncated.truncated, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString() })
            found = true
            break
          } catch {}
        }
        if (!found) files.push({ path: relPath, error: 'File not found in active sources' })
      }
      return { files }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; mode?: 'single' | 'multi' | 'all'; activeSourceIds?: string[] } }>('/api/get-active-sources', async () => {
    const active = getActiveSourceContext()
    const sources = getSourcesSafe().map(source => ({ ...source, active: active.activeSourceIds.includes(source.id), type: (source as any).type || 'unknown' }))
    return { mode: active.mode, activeSourceIds: active.activeSourceIds, sources }
  })

  fastify.post<{ Body: { mode: 'single' | 'multi' | 'all'; activeSourceIds?: string[] } }>('/api/set-active-sources', async (request, reply) => {
    try {
      const { mode, activeSourceIds = [] } = request.body
      const result = setActiveSourceContext(mode, activeSourceIds)
      const sources = getSourcesSafe().map(source => ({ ...source, active: result.activeSourceIds.includes(source.id), type: (source as any).type || 'unknown' }))
      return { status: 'ok', mode: result.mode, activeSourceIds: result.activeSourceIds, sources }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.get('/api/write-mode', async () => {
    return { writeMode: getWriteMode() }
  })

  fastify.post<{ Body: { writeMode: 'readOnly' | 'artifactsOnly' | 'safeWrites' } }>('/api/write-mode', async (request, reply) => {
    try {
      const { writeMode } = request.body
      return { writeMode: setWriteMode(writeMode) }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; artifactType: string; title: string; content: string; folder?: string; filename?: string } }>('/api/create-artifact', async (request, reply) => {
    try {
      const { sourceId, artifactType, title, content, folder, filename } = request.body
      const defaults: Record<string, string> = {
        implementation_plan: 'docs/buildflow/plans',
        codex_prompt: 'docs/buildflow/prompts/codex',
        claude_prompt: 'docs/buildflow/prompts/claude',
        architecture_note: 'docs/buildflow/architecture',
        research_summary: 'docs/buildflow/research',
        test_plan: 'docs/buildflow/testing',
        migration_plan: 'docs/buildflow/migrations',
        task_brief: 'docs/buildflow/tasks',
        general_doc: 'docs/buildflow/notes'
      }
      const targetFolder = folder || defaults[artifactType]
      if (!targetFolder) return reply.code(400).send({ error: 'Unknown artifact type' })
      assertWriteMode(true, targetFolder)
      if (isBlockedWritePath(targetFolder) || !isAllowedArtifactRoot(targetFolder)) return reply.code(403).send({ error: 'Artifact folder blocked' })
      const slug = (filename || title).toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      const relPath = `${targetFolder.replace(/\/$/, '')}/${Date.now()}-${slug}.md`
      const { fullPath, sourceId: resolvedSourceId } = resolveWithinSource(relPath, resolveTargetSourceId(sourceId))
      if (fs.existsSync(fullPath)) return reply.code(409).send({ error: 'Artifact already exists' })
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, content, 'utf-8')
      return { status: 'created', sourceId: resolvedSourceId, path: relPath, artifactType, created: true }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; sourceIds?: string[]; path?: string; depth?: number; limit?: number; cursor?: string } }>('/api/list-files', async (request, reply) => {
    try {
      const { sourceId, sourceIds, path: relPath = '', depth = 3, limit = 100, cursor } = request.body
      const resolvedSourceIds = sourceIds && sourceIds.length > 0 ? sourceIds : sourceId ? [sourceId] : getActiveSourceContext().activeSourceIds
      const targets = getResolvedActiveSources(resolvedSourceIds.length > 0 ? resolvedSourceIds : undefined)
      const entries: Array<Record<string, unknown>> = []

      for (const source of targets) {
        const fullPath = path.resolve(path.join(source.path, path.normalize(relPath)))
        if (!fullPath.startsWith(path.resolve(source.path))) continue
        if (!fs.existsSync(fullPath)) continue
        const stat = fs.statSync(fullPath)
        if (!stat.isDirectory()) continue

        const walk = (dir: string, currentRel: string, currentDepth: number): void => {
          if (entries.length >= limit || currentDepth > depth) return
          for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entries.length >= limit) break
            if (!shouldIncludeEntry(entry.name)) continue
            const nextRel = currentRel ? `${currentRel}/${entry.name}` : entry.name
            const nextFull = path.join(dir, entry.name)
            const nextStat = fs.statSync(nextFull)
            entries.push({
              sourceId: source.id,
              path: nextRel,
              type: entry.isDirectory() ? 'directory' : 'file',
              sizeBytes: nextStat.size,
              modifiedAt: nextStat.mtime.toISOString()
            })
            if (entry.isDirectory() && currentDepth + 1 < depth) walk(nextFull, nextRel, currentDepth + 1)
          }
        }

        walk(fullPath, relPath, 0)
      }

      return { sourceId: targets[0]?.id, path: relPath, entries, nextCursor: undefined, cursor }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; path: string; content: string; mode?: 'createOnly' | 'overwrite'; reason?: string } }>('/api/write-file', async (request, reply) => {
    try {
      const { sourceId, path: relPath, content, mode = 'createOnly' } = request.body
      assertWriteMode(false, relPath)
      if (!relPath || typeof content !== 'string') return reply.code(400).send({ error: 'Path and content required' })
      if (isBlockedWritePath(relPath) || !isAllowedSafeWriteRoot(relPath)) return reply.code(403).send({ error: 'Write path blocked' })
      const { fullPath, sourceId: resolvedSourceId } = resolveWithinSource(relPath, resolveTargetSourceId(sourceId))
      if (mode === 'createOnly' && fs.existsSync(fullPath)) return reply.code(409).send({ error: 'File already exists' })
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      fs.writeFileSync(fullPath, content, 'utf-8')
      return { status: 'ok', sourceId: resolvedSourceId, path: relPath, bytesWritten: Buffer.byteLength(content, 'utf8'), created: mode === 'createOnly', overwritten: mode === 'overwrite' }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; path: string; find: string; replace: string } }>('/api/patch-file', async (request, reply) => {
    try {
      const { sourceId, path: relPath, find, replace } = request.body
      assertWriteMode(false, relPath)
      if (!relPath || typeof find !== 'string' || find.length === 0) return reply.code(400).send({ error: 'Path and find required' })
      if (typeof replace !== 'string') return reply.code(400).send({ error: 'Replace required' })
      if (isBlockedWritePath(relPath) || !isAllowedSafeWriteRoot(relPath)) return reply.code(403).send({ error: 'Patch path blocked' })
      const { fullPath, sourceId: resolvedSourceId } = resolveWithinSource(relPath, resolveTargetSourceId(sourceId))
      if (!fs.existsSync(fullPath)) return reply.code(404).send({ error: 'File not found' })
      const original = fs.readFileSync(fullPath, 'utf-8')
      const matches = original.split(find).length - 1
      if (matches !== 1) return reply.code(400).send({ error: matches === 0 ? 'Find text not found' : 'Find text matched multiple times' })
      const updated = original.replace(find, replace)
      fs.writeFileSync(fullPath, updated, 'utf-8')
      return { status: 'ok', sourceId: resolvedSourceId, path: relPath, replacements: 1 }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; title: string; content: string; folder?: string } }>('/api/create-plan', async (request, reply) => {
    try {
      const { sourceId, title, content, folder = 'docs/plans' } = request.body
      if (!title || !content) return reply.code(400).send({ error: 'Title and content required' })
      assertWriteMode(true, folder)
      if (isBlockedWritePath(folder) || !isAllowedArtifactRoot(folder)) return reply.code(403).send({ error: 'Plan folder blocked' })
      const safeSlug = title.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
      const filename = `${Date.now()}-${safeSlug}.md`
      const relPath = `${folder.replace(/\/$/, '')}/${filename}`
      const { fullPath, sourceId: resolvedSourceId } = resolveWithinSource(relPath, resolveTargetSourceId(sourceId))
      fs.mkdirSync(path.dirname(fullPath), { recursive: true })
      if (fs.existsSync(fullPath)) return reply.code(409).send({ error: 'Plan already exists' })
      fs.writeFileSync(fullPath, content, 'utf-8')
      return { status: 'created', sourceId: resolvedSourceId, path: relPath }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; path: string; content: string; separator?: string; reason?: string } }>('/api/append-file', async (request, reply) => {
    try {
      const { sourceId, path: relPath, content, separator = '\n\n' } = request.body
      assertWriteMode(false, relPath)
      if (!relPath || typeof content !== 'string') return reply.code(400).send({ error: 'Path and content required' })
      if (isBlockedWritePath(relPath) || !isAllowedSafeWriteRoot(relPath)) return reply.code(403).send({ error: 'Append path blocked' })
      const { fullPath, sourceId: resolvedSourceId } = resolveWithinSource(relPath, resolveTargetSourceId(sourceId))
      if (!fs.existsSync(fullPath)) return reply.code(404).send({ error: 'File not found' })
      const appended = `${separator}${content}`
      fs.appendFileSync(fullPath, appended, 'utf-8')
      return { status: 'ok', sourceId: resolvedSourceId, path: relPath, bytesAppended: Buffer.byteLength(appended, 'utf8') }
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
        path = `BuildFlow/Inbox/${timestamp}-${slug}.md`
      }

      // Add frontmatter
      const frontmatter = `---\ncreated: ${new Date().toISOString()}\nsource: buildflow\ntype: plan\n---\n\n`
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
      const sources = getSources()
      return { sources }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.get('/api/sources/list', async (request, reply) => {
    try {
      const sources = getSourcesSafe().map(source => ({
        id: source.id,
        label: source.label,
        enabled: source.enabled
      }))

      return reply.header('Cache-Control', 'no-store').send({ sources })
    } catch (err) {
      return reply.code(500).header('Cache-Control', 'no-store').send({
        error: String(err)
      })
    }
  })

  fastify.post<{ Body: { path?: string; label?: string; id?: string } }>('/api/sources/add', async (request, reply) => {
    try {
      const { path, label, id } = request.body || {}
      if (typeof path !== 'string' || !path.trim()) {
        return reply.code(400).send({ error: 'Missing or invalid path' })
      }
      if (label !== undefined && typeof label !== 'string') {
        return reply.code(400).send({ error: 'Invalid label' })
      }
      if (id !== undefined && typeof id !== 'string') {
        return reply.code(400).send({ error: 'Invalid id' })
      }

      const sources = addSource(path, label, id)
      await rebuildIndexAndSearcher()
      return { sources }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string } }>('/api/sources/remove', async (request, reply) => {
    try {
      const { sourceId } = request.body || {}
      if (typeof sourceId !== 'string' || !sourceId.trim()) {
        return reply.code(400).send({ error: 'Missing or invalid sourceId' })
      }

      const sources = removeSource(sourceId)
      await rebuildIndexAndSearcher()
      return { sources }
    } catch (err) {
      return reply.code(400).send({ error: String(err) })
    }
  })

  fastify.post<{ Body: { sourceId?: string; enabled?: boolean } }>('/api/sources/toggle', async (request, reply) => {
    try {
      const { sourceId, enabled } = request.body || {}
      if (typeof sourceId !== 'string' || !sourceId.trim()) {
        return reply.code(400).send({ error: 'Missing or invalid sourceId' })
      }
      if (typeof enabled !== 'boolean') {
        return reply.code(400).send({ error: 'Missing or invalid enabled value' })
      }

      const sources = setSourceEnabled(sourceId, enabled)
      await rebuildIndexAndSearcher()
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
