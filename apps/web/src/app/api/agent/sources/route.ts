import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const backendUrl = process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:3052'

  try {
    const response = await fetch(`${backendUrl}/api/sources`)
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch sources', status: response.status },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'BuildFlow agent is unavailable', detail: String(err) },
      { status: 503 }
    )
  }
}
