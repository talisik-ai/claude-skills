# prd-assessment v2 — Design Document

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Rewrite `packages/skills/prd-assessment/SKILL.md`

---

## Problem

The current `prd-assessment` skill is a PRD *writer* — it conducts an interview and creates a PRD from scratch. The workflow (`docs/claude-code-workflow.md`) uses `prd-assessment` as a PRD *impact assessor* — it reads an existing PRD + architecture files and outputs an `IMPACT-ASSESSMENT.md`. These are two different jobs. The current skill solves the wrong one.

Additionally, the workflow identifies Pivot as a special PRD type requiring extra handling (disabling stale skills, invalidating context MDs, flagging in-flight cards) that a generic assessment doesn't cover.

---

## Solution

Single `prd-assessment` SKILL.md with three auto-detected modes. No flags or commands — Claude detects mode from conversation context.

---

## Mode Detection

| Signal | Mode |
|--------|------|
| PRD file path provided + pivot/change/direction language | PIVOT |
| PRD file path provided, no pivot language | ASSESS |
| No file, new idea / "from scratch" / "new project" | CREATE |
| Ambiguous | Ask one clarifying question before proceeding |

---

## Mode 1 — CREATE

**Trigger:** "write a PRD", "new project", "start from scratch", "help me define this"

**Input:** Interview responses (no existing files needed)

**Process:** 4-round structured interview (Problem Space → Scope → Detail → Risk)

**Output:** Complete `PRD-XXX.md` with:
- Executive Summary
- Problem Statement (current state / desired state)
- Goals & Success Metrics table
- Scope (in / out / future)
- User Personas
- User Stories with Acceptance Criteria
- Technical Considerations
- Risks & Assumptions table
- Open Questions

**Rules:**
- Ask 2-3 questions per round, not all at once
- Keep interview conversational, not form-like
- Flag gaps or contradictions before generating the document
- Save as `.md` file if user provides a filename

---

## Mode 2 — ASSESS

**Trigger:** PRD file path provided, no pivot language

**Input:** PRD file + `ARCHITECTURE.md` + all context MDs in scope

**Pre-flight checks:**
- Warn if `ARCHITECTURE.md` is missing (assessment will be incomplete)
- Flag if PRD is missing acceptance criteria or scope boundary before proceeding

**Output:** `IMPACT-ASSESSMENT-PRD-XXX.md` with:

```
# Impact Assessment — PRD-XXX: [Title]

**Date:** [today]
**Lead:** [from context]
**PRD Type:** New Feature | Hotfix | Cross-Project

---

## Affected Modules
| Module | Owner | Impact Level | Action Required |
|--------|-------|--------------|-----------------|

## Context MDs to Update
| Context MD | Last Verified Sprint | Action |
|------------|---------------------|--------|

## Skills to Rebuild
- [skill name] — reason

## Estimated Jira Cards
| Role | Cards | Size |
|------|-------|------|

## Dependencies & Cross-Project Risks
| Risk | Severity | Notes |
|------|----------|-------|

## Open Questions
- [ ] [question]
```

---

## Mode 3 — PIVOT

**Trigger:** PRD file path provided + pivot/change/direction language

**Input:** New direction description + existing PRD + `ARCHITECTURE.md` + context MDs

**Output:** `IMPACT-ASSESSMENT-PRD-XXX.md` with all ASSESS sections **plus**:

```
## PIVOT — What Stays / What Changes / What Dies
| Area | Status | Notes |
|------|--------|-------|

## Skills to Disable Immediately
⚠️ Lead action required before next dev session:
- [skill name] — reason it conflicts with new direction

## Context MDs Now Invalidated
- [context MD] — what changed that makes it stale

## In-Flight Cards Affected
| Card | Status | Recommended Action |
|------|--------|-------------------|
| [card] | In Progress | Pause — scope changed |
| [card] | In Review | Cancel — direction invalidated |

## Cross-Project Ripple Risks
[HIGH/MEDIUM/LOW] — flagged HIGH if pivot touches shared modules (auth, design-system, etc.)
```

---

## Behavior Rules (all modes)

- Never guess the mode — ask one clarifying question if ambiguous
- Always check `ARCHITECTURE.md` exists before ASSESS/PIVOT; warn clearly if missing
- Flag incomplete PRDs (missing AC, no scope) before running assessment
- Save output files with PRD number in filename: `IMPACT-ASSESSMENT-PRD-042.md`
- Do not proceed to card estimation if scope is undefined

---

## Files Affected

| File | Action |
|------|--------|
| `packages/skills/prd-assessment/SKILL.md` | Full rewrite |
| `registry.json` | Update description + version to 2.0.0 |
