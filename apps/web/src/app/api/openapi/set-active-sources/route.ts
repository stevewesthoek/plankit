import { NextResponse } from 'next/server'
import schema from '../../../../../../../docs/openapi.chatgpt/set-active-sources.json'

export async function GET() {
  return NextResponse.json(schema)
}
