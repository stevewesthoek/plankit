# BuildFlow Design System

## Status

Canonical design source of truth for BuildFlow Local dashboard and product UI.

This document guides the public, self-hosted BuildFlow Local experience only.

## Product design goal

BuildFlow Local should feel like a compact local AI workbench for moving from context to safe execution.

The dashboard should make the user feel:

- BuildFlow knows which sources are connected
- BuildFlow understands the current project context
- BuildFlow can show the active plan or execution packet
- BuildFlow knows the next useful action
- BuildFlow can help continue or resume work without terminal anxiety

## Design direction

Use this direction:

> ChatGPT app familiarity + Codex app shell + Linear density + Vercel precision + Apple restraint

Meaning:

- ChatGPT app familiarity: clear sections, calm hierarchy, obvious interaction patterns
- Codex app shell: compact workspace rail, dense but readable operational layout
- Linear density: efficient spacing, precise alignment, no waste
- Vercel precision: restrained surfaces, crisp typography, polished chrome
- Apple restraint: premium, calm, and minimal without becoming sterile

Avoid:

- generic AI gradients
- cockpit-style developer clutter
- dense analytics dashboards
- neon cyber styling
- excessive cards and borders
- decorative motion that does not help the workflow
- default admin-template surfaces
- pill-shaped controls as the default button style
- handmade inline SVG icon sets
- mixed icon styles or inconsistent stroke weights
- status text that overflows narrow inspector panels
- badge-heavy source rows when plain text and dots are enough

## Core dashboard rule: no page scroll

The BuildFlow dashboard is a dashboard, not a scrolling website.

The main `/dashboard` page should fit within the viewport and should not require vertical page scrolling during normal use.

Rules:

- the whole dashboard page should use a fixed viewport layout
- primary content should be visible above the fold
- avoid long stacked sections that push the page downward
- use tabs, panels, drawers, side navigation, split panes, or modals when more information is needed
- scrolling is allowed inside contained panels only when necessary
- examples of acceptable internal scroll areas:
  - source list panel
  - activity/timeline panel
  - execution packet preview
  - advanced/debug drawer
  - full prompt preview
- the browser page itself should not become the main navigation mechanism

Implementation implication:

- prefer `h-screen`, `overflow-hidden`, and contained `overflow-auto` panel regions
- test at common laptop sizes, especially 1440×900 and 1366×768
- if content does not fit, reduce density or move secondary details behind progressive disclosure instead of adding page scroll

## Dashboard information hierarchy

The first screen should answer, in this order:

1. What is connected?
2. Is BuildFlow healthy?
3. What project or workspace am I in?
4. What plan or execution packet is active?
5. What should I do next?
6. What has already happened?
7. What can I inspect if I need more detail?

The user should not need to scan a wall of widgets to understand the next step.

## Primary dashboard layout

Recommended desktop layout:

1. Top bar
   - BuildFlow identity
   - current dashboard section
   - compact agent/source/write status
   - light/dark mode toggle
   - refresh and settings entry

2. Left rail or sidebar
   - Overview
   - Sources
   - Activity
   - Plans
   - Handoff
   - Settings
   - compact source/repo browser if space allows

3. Main panel
   - current build flow
   - active plan or execution packet
   - one primary next action
   - concise task progress

4. Right inspector panel
   - source/context health
   - agent health
   - latest event
   - prompt handoff shortcuts

5. Internal drawers/details
   - advanced debug state
   - raw paths
   - raw output
   - full packet preview
   - long prompt text

The default view should fit in one viewport without page scroll.

## BuildFlow Local scope

The public BuildFlow repo is Local-only.

Include:

- local source status
- connect/disconnect source entry points
- active context mode
- local agent health
- current plan or execution packet preview
- simple task status model
- next recommended action
- copy-ready Codex prompt
- copy-ready Claude Code prompt
- local timeline/checklist preview
- empty/loading/error/connected states

Do not include:

- managed product messaging
- cloud sync
- aggressive upsells
- future roadmap text that is not part of BuildFlow Local

## Visual principles

Use:

- high-quality spacing
- precise alignment
- restrained color
- strong text hierarchy
- subtle borders
- soft shadows only when useful
- status indicators that are easy to understand
- calm empty states
- crisp hover and focus states
- one consistent icon source or no icons at all
- small dots plus plain text for secondary state

Avoid:

- too many cards
- too many icons
- too many colors
- giant hero sections
- long marketing copy inside the dashboard
- gradients as the primary design language
- visual density that creates intimidation
- rounded-full buttons and chips unless they are tiny dots

## Typography

Typography should feel modern, precise, and readable.

Guidelines:

- use a clean sans-serif system or project-approved font stack
- prefer clear hierarchy over decorative typography
- keep body copy concise
- use sentence case for labels and headings
- avoid all-caps except for tiny status labels where useful
- use tabular numbers for counts, task progress, and status metrics if available

Suggested hierarchy:

- page title: calm and compact, not huge
- section titles: small but clear
- labels: muted and readable
- status values: visually stronger than labels
- helper text: short, plain language
