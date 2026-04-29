import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { dispatchBuildFlowArtifact, unwrapActionError } from '@/lib/actions/gpt'

function getSafeActionHttpStatus(error: unknown): number {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code
    if (code === 'REQUIRES_EXPLICIT_CONFIRMATION') return 200
    return 403
  }
  return 403
}

export async function POST(request: NextRequest) {
  const auth = checkActionAuth(request)
  if (!auth.valid) return auth.error

  try {
    const body = await request.json()
    if (body.dryRun !== true && body.preflight !== true) {
      const preflight = await dispatchBuildFlowArtifact({ ...body, dryRun: true }, auth.bearerToken)
      if ('error' in (preflight as Record<string, unknown>)) {
        const payload = preflight as { error: unknown }
        const status = getSafeActionHttpStatus(payload.error)
        if (payload.error && typeof payload.error === 'object') {
          return NextResponse.json(payload.error, { status })
        }
        return NextResponse.json({ error: payload.error }, { status })
      }
      if ((preflight as { requiresConfirmation?: unknown }).requiresConfirmation === true) {
        return NextResponse.json(preflight)
      }
      if ((preflight as { allowed?: unknown }).allowed === false) {
        return NextResponse.json(preflight)
      }
    }
    const data = await dispatchBuildFlowArtifact(body, auth.bearerToken)
    if ('error' in (data as Record<string, unknown>)) {
      const payload = data as { error: unknown }
      const status = getSafeActionHttpStatus(payload.error)
      if (payload.error && typeof payload.error === 'object') {
        return NextResponse.json(payload.error, { status })
      }
      return NextResponse.json({ error: payload.error }, { status })
    }
    if ((body.dryRun === true || body.preflight === true) && (data as { verified?: unknown }).verified === false) {
      return NextResponse.json(data)
    }
    if ((data as { verified?: unknown }).verified !== true) {
      return NextResponse.json({ error: 'Write was not verified' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (err) {
    const { error, status } = unwrapActionError(err, 'write-artifact error')
    return NextResponse.json({ error }, { status })
  }
}
