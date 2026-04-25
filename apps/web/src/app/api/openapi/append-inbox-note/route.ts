import { NextResponse } from 'next/server'
import schema from '../../../../../../../docs/openapi.chatgpt/append-inbox-note.json'

export async function GET() {
  return NextResponse.json(schema)
}
