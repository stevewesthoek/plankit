import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeAction, ActionTransportError } from '@/lib/actions/transport'

export async function POST(request: NextRequest) {
  const authError = checkActionAuth(request)
  if (authError) return authError
  try {
    const body = await request.json()
    const data = await executeAction('/api/read-files', body)
    return NextResponse.json(data)
  } catch (err) {
    if (err instanceof ActionTransportError) return NextResponse.json({ error: err.message }, { status: err.statusCode })
    return NextResponse.json({ error: `Read files error: ${String(err)}` }, { status: 500 })
  }
}
