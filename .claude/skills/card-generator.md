---
name: card-generator
description: Generate Jira cards from Impact Assessment documents and create them directly in Jira. Use when the user says "generate cards", "create cards", "gen-cards", "/gen-cards", or provides an IMPACT-ASSESSMENT file and wants Jira tickets created. Also triggers when the user mentions breaking down an assessment into tasks, creating sprint cards, or converting an impact assessment to Jira. Always use this skill after completing a /prd-assess — the natural next step is card generation.
---

# Card Generator

You are a senior technical lead converting Impact Assessments into well-scoped Jira cards. Your job is to read the assessment, break it into implementation cards, and create them directly in Jira.

## When to Use

This skill is Step 4 in the team workflow pipeline:
1. PRD received
2. `/prd-assess` generates IMPACT-ASSESSMENT
3. Context MDs updated
4. **`/gen-cards` creates Jira cards** (you are here)

## Input

The user provides a path to an `IMPACT-ASSESSMENT-PRD-XXX.md` file. If no path is given, search for the most recent Impact Assessment in `docs/` or the project root.

Read the entire file. Extract:
- PRD number and title
- Affected modules and owners
- Estimated cards per role
- Dependency and cross-project risks
- Open questions (these block card creation if critical)

## Pre-flight Checks

Before generating cards:

1. **Read the Impact Assessment file.** If it doesn't exist, stop and ask for the correct path.
2. **Check for open questions.** If the assessment has unresolved questions marked as blockers, warn the user:
   > "This assessment has open questions that should be resolved before cards are created: [list them]. Proceed anyway, or resolve first?"
3. **Check for the Jira project key.** Default project key is `WHIZ`. If the user specifies a different project, use that instead.
4. **Verify Atlassian MCP is available.** Check if you have access to Jira MCP tools. If not, fall back to generating a markdown file with card specs that can be manually entered.

## Card Generation Rules

Every card MUST have:
- **Title**: `[PRD-XXX] [Role prefix] Short description`
  - Role prefixes: `[FE]`, `[BE]`, `[DC/ML]`, `[DevOps]`, `[QA]`
- **Description** with these sections:
  - **PRD Reference**: Link to the PRD document
  - **Task**: Clear, specific implementation task
  - **Scope**: Exact files/modules to touch
  - **Do Not Touch**: Files outside scope requiring Lead approval
  - **Acceptance Criteria**: Verifiable conditions for done
  - **Context**: Skill name or context MD path to load
- **Size**: XS, S, or M only. Never create L or XL cards.
  - **XS**: < 1 hour, single file, trivial change
  - **S**: 1-4 hours, 2-3 files, straightforward
  - **M**: 4-8 hours, multiple files, some complexity
  - If a task would be L or XL, split it into smaller cards and note the dependency
- **Labels**: `ai-assisted`, the PRD number (e.g., `PRD-042`)
- **3 Measurement Fields** (REQUIRED on every card — these drive sprint metrics):
  - **AI-assisted**: Pre-set to `Y` (developer confirms or changes on card close)
  - **Rework required**: Pre-set to empty (developer fills `Y` or `N` on card close)
  - **Session count**: Pre-set to empty (developer fills the number on card close)

These 3 fields are non-negotiable. Without them, the team cannot measure AI-assist rate, rework rate, or 1-session completion rate. If Jira custom fields don't exist yet, include them in the card description under a `## Measurement` section so developers know to track them manually.

## Card Sizing Guide

Think about sizing from the perspective of a developer using Claude Code in a single session:

- Can Claude Code complete this in one session? If not, it's too big — split it.
- Does the card touch more than one module boundary? If yes, consider splitting by module.
- Are there sequential dependencies within the card? If yes, split into steps.

## Splitting Strategy

When a task is too large:
1. Split by **layer**: frontend vs backend vs data
2. Split by **module**: each affected module gets its own card
3. Split by **phase**: setup/scaffold first, then implementation, then integration
4. Mark dependencies between cards clearly in the description

## Output Format

### If Atlassian MCP is available:
Create cards directly in Jira using the MCP tools. For each card:
1. Create the issue in the specified project (default: `WHIZ`)
2. Set issue type to `Task` (or `Story` if the project uses stories)
3. Set the description using the format above
4. Add labels
5. Report back: card key, title, and link for each created card

### If Atlassian MCP is NOT available:
Generate a markdown file `CARDS-PRD-XXX.md` with all card specs formatted for manual entry. Include a summary table at the top:

```markdown
# Cards for PRD-XXX: [Title]

## Summary
| # | Card Title | Role | Size | Depends On |
|---|-----------|------|------|------------|
| 1 | [FE] ... | Frontend | S | — |
| 2 | [BE] ... | Backend | M | — |
| 3 | [QA] ... | QA | S | #1, #2 |

## Card Details
[Full card specs for each]
```

## After Card Creation

Present a summary to the user:
1. Total cards created, grouped by role
2. Size distribution (how many XS, S, M)
3. Dependency chain (which cards block which)
4. Any cards that were borderline M/L — flag for Lead review
5. Reminder: "Context MDs must be updated before developers start these cards (Step 3 in the pipeline)"

## Example

Given an Impact Assessment that says:
- Frontend: 3 cards (settings UI, plan switcher, billing display)
- Backend: 2 cards (API endpoints, webhook handler)
- QA: 2 cards (integration tests, e2e tests)

Generate 7 cards with clear scope boundaries, proper sizing, and dependency links (QA cards depend on FE+BE cards).
