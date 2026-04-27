import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { getBuildFlowActiveContext, setBuildFlowActiveContext, unwrapActionError } from '@/lib/actions/gpt'

export async function GET(request: NextRequest) {
  const auth = checkActionAuth(request)
  if (!auth.valid) return auth.error
  try {
    const data = await getBuildFlowActiveContext(auth.bearerToken)
    return NextResponse.json(data)
  } catch (err) {
    const { error, status } = unwrapActionError(err, 'context active error')
    return NextResponse.json({ error }, { status })
  }
}

export async function POST(request: NextRequest) {
  const auth = checkActionAuth(request)
  if (!auth.valid) return auth.error
  try {
    const body = await request.json()
    const data = await setBuildFlowActiveContext(body, auth.bearerToken)
    return NextResponse.json(data)
  } catch (err) {
    const { error, status } = unwrapActionError(err, 'context active error')
    return NextResponse.json({ error }, { status })
  }
}
