import fs from 'fs'
import path from 'path'
import { getConfigPath, expandTilde } from '../utils/paths'
import type { Workspace, KnowledgeSource, ActiveSourcesMode, WriteMode } from '@buildflow/shared'

export interface AgentConfig {
  userId: string
  deviceId: string
  deviceToken: string
  apiBaseUrl: string
  vaultPath?: string
  inboxSourceId?: string
  sources?: KnowledgeSource[]
  activeSourceIds?: string[]
  activeSourcesMode?: ActiveSourcesMode
  writeMode?: WriteMode
  localPort?: number
  mode: 'read_create_append'
  allowedExtensions: string[]
  ignorePatterns: string[]
  workspaces?: Workspace[]
}

export function loadConfig(): AgentConfig | null {
  const configPath = getConfigPath()
  if (!fs.existsSync(configPath)) {
    return null
  }

  try {
    const content = fs.readFileSync(configPath, 'utf-8')
    return JSON.parse(content)
  } catch (err) {
    return null
  }
}

export function saveConfig(config: AgentConfig): void {
  const configPath = getConfigPath()
  const dir = path.dirname(configPath)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2))
}

function ensureSources(config: AgentConfig): KnowledgeSource[] {
  if (config.sources !== undefined) {
    return config.sources
  }

  if (config.vaultPath) {
    return [
      {
        id: 'vault',
        label: 'Vault',
        path: config.vaultPath,
        enabled: true
      }
    ]
  }

  return []
}

function persistSources(config: AgentConfig, sources: KnowledgeSource[]): void {
  config.sources = sources
  saveConfig(config)
}

function persistConfig(config: AgentConfig): void {
  saveConfig(config)
}

export function generateSourceIdFromPath(sourcePath: string): string {
  return path.basename(sourcePath).toLowerCase().replace(/[^a-z0-9-]/g, '-')
}

export function getSources(): KnowledgeSource[] {
  const config = loadConfig()
  const sources = ensureSources(config ?? ({} as AgentConfig))
  if (sources.length === 0 && !(config && config.sources !== undefined)) {
    throw new Error('No knowledge sources configured. Run: buildflow connect <folder>')
  }

  return sources.map(s => ({
    ...s,
    path: expandTilde(s.path)
  }))
}

export function getSourcesSafe(): KnowledgeSource[] {
  const config = loadConfig()
  const sources = ensureSources(config ?? ({} as AgentConfig))

  return sources.map(s => ({
    ...s,
    path: expandTilde(s.path)
  }))
}

export function getEnabledSources(): KnowledgeSource[] {
  return getSources().filter(s => s.enabled)
}

export function getActiveSourceContext(): { mode: ActiveSourcesMode; activeSourceIds: string[]; sources: KnowledgeSource[] } {
  const config = loadConfig()
  const sources = getSourcesSafe().filter(s => s.enabled)
  const mode = config?.activeSourcesMode || 'all'
  const configuredIds = config?.activeSourceIds || []
  let activeSourceIds: string[] = []

  if (mode === 'single') {
    activeSourceIds = configuredIds.slice(0, 1)
  } else if (mode === 'multi') {
    activeSourceIds = configuredIds
  } else {
    activeSourceIds = sources.map(s => s.id)
  }

  const activeIds = new Set(activeSourceIds)
  const hydrated = sources.map(source => ({ ...source, active: activeIds.has(source.id) } as KnowledgeSource & { active?: boolean }))
  return { mode, activeSourceIds, sources: hydrated }
}

export function setActiveSourceContext(mode: ActiveSourcesMode, activeSourceIds: string[] = []): { mode: ActiveSourcesMode; activeSourceIds: string[]; sources: KnowledgeSource[] } {
  const config = loadConfig()
  if (!config) throw new Error('Please run: buildflow init')
  const sources = getEnabledSources()
  const ids = new Set(sources.map(s => s.id))
  const filtered = activeSourceIds.filter(id => ids.has(id))
  if (mode === 'single' && filtered.length !== 1) throw new Error('single mode requires exactly one activeSourceId')
  if (mode === 'multi' && filtered.length === 0) throw new Error('multi mode requires one or more activeSourceIds')
  config.activeSourcesMode = mode
  config.activeSourceIds = mode === 'all' ? sources.map(s => s.id) : filtered.slice(0, 10)
  persistConfig(config)
  return getActiveSourceContext()
}

