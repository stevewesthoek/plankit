import { NextResponse } from 'next/server'
import openapi from '../../../../../../docs/openapi.chatgpt.json'

export async function GET() {
  return NextResponse.json(openapi)
}
