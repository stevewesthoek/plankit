import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

async function proxy(url: string, options?: RequestInit) {
  const backendUrl = process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:3052'
  try {
    const response = await fetch(backendUrl + url, options)
    const data = await response.json().catch(() => ({}))
    return NextResponse.json(data, { status: response.status })
  } catch (err) {
    return NextResponse.json(
      { error: 'BuildFlow agent is unavailable', detail: String(err) },
      { status: 503 }
    )
  }
}

export async function GET() {
  return proxy('/api/write-mode')
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  return proxy('/api/write-mode', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
}
