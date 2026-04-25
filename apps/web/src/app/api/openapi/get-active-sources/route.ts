import { NextResponse } from 'next/server'
import schema from '../../../../../../../docs/openapi.chatgpt/get-active-sources.json'

export async function GET() {
  return NextResponse.json(schema)
}
