import WebSocket from 'ws'
import { ToolCallMessage, ToolResponseMessage } from '@brainbridge/shared'
import { readFile, createFile, appendFile } from './vault'
import { Indexer } from './indexer'
import { VaultSearcher } from './search'
import { createExportPlan } from './export'
import { debug, log } from '../utils/logger'

export class BridgeClient {
  private ws: WebSocket | null = null
  private url: string
  private deviceToken: string
  private indexer: Indexer
  private searcher: VaultSearcher

  constructor(apiBaseUrl: string, deviceToken: string) {
    this.url = apiBaseUrl.replace('http://', 'ws://').replace('https://', 'wss://')
    this.deviceToken = deviceToken
    this.indexer = new Indexer()
    this.searcher = new VaultSearcher(this.indexer.getDocs())
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.url}/api/bridge/ws`)

        this.ws.on('open', () => {
          log('Connected to SaaS bridge')

          // Authenticate
          this.ws?.send(JSON.stringify({
            type: 'auth',
            deviceToken: this.deviceToken
          }))

          resolve()
        })

        this.ws.on('message', (data: string) => {
          this.handleMessage(data)
        })

        this.ws.on('error', (err) => {
          console.error('WebSocket error:', err)
          reject(err)
        })

        this.ws.on('close', () => {
          log('Disconnected from SaaS bridge')
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  private async handleMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data) as ToolCallMessage

      debug(`Received tool call: ${message.tool}`)

      let result: Record<string, unknown> | undefined
      let error: string | undefined

      try {
        switch (message.tool) {
          case 'search_brain':
            const searchInput = message.input as { query: string; limit?: number }
            const searchResults = this.searcher.search(searchInput.query, searchInput.limit)
            result = { results: searchResults }
            break

          case 'read_file':
            const readInput = message.input as { path: string }
            result = await readFile(readInput.path)
            break

          case 'create_note':
            const createInput = message.input as { path?: string; content: string }
            result = await createFile(createInput.path || '', createInput.content)
            await this.indexer.buildIndex()
            this.searcher = new VaultSearcher(this.indexer.getDocs())
            break

          case 'append_note':
            const appendInput = message.input as { path: string; content: string }
            result = await appendFile(appendInput.path, appendInput.content)
            break

          case 'export_claude_plan':
            result = await createExportPlan(message.input)
            await this.indexer.buildIndex()
            this.searcher = new VaultSearcher(this.indexer.getDocs())
            break

          default:
            error = `Unknown tool: ${message.tool}`
        }
      } catch (err) {
        error = String(err)
      }

      // Send response
      const response: ToolResponseMessage = {
        id: message.id,
        status: error ? 'error' : 'success',
        result: error ? undefined : result,
        error
      }

      this.ws?.send(JSON.stringify(response))
    } catch (err) {
      console.error('Failed to handle message:', err)
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN
  }
}
