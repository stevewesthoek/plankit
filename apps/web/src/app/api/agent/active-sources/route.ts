import { NextRequest } from 'next/server'
import { proxyAgentJson } from '@/lib/agentProxy'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return proxyAgentJson('/api/get-active-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return proxyAgentJson('/api/set-active-sources', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}
