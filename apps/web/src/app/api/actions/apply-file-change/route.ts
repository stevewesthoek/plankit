import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { dispatchBuildFlowFileChange, unwrapActionError } from '@/lib/actions/gpt'

export async function POST(request: NextRequest) {
  const auth = checkActionAuth(request)
  if (!auth.valid) return auth.error

  try {
    const body = await request.json()
    if (body.dryRun !== true && body.preflight !== true) {
      const preflight = await dispatchBuildFlowFileChange({ ...body, dryRun: true }, auth.bearerToken)
      if ('error' in (preflight as Record<string, unknown>)) {
        const payload = preflight as { error: unknown; status: number }
        if (payload.error && typeof payload.error === 'object') {
          return NextResponse.json(payload.error, { status: payload.status })
        }
        return NextResponse.json({ error: payload.error }, { status: payload.status })
      }
      if ((preflight as { allowed?: unknown }).allowed === false) {
        return NextResponse.json(preflight, { status: 403 })
      }
    }
    const data = await dispatchBuildFlowFileChange(body, auth.bearerToken)
    if ('error' in (data as Record<string, unknown>)) {
      const payload = data as { error: unknown; status: number }
      if (payload.error && typeof payload.error === 'object') {
        return NextResponse.json(payload.error, { status: payload.status })
      }
      return NextResponse.json({ error: payload.error }, { status: payload.status })
    }
    if ((body.dryRun === true || body.preflight === true) && (data as { verified?: unknown }).verified === false) {
      return NextResponse.json(data)
    }
    if ((data as { verified?: unknown }).verified !== true) {
      return NextResponse.json({ error: 'Write was not verified' }, { status: 502 })
    }
    return NextResponse.json(data)
  } catch (err) {
    const { error, status } = unwrapActionError(err, 'apply-file-change error')
    if (error && typeof error === 'object') {
      return NextResponse.json(error, { status })
    }
    return NextResponse.json({ error }, { status })
  }
}
