import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { listBuildFlowSources, unwrapActionError } from '@/lib/actions/gpt'

export async function GET(request: NextRequest) {
  const authError = checkActionAuth(request)
  if (authError) return authError
  try {
    const data = await listBuildFlowSources()
    return NextResponse.json(data)
  } catch (err) {
    const { error, status } = unwrapActionError(err, 'sources error')
    return NextResponse.json({ error }, { status })
  }
}
