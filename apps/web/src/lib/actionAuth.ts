import { NextRequest, NextResponse } from 'next/server'

export function checkActionAuth(request: NextRequest): NextResponse | null {
  const token = process.env.BRAIN_BRIDGE_ACTION_TOKEN

  if (!token) {
    return NextResponse.json(
      { error: 'Server configuration error: BRAIN_BRIDGE_ACTION_TOKEN not set' },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get('authorization')
  const expectedBearer = `Bearer ${token}`

  if (!authHeader || authHeader !== expectedBearer) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  return null
}
