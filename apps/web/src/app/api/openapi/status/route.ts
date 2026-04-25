import { NextResponse } from 'next/server'
import schema from '../../../../../../../docs/openapi.chatgpt/status.json'

export async function GET() {
  return NextResponse.json(schema)
}
