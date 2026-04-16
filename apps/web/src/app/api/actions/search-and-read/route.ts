import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, limit = 2 } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Missing query parameter' },
        { status: 400 }
      )
    }

    // Cap limit at 3 for safety
    const cappedLimit = Math.min(Math.max(limit, 1), 3)

    const localAgentUrl = process.env.LOCAL_AGENT_URL || 'http://127.0.0.1:3052'

    // Search first
    const searchResponse = await fetch(`${localAgentUrl}/api/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit: cappedLimit })
    })

    if (!searchResponse.ok) {
      return NextResponse.json(
        { error: `Search failed: ${searchResponse.status}` },
        { status: searchResponse.status }
      )
    }

    const searchData = await searchResponse.json()
    const searchResults = searchData.results || []

    // Read each result (up to capped limit)
    const results = []
    for (const result of searchResults.slice(0, cappedLimit)) {
      try {
        const readResponse = await fetch(`${localAgentUrl}/api/read`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ path: result.path })
        })

        if (readResponse.ok) {
          const readData = await readResponse.json()
          results.push({
            path: result.path,
            title: result.title || '',
            snippet: result.snippet || '',
            content: readData.content || '',
            modifiedAt: result.modifiedAt || ''
          })
        } else {
          results.push({
            path: result.path,
            title: result.title || '',
            snippet: result.snippet || '',
            content: `[Error reading file: ${readResponse.status}]`,
            modifiedAt: result.modifiedAt || ''
          })
        }
      } catch (err) {
        results.push({
          path: result.path,
          title: result.title || '',
          snippet: result.snippet || '',
          content: `[Error reading file: ${String(err)}]`,
          modifiedAt: result.modifiedAt || ''
        })
      }
    }

    return NextResponse.json({ results })
  } catch (err) {
    return NextResponse.json(
      { error: `Search-and-read error: ${String(err)}` },
      { status: 500 }
    )
  }
}
