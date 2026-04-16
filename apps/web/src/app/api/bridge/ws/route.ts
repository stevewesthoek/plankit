import { NextResponse } from 'next/server'

// WebSocket bridge is implemented as a separate standalone server
// See packages/bridge/ directory
// This endpoint just confirms the bridge service is accessible

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'WebSocket bridge service runs on separate port (3002)'
  })
}
