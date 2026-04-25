import { NextResponse } from 'next/server'
import schema from '../../../../../../../docs/openapi.chatgpt/search-and-read.json'

export async function GET() {
  return NextResponse.json(schema)
}
