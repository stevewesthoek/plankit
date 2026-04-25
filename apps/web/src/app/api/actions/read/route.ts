import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeAction, ActionTransportError } from '@/lib/actions/transport'

export async function POST(request: NextRequest) {
  const authError = checkActionAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { path, sourceId, sourceIds, maxBytes } = body

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path parameter' },
        { status: 400 }
      )
    }

    const payload: Record<string, unknown> = { path }
    if (sourceId) {
      payload.sourceId = sourceId
    }
    if (sourceIds) {
      payload.sourceIds = sourceIds
    }
    if (maxBytes) {
      payload.maxBytes = maxBytes
    }

    const data = await executeAction('/api/read', payload)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof ActionTransportError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    return NextResponse.json(
      { error: `Read error: ${String(err)}` },
      { status: 500 }
    )
  }
}
