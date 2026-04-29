import { NextResponse } from 'next/server'

const DEFAULT_AGENT_URL = 'http://127.0.0.1:3052'
const DEFAULT_TIMEOUT_MS = 5000

type AgentProxyOptions = RequestInit & {
  timeoutMs?: number
}

export type AgentErrorPayload = {
  status: 'error'
  code: 'AGENT_UNAVAILABLE' | 'AGENT_ERROR'
  error: string
  message: string
  userMessage: string
  detail?: string
  retryable: boolean
}

const getAgentBaseUrl = () => (process.env.LOCAL_AGENT_URL || DEFAULT_AGENT_URL).replace(/\/$/, '')

const toErrorDetail = (err: unknown) => (err instanceof Error ? `${err.name}: ${err.message}` : String(err))

const unavailablePayload = (err: unknown): AgentErrorPayload => ({
  status: 'error',
  code: 'AGENT_UNAVAILABLE',
  error: 'BuildFlow agent is unavailable',
  message: 'BuildFlow agent is unavailable',
  userMessage: 'BuildFlow could not reach the local agent. Check that buildflow serve is running, then retry.',
  detail: toErrorDetail(err),
  retryable: true
})

const upstreamErrorPayload = (status: number, data: Record<string, unknown>): AgentErrorPayload & Record<string, unknown> => ({
  status: 'error',
  code: 'AGENT_ERROR',
  error: typeof data.error === 'string' ? data.error : `BuildFlow agent returned ${status}`,
  message:
    typeof data.message === 'string'
      ? data.message
      : typeof data.error === 'string'
        ? data.error
        : `BuildFlow agent returned ${status}`,
  userMessage: typeof data.userMessage === 'string' ? data.userMessage : 'BuildFlow agent returned an error for this source action.',
  detail: typeof data.detail === 'string' ? data.detail : typeof data.details === 'string' ? data.details : undefined,
  retryable: status >= 500,
  upstreamStatus: status,
  ...data
})

export async function fetchAgentJson(pathname: string, options: AgentProxyOptions = {}) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS)

  try {
    const response = await fetch(`${getAgentBaseUrl()}${pathname}`, {
      cache: 'no-store',
      ...options,
      signal: controller.signal
    })
    const data = (await response.json().catch(async () => ({ error: await response.text().catch(() => '') }))) as Record<string, unknown>
    return { response, data }
  } catch (err) {
    return { response: null, data: unavailablePayload(err) }
  } finally {
    clearTimeout(timeout)
  }
}

export function jsonFromAgentResult(result: Awaited<ReturnType<typeof fetchAgentJson>>) {
  if (!result.response) {
    return NextResponse.json(result.data, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }

  if (!result.response.ok) {
    return NextResponse.json(upstreamErrorPayload(result.response.status, result.data), {
      status: result.response.status,
      headers: { 'Cache-Control': 'no-store' }
    })
  }

  return NextResponse.json(result.data, { status: result.response.status, headers: { 'Cache-Control': 'no-store' } })
}

export async function proxyAgentJson(pathname: string, options: AgentProxyOptions = {}) {
  return jsonFromAgentResult(await fetchAgentJson(pathname, options))
}
