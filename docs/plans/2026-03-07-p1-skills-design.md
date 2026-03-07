# P1 Skills Design — card-generator, coding-standards, pre-review-checklist

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Create three new skill SKILL.md files + add entries to registry.json

---

## Context

These three skills cover Steps 4, 5, and 6 of the Claude Code Development Workflow (`docs/claude-code-workflow.md`):
- Step 4: Lead generates Jira cards from impact assessment → `card-generator`
- Step 5: Developer sessions load coding patterns → `coding-standards`
- Step 6: Review Buddy gates PRs before QA/Lead → `pre-review-checklist`

---

## Skill 1: `card-generator`

**File:** `packages/skills/card-generator/SKILL.md`
**Category:** product
**Tags:** jira, cards, planning, impact-assessment, workflow

### Purpose
Reads an `IMPACT-ASSESSMENT-PRD-XXX.md` and generates a complete Jira card list in Markdown, one card block per ticket, grouped by role.

### Input
User provides path to an impact assessment file (e.g., `docs/IMPACT-ASSESSMENT-PRD-042.md`).

### Pre-flight Checks
1. File exists — stop and ask if not found
2. Assessment has defined scope — warn if scope is undefined on any module before generating cards
3. No L/XL estimates — auto-split into S/M before output, note splits made

### Card Block Format

```
---
Card: [ROLE-NNN] [Descriptive Title]
PRD: PRD-XXX
Size: XS | S | M
Skill/Context: [skill-name] or [path/to/module.context.md]

Scope — MAY touch:
  - [exact/file/path.ts]
  - [exact/file/path.ts]

Do NOT touch:
  - [exact/file/path.ts]

Acceptance Criteria:
  - [ ] [verifiable, testable condition]
  - [ ] [verifiable, testable condition]

Log Fields (fill on card close):
  - AI-assisted: Y / N
  - Rework required: Y / N
  - Session count: ___
---
```

### Output Structure
Cards are grouped by role in this order: Frontend → Backend → QA → DevOps → Other.
Each group has a header. Total card count summary at the end.

### Behavior Rules
- Never generate a card without acceptance criteria — flag as incomplete and ask
- Never generate L/XL cards — split automatically, note each split
- Scope must list exact file paths, not directories — ask if assessment only lists modules
- Do-not-touch list is required on every card — derive from assessment's module boundaries if not explicit
- Save output as `CARDS-PRD-XXX.md` if user provides a filename

---

## Skill 2: `coding-standards`

**File:** `packages/skills/coding-standards/SKILL.md`
**Category:** engineering
**Tags:** standards, patterns, code-quality, frontend, backend, qa, ml

### Purpose
Template skill that enforces team coding patterns in every dev session. Ships with `[FILL IN]` placeholders — a Lead populates it once per project for their stack. Auto-loads in developer sessions to enforce consistency.

### Structure
Four role sections (FE, BE, ML/DC, QA), each with:
- Required Patterns — must use
- Anti-Patterns — never do
- File Structure Rules
- Do Not Do list

### Triggers
- Any dev session start
- "what's our pattern for X"
- "coding standards"
- "how should I structure this"

### Behavior Rules
- When a dev asks about a pattern, always answer from the standards first
- If a pattern isn't covered, flag it: "This isn't in coding-standards yet — recommend adding it after this session"
- Never approve a pattern that contradicts an Anti-Pattern entry
- Remind devs of relevant standards at session start if a module context MD is attached

### Template Placeholder Convention
All sections ship with:
```
[FILL IN — e.g., "Always use React Query for server state, never useState for fetched data"]
```
Leads replace placeholders before publishing the skill to the team.

---

## Skill 3: `pre-review-checklist`

**File:** `packages/skills/pre-review-checklist/SKILL.md`
**Category:** engineering
**Tags:** code-review, pr, quality-gate, review-buddy, workflow

### Purpose
Review Buddy (senior dev per role) runs this before any PR reaches QA or Lead. Provides a structured 5-check gate with pass/fail output and specific callouts on failure.

### Input
Review Buddy provides:
- The Jira card (pasted or file path) — for scope, do-not-touch, AC
- The PR diff or file list

### The 5 Checks (in order — stop on first failure)

1. **Scope compliance** — Did the PR only touch files listed in the card's "MAY touch" list?
2. **AC verifiability** — Is each acceptance criterion verifiable from the code (not just "looks implemented")?
3. **No do-not-touch violations** — Zero modifications to files on the "Do NOT touch" list?
4. **Schema compliance** — No schema/migration changes outside card scope?
5. **Pattern compliance** — Does the code match `coding-standards` patterns for this role?

### Output Format

**PASS:**
```
✅ REVIEW BUDDY: PASS
Card: [ROLE-NNN]
Reviewer: [name]
All 5 checks passed. Move to QA.
```

**FAIL:**
```
❌ REVIEW BUDDY: FAIL
Card: [ROLE-NNN]
Reviewer: [name]

Failing check: [Check N — Name]
Issue: [specific description]
File/Line: [exact location if applicable]
Required action: [what the developer must fix]

Return to developer. Do not move to QA.
```

### Role Awareness
- FE Buddy: checks FE section of coding-standards
- BE Buddy: checks BE section of coding-standards
- Buddy only checks patterns for their role — does not cross-review
- If no coding-standards skill is loaded, note it and skip check 5 with a warning

### Behavior Rules
- Always read the card first — never start checks without card context
- Stop at first failure — do not continue to remaining checks (return early)
- Be specific on failures — "file X was modified but not in scope" not "scope violation"
- Never approve a PR with a do-not-touch violation regardless of other checks
- Log result: Buddy fills `AI-assisted: Y` on card if this checklist was Claude-assisted

---

## Files to Create

| File | Action |
|------|--------|
| `packages/skills/card-generator/SKILL.md` | Create |
| `packages/skills/coding-standards/SKILL.md` | Create |
| `packages/skills/pre-review-checklist/SKILL.md` | Create |
| `registry.json` | Add 3 new entries |
