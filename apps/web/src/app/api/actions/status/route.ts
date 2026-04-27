import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeActionGET, ActionTransportError } from '@/lib/actions/transport'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const auth = checkActionAuth(request)
  if (!auth.valid) return auth.error

  try {
    const result = await executeActionGET('/api/status', auth.bearerToken)
    return NextResponse.json(result.data, {
      status: result.status,
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    if (err instanceof ActionTransportError) {
      return NextResponse.json(
        { error: err.message },
        {
          status: err.statusCode,
          headers: {
            'Cache-Control': 'no-store'
          }
        }
      )
    }
    return NextResponse.json(
      { error: 'Backend service unavailable' },
      {
        status: 503,
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    )
  }
}
