import { NextRequest, NextResponse } from 'next/server'
import { checkActionAuth } from '@/lib/actionAuth'
import { executeAction, ActionTransportError } from '@/lib/actions/transport'

export async function POST(request: NextRequest) {
  const authError = checkActionAuth(request)
  if (authError) return authError

  try {
    const body = await request.json()
    const { query, limit = 2, sourceId, sourceIds, maxBytesPerFile } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      )
    }

    // Cap limit at 3 for safety
    const cappedLimit = Math.min(Math.max(limit, 1), 3)

    // Search first
    const searchPayload: Record<string, unknown> = { query, limit: cappedLimit }
    if (sourceId) searchPayload.sourceId = sourceId
    if (sourceIds) searchPayload.sourceIds = sourceIds
    const searchData = await executeAction('/api/search', searchPayload)
    const searchResults = (searchData as Record<string, unknown>).results as unknown[] || []

    // Read each result (up to capped limit)
    const results = []
    for (const result of searchResults.slice(0, cappedLimit)) {
      const resultObj = result as Record<string, unknown>
      try {
        const readPayload: Record<string, unknown> = { path: resultObj.path }
        if (resultObj.sourceId) {
          readPayload.sourceId = resultObj.sourceId
        }
        if (maxBytesPerFile) {
          readPayload.maxBytes = maxBytesPerFile
        }

        const readData = await executeAction('/api/read', readPayload)
        const readDataObj = readData as Record<string, unknown>
        results.push({
          sourceId: resultObj.sourceId,
          path: resultObj.path,
          title: resultObj.title || '',
          snippet: resultObj.snippet || '',
          content: readDataObj.content || '',
          modifiedAt: resultObj.modifiedAt || ''
        })
      } catch (err) {
        // Preserve the published response shape for mixed-result reads:
        // failed items stay in-band so the overall action still returns usable results.
        results.push({
          sourceId: resultObj.sourceId,
          path: resultObj.path,
          title: resultObj.title || '',
          snippet: resultObj.snippet || '',
          content: '',
          modifiedAt: resultObj.modifiedAt || ''
        })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    if (err instanceof ActionTransportError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.statusCode }
      )
    }
    return NextResponse.json(
      { error: `Search-and-read error: ${String(err)}` },
      { status: 500 }
    )
  }
}
