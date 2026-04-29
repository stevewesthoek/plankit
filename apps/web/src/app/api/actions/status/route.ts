import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeActionGET, ActionTransportError } from '@/lib/actions/transport'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function buildStatusActivity(sourceCount: number) {
  return {
    version: '1.2.13-beta',
    operationId: 'getBuildFlowStatus',
    phase: 'completed',
    actionLabel: 'Checked BuildFlow connection',
    userMessage: `BuildFlow is connected and can see ${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}.`,
    riskLevel: 'low',
    requiresConfirmation: false,
    verified: true,
    nextStep: sourceCount > 0 ? 'Select a source and continue.' : 'Connect a source and try again.'
  }
}

export async function GET(request: NextRequest) {
  const auth = checkActionAuth(request)
  if (!auth.valid) return auth.error

  try {
    const result = await executeActionGET('/api/status', auth.bearerToken)
    const sourceCount = typeof result.data === 'object' && result.data !== null && typeof (result.data as { sourceCount?: unknown }).sourceCount === 'number'
      ? (result.data as { sourceCount: number }).sourceCount
      : 0
    const payload = result.data && typeof result.data === 'object'
      ? { ...(result.data as Record<string, unknown>), activity: buildStatusActivity(sourceCount) }
      : { activity: buildStatusActivity(sourceCount) }
    return NextResponse.json(payload, {
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
