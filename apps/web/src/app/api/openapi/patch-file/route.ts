import { NextResponse } from 'next/server'
import schema from '../../../../../../../docs/openapi.chatgpt/patch-file.json'

export async function GET() {
  return NextResponse.json(schema)
}
