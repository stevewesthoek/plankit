import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeAction, ActionTransportError } from '@/lib/actions/transport'

export async function POST(request: NextRequest) {
  const authError = checkActionAuth(request)
  if (authError) return authError
  try {
    const body = await request.json()
    const data = await executeAction('/api/write-file', body)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof ActionTransportError) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    return NextResponse.json({ error: `Write file error: ${String(err)}` }, { status: 500 })
  }
}
