import { createFile } from './vault'

interface ExportPlanInput {
  title: string
  summary?: string
  projectGoal?: string
  techStack?: string
  implementationPlan?: string
  tasks?: string[]
  acceptanceCriteria?: string[]
}

export async function createExportPlan(input: Record<string, unknown>): Promise<{ path: string; created: boolean }> {
  const data = input as unknown as ExportPlanInput

  const tasks = (data.tasks || []).map((t: string) => `- ${t}`).join('\n')
  const criteria = (data.acceptanceCriteria || []).map((c: string) => `- ${c}`).join('\n')

  const content = `# Claude Code Implementation Brief: ${data.title || 'Untitled'}

## Project Goal

${data.projectGoal || 'No goal provided.'}

## Context Summary

${data.summary || 'No summary provided.'}

## Tech Stack

${data.techStack || 'No tech stack provided.'}

## Implementation Plan

${data.implementationPlan || 'No plan provided.'}

## Task Breakdown

${tasks || '- No tasks provided.'}

## Acceptance Criteria

${criteria || '- No criteria provided.'}

## Files To Inspect First

- README.md
- package.json
- src/

## Constraints

- Do not delete files without permission.
- Keep implementation minimal.
- Prefer incremental changes.
- Document important decisions.

## Definition Of Done

The implementation is done when all acceptance criteria pass and the project can be run locally.
`

  const timestamp = new Date().toISOString().split('T')[0]
  const slug = (data.title || 'plan').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const path = `Handoffs/claude-code/${timestamp}-${slug}.md`

  return createFile(path, content)
}
