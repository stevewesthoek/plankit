import Fastify from 'fastify'
import { Indexer } from './indexer'
import { VaultSearcher } from './search'
import { readFile, createFile, appendFile, listFolder } from './vault'
import { logToFile } from '../utils/logger'
import { createExportPlan } from './export'
import { loadConfig } from './config'

export async function startLocalServer(port: number = 3001): Promise<void> {
  const fastify = Fastify({ logger: true })

  const indexer = new Indexer()
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

  // Read endpoint
  fastify.post<{ Body: { path: string } }>('/api/read', async (request, reply) => {
    try {
      const { path } = request.body
      const result = await readFile(path)
      return result
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

  await fastify.listen({ port, host: '127.0.0.1' })
  console.log(`Local agent running on http://127.0.0.1:${port}`)
}