export function getWriteMode(): WriteMode {
  const config = loadConfig()
  return config?.writeMode || 'safeWrites'
}

export function setWriteMode(writeMode: WriteMode): WriteMode {
  const config = loadConfig()
  if (!config) throw new Error('Please run: buildflow init')
  config.writeMode = writeMode
  persistConfig(config)
  return getWriteMode()
}

export function addSource(pathInput: string, label?: string, id?: string): KnowledgeSource[] {
  const config = loadConfig()
  if (!config) {
    throw new Error('Please run: buildflow init')
  }

  if (!pathInput) {
    throw new Error('Knowledge source path required')
  }

  const expanded = expandTilde(pathInput)
  if (!fs.existsSync(expanded)) {
    throw new Error(`Knowledge source folder not found: ${expanded}`)
  }
  if (!fs.statSync(expanded).isDirectory()) {
    throw new Error(`Not a directory: ${expanded}`)
  }
  fs.accessSync(expanded, fs.constants.R_OK)

  const sources = ensureSources(config)
  const sourceId = id || generateSourceIdFromPath(expanded)
  if (sources.some(source => source.id === sourceId)) {
    throw new Error(`Knowledge source with ID "${sourceId}" already exists`)
  }

  sources.push({
    id: sourceId,
    label: label || path.basename(expanded),
    path: expanded,
    enabled: true,
    type: 'unknown'
  })

  persistSources(config, sources)
  if (!config.vaultPath) {
    config.vaultPath = expanded
  }
  saveConfig(config)

  return getSources()
}

export function removeSource(sourceId: string): KnowledgeSource[] {
  const config = loadConfig()
  if (!config) {
    throw new Error('Please run: buildflow init')
  }

  const sources = ensureSources(config)
  const nextSources = sources.filter(source => source.id !== sourceId)
  if (nextSources.length === sources.length) {
    throw new Error(`Knowledge source not found: ${sourceId}`)
  }

  persistSources(config, nextSources)
  return getSources()
}

export function setSourceEnabled(sourceId: string, enabled: boolean): KnowledgeSource[] {
  const config = loadConfig()
  if (!config) {
    throw new Error('Please run: buildflow init')
  }

  const sources = ensureSources(config)
  let changed = false
  const nextSources = sources.map(source => {
    if (source.id !== sourceId) {
      return source
    }

    changed = source.enabled !== enabled
    return { ...source, enabled }
  })

  if (!nextSources.some(source => source.id === sourceId)) {
    throw new Error(`Knowledge source not found: ${sourceId}`)
  }

  persistSources(config, nextSources)

  return getSources()
}

export function getVaultPath(): string {
  const config = loadConfig()
  if (!config?.vaultPath) {
    throw new Error('No vault path configured. Run: buildflow connect <folder>')
  }

  return expandTilde(config.vaultPath)
}

export function getInboxSourceId(): string {
  const config = loadConfig()
  return config?.inboxSourceId || 'mind'
}

export function getLocalPort(): number {
  const config = loadConfig()
  return config?.localPort ?? 3052
}

export function getWorkspaces(): Workspace[] {
  const config = loadConfig()
  if (config?.workspaces && config.workspaces.length > 0) {
    return config.workspaces
  }

  if (config?.vaultPath) {
    return [
      {
        name: 'vault',
        root: config.vaultPath,
        mode: 'default'
      }
    ]
  }

  return []
}

export function getWorkspace(name: string): Workspace | null {
  const workspaces = getWorkspaces()
  return workspaces.find(ws => ws.name === name) ?? null
}
