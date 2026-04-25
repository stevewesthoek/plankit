import { NextResponse } from 'next/server'
import schema from '../../../../../../../docs/openapi.chatgpt/read-files.json'

export async function GET() {
  return NextResponse.json(schema)
}
