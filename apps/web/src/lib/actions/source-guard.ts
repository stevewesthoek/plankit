import { NextResponse } from 'next/server'
import { executeAction, ActionTransportError } from './transport'

export async function requireExplicitSourceId(body: Record<string, unknown>) {
  if (typeof body.sourceId === 'string' && body.sourceId.length > 0) {
    return null
  }

  const active = await executeAction('/api/get-active-sources', {})
  const activeIds = Array.isArray((active as { activeSourceIds?: unknown }).activeSourceIds)
    ? ((active as { activeSourceIds: string[] }).activeSourceIds || [])
    : []

  if (activeIds.length === 1) {
    return null
  }

  return NextResponse.json(
    { error: 'Target sourceId required when multiple sources are active.' },
    { status: 400 }
  )
}

export function unwrapActionError(err: unknown, fallback: string) {
  if (err instanceof ActionTransportError) {
    return NextResponse.json({ error: err.message }, { status: err.statusCode })
  }
  return NextResponse.json({ error: `${fallback}: ${String(err)}` }, { status: 500 })
}
