import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeAction, ActionTransportError } from '@/lib/actions/transport'

export async function POST(request: NextRequest) {
  const authError = checkActionAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { query, limit = 10, sourceId, sourceIds, glob } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      )
    }

    const payload: Record<string, unknown> = { query, limit }
    if (sourceId) payload.sourceId = sourceId
    if (sourceIds) payload.sourceIds = sourceIds
    if (glob) payload.glob = glob
    const data = await executeAction('/api/search', payload)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof ActionTransportError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    return NextResponse.json(
      { error: `Search error: ${String(err)}` },
      { status: 500 }
    )
  }
}
