import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'

export async function POST(request: NextRequest) {
  const authError = checkActionAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { query, limit = 10 } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      )
    }

    const localAgentUrl = process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:3052'

    // Forward to local agent search endpoint
    const response = await fetch(`${localAgentUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit })
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Search failed: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json(
      { error: `Search error: ${String(err)}` },
      { status: 500 }
    )
  }
}
