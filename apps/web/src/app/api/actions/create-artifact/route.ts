import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeAction, ActionTransportError } from '@/lib/actions/transport'
import { requireExplicitSourceId, unwrapActionError } from '@/lib/actions/source-guard'

export async function POST(request: NextRequest) {
  const auth = checkActionAuth(request)
  if (!auth.valid) return auth.error
  try {
    const body = await request.json()
    const sourceError = await requireExplicitSourceId(body)
    if (sourceError) return sourceError
    const data = await executeAction('/api/create-artifact', body, auth.bearerToken)
    if ((data as { verified?: unknown }).verified !== true) {
      return NextResponse.json({ error: 'Write was not verified' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (err) {
    const actionError = unwrapActionError(err, 'create-artifact error') as unknown as { error: unknown; status: number }
    if (actionError.error && typeof actionError.error === 'object') {
      return NextResponse.json(actionError.error, { status: actionError.status })
    }
    return NextResponse.json({ error: actionError.error }, { status: actionError.status })
  }
}
