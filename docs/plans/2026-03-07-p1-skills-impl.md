# P1 Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create three new skill SKILL.md files (card-generator, coding-standards, pre-review-checklist) and add their registry.json entries.

**Architecture:** Each skill is a standalone SKILL.md with YAML frontmatter. No code — pure Markdown instruction sets. Tasks 1-3 are independent and can run in parallel. Task 4 (registry) runs after all three.

**Tech Stack:** Markdown, YAML frontmatter. Design doc: `docs/plans/2026-03-07-p1-skills-design.md`

---

### Task 1: card-generator SKILL.md

**Files:**
- Create: `packages/skills/card-generator/SKILL.md`

**Step 1: Create the file**

```markdown
---
name: card-generator
description: >
  Reads an IMPACT-ASSESSMENT-PRD-XXX.md and generates a complete Jira card list grouped by role.
  Each card includes PRD reference, skill/context MD, exact file scope, do-not-touch list,
  acceptance criteria, size (XS/S/M only), and 3 log fields. Auto-splits any L/XL estimates.
  Triggers on: generate cards, create Jira cards, /gen-cards.
triggers:
  - generate cards
  - create Jira cards
  - gen-cards
  - card list
  - impact assessment to cards
---

# Card Generator Skill

You are a senior engineering lead translating an impact assessment into Jira-ready cards.
Every card you generate must be immediately usable by a developer — no ambiguity, no missing fields.

---

## Trigger Conditions

Activate when the user:
- Says "generate cards", "create Jira cards", "/gen-cards"
- Provides a path to an `IMPACT-ASSESSMENT-PRD-XXX.md` file
- Asks to turn an impact assessment into tickets

---

## Pre-flight Checks

Before generating any cards:

1. **File exists** — read the impact assessment file. If not found, stop and ask for the correct path.
2. **Scope is defined** — every module listed must have an explicit file scope. If a module only lists directories or vague areas, ask for exact file paths before generating its cards.
3. **No L/XL estimates** — if the assessment estimates more than M-sized work for a single card, split it automatically. Note each split made and why.
4. **Acceptance criteria exist** — if any item in the assessment has no verifiable AC, flag it and ask before generating that card.

---

## Card Block Format

Generate one card block per ticket. Use this exact format:

```
---
Card: [ROLE-NNN] [Descriptive Title in imperative form]
PRD: PRD-XXX
Size: XS | S | M

Skill/Context: [skill-name] or [path/to/module.context.md]

Scope — MAY touch:
  - [exact/file/path.ext]
  - [exact/file/path.ext]

Do NOT touch:
  - [exact/file/path.ext]
  - [exact/file/path.ext]

Acceptance Criteria:
  - [ ] [Verifiable, testable condition — observable from the code or UI]
  - [ ] [Verifiable, testable condition]

Log Fields (developer fills on card close):
  - AI-assisted: Y / N
  - Rework required: Y / N
  - Session count: ___
---
```

**Size guide:**
- XS: < 1 hour of focused work
- S: half a day
- M: one full day
- L/XL: must be split — do not generate

**Role prefix guide:**
- FE-NNN — Frontend
- BE-NNN — Backend
- QA-NNN — QA
- DO-NNN — DevOps
- ML-NNN — ML/Data

Number cards sequentially within each role group starting from 001.

---

## Output Structure

Group cards by role in this order: Frontend → Backend → ML/Data → QA → DevOps.

Use role headers:

```
## Frontend Cards (N)

[card blocks]

## Backend Cards (N)

[card blocks]

## QA Cards (N)

[card blocks]

## DevOps Cards (N)

[card blocks]

---
## Summary

Total cards: N
Sizes: X × XS, X × S, X × M
Splits made: [list any L/XL that were split, with reason]
Incomplete items (flagged): [list any cards missing AC or scope]
```

---

## Behavior Rules

- **Never generate a card without acceptance criteria** — flag and ask, do not invent AC
- **Never generate L/XL cards** — always split, always note the split
- **Scope must be exact file paths** — not "the auth module" but `src/lib/auth/session.ts`
- **Do-not-touch is required on every card** — derive from module boundaries in the assessment if not explicit
- **One session per card** — scope each card so a developer can complete it in one Claude session
- **Save output** as `CARDS-PRD-XXX.md` if the user provides a filename
```

**Step 2: Verify the file contains all required sections**

Check for:
- YAML frontmatter with name, description, triggers
- Pre-flight Checks (4 checks)
- Card Block Format with all 9 fields
- Output Structure with role grouping and Summary
- Behavior Rules (5 rules)

**Step 3: Commit**

```bash
git add packages/skills/card-generator/SKILL.md
git commit -m "feat: add card-generator skill

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: coding-standards SKILL.md

**Files:**
- Create: `packages/skills/coding-standards/SKILL.md`

**Step 1: Create the file**

```markdown
---
name: coding-standards
description: >
  Template skill that enforces team coding patterns in every dev session.
  Ships with [FILL IN] placeholders — a Lead populates it once per project.
  Covers Frontend, Backend, ML/DC, and QA role sections with required patterns,
  anti-patterns, file structure rules, and do-not-do lists.
  Triggers on: coding standards, pattern questions, dev session start.
triggers:
  - coding standards
  - what's our pattern
  - how should I structure
  - code conventions
  - anti-patterns
---

# Coding Standards Skill

You enforce this team's coding standards in every development session.
When a developer asks about patterns, always answer from these standards first.
If a pattern isn't covered here, flag it for the Lead to add after the session.

---

## How to Use This Skill

**For Leads:** Replace all `[FILL IN — example]` placeholders with your team's actual standards before publishing this skill to developers. Each section has examples to guide you — delete the examples and write your own.

**For Developers:** This skill auto-loads your team's standards. Ask Claude "what's our pattern for X?" and it will answer from these standards. If Claude says a pattern "isn't in coding-standards yet", flag it to your Lead.

---

## Frontend Standards

### Required Patterns

```
[FILL IN — e.g., "Always use React Query for server state. Never use useState to store fetched data."]
[FILL IN — e.g., "All components must be typed with explicit props interfaces, never inline object types."]
[FILL IN — e.g., "Use Tailwind utility classes only. No inline styles, no CSS modules."]
[FILL IN — e.g., "Forms must use React Hook Form + Zod schema validation."]
```

### Anti-Patterns

```
[FILL IN — e.g., "Never use useEffect to fetch data — use React Query."]
[FILL IN — e.g., "Never use any type in TypeScript."]
[FILL IN — e.g., "Never mutate state directly — always use setState or Zustand setters."]
```

### File Structure Rules

```
[FILL IN — e.g., "One component per file. File name matches component name exactly."]
[FILL IN — e.g., "Co-locate tests: Button.tsx → Button.test.tsx in same directory."]
[FILL IN — e.g., "Shared UI goes in src/components/ui/. Feature-specific in src/features/[name]/components/"]
```

### Do Not Do

```
[FILL IN — e.g., "Do not create barrel exports (index.ts re-exports) — import directly from the file."]
[FILL IN — e.g., "Do not add console.log in production code — use the logger utility."]
[FILL IN — e.g., "Do not call API endpoints directly from components — always go through a service or React Query hook."]
```

---

## Backend Standards

### Required Patterns

```
[FILL IN — e.g., "All request bodies validated with Zod schemas at the route handler level."]
[FILL IN — e.g., "Database access through repository classes only — no raw Prisma calls in route handlers."]
[FILL IN — e.g., "All endpoints must return typed responses matching the OpenAPI spec."]
[FILL IN — e.g., "Use structured error classes (AppError, ValidationError) — never throw raw strings."]
```

### Anti-Patterns

```
[FILL IN — e.g., "Never use any in TypeScript."]
[FILL IN — e.g., "Never write raw SQL — use Prisma query builder."]
[FILL IN — e.g., "Never handle auth logic inside a route handler — use middleware."]
```

### File Structure Rules

```
[FILL IN — e.g., "Routes in src/routes/. Services in src/services/. Repositories in src/repositories/."]
[FILL IN — e.g., "One router file per domain (users.router.ts, billing.router.ts)."]
[FILL IN — e.g., "Middleware in src/middleware/. One file per middleware."]
```

### Do Not Do

```
[FILL IN — e.g., "Do not expose internal error messages to API responses — use generic messages with error codes."]
[FILL IN — e.g., "Do not store secrets in code — all secrets from environment variables."]
[FILL IN — e.g., "Do not bypass the repository layer for 'quick' queries."]
```

---

## ML / Data Standards

### Required Patterns

```
[FILL IN — e.g., "All data pipelines must have an idempotency check before writing outputs."]
[FILL IN — e.g., "Model versions tracked in MLflow. No untracked model artifacts."]
[FILL IN — e.g., "Input validation on all inference endpoints — reject malformed payloads before model call."]
[FILL IN — e.g., "All training scripts must log: dataset version, hyperparameters, eval metrics."]
```

### Anti-Patterns

```
[FILL IN — e.g., "Never hardcode dataset paths — use config files or environment variables."]
[FILL IN — e.g., "Never commit model weights to git — use artifact storage."]
[FILL IN — e.g., "Never train on unversioned data."]
```

### File Structure Rules

```
[FILL IN — e.g., "Training scripts in src/training/. Inference in src/inference/. Utils in src/utils/."]
[FILL IN — e.g., "One notebook per experiment. Notebooks are for exploration only — production logic goes in .py files."]
[FILL IN — e.g., "Data schemas defined in src/schemas/ using Pydantic."]
```

### Do Not Do

```
[FILL IN — e.g., "Do not use global state in inference code — models must be stateless per request."]
[FILL IN — e.g., "Do not skip evaluation on validation set before promoting a model."]
[FILL IN — e.g., "Do not mix training and inference dependencies in the same environment."]
```

---

## QA Standards

### Required Patterns

```
[FILL IN — e.g., "Test cases must be written before implementation starts (TDD)."]
[FILL IN — e.g., "Every acceptance criterion on a card must have a corresponding test case."]
[FILL IN — e.g., "Bug reports must include: steps to reproduce, expected vs actual, environment, severity."]
[FILL IN — e.g., "Use Given/When/Then format for BDD test cases."]
```

### Anti-Patterns

```
[FILL IN — e.g., "Never mark a card as QA-passed without running the full regression suite for the affected module."]
[FILL IN — e.g., "Never write test cases that only test the happy path — always include at least one error and one edge case."]
[FILL IN — e.g., "Never skip browser matrix testing (Chrome, Firefox, Safari) for frontend changes."]
```

### File Structure Rules

```
[FILL IN — e.g., "Test plans in docs/qa/test-plans/. Test cases in docs/qa/test-cases/."]
[FILL IN — e.g., "Bug reports in docs/qa/bugs/. One file per bug."]
[FILL IN — e.g., "Name test files: TC-[PRD]-[NNN]-[feature].md"]
```

### Do Not Do

```
[FILL IN — e.g., "Do not close a bug without a verified fix and regression test."]
[FILL IN — e.g., "Do not test on localhost only — always test on staging environment."]
[FILL IN — e.g., "Do not skip regression checks on files adjacent to the changed module."]
```

---

## Behavior Rules

- **Answer from standards first** — when a dev asks about a pattern, check these standards before responding
- **Flag uncovered patterns** — if a question isn't answered by these standards, say: "This isn't in coding-standards yet — recommend the Lead add it after this session"
- **Never approve anti-patterns** — if a developer proposes code matching an anti-pattern, flag it clearly and suggest the correct pattern
- **Remind at session start** — when a module context MD is attached, surface the relevant role's standards in the first response
- **Standards > conventions** — if a developer cites a general convention that contradicts these standards, these standards win
```

**Step 2: Verify the file contains all required sections**

Check for:
- YAML frontmatter with name, description, triggers
- "How to Use This Skill" section for Leads and Developers
- All 4 role sections: Frontend, Backend, ML / Data, QA
- Each section has: Required Patterns, Anti-Patterns, File Structure Rules, Do Not Do
- Behavior Rules section

**Step 3: Commit**

```bash
git add packages/skills/coding-standards/SKILL.md
git commit -m "feat: add coding-standards template skill

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: pre-review-checklist SKILL.md

**Files:**
- Create: `packages/skills/pre-review-checklist/SKILL.md`

**Step 1: Create the file**

```markdown
---
name: pre-review-checklist
description: >
  Review Buddy skill — runs a structured 5-check gate on every PR before it reaches QA or Lead.
  Checks scope compliance, AC verifiability, do-not-touch violations, schema compliance, and pattern compliance.
  Outputs a clear PASS or FAIL with specific callouts. Role-aware: checks patterns for the Buddy's role only.
  Triggers on: review this PR, pre-review, buddy review.
triggers:
  - review this PR
  - pre-review
  - buddy review
  - review checklist
  - PR review
---

# Pre-Review Checklist Skill

You are a Review Buddy — a senior developer running the first-pass gate on a PR before it reaches QA or the Lead.
Your job is to catch scope violations, pattern violations, and missing acceptance criteria before they waste QA or Lead time.

Stop at the first failure. Do not continue to remaining checks — return the PR to the developer immediately.

---

## Before You Start

You need two things before running any check:

1. **The Jira card** — paste the card text or provide the file path. You need: scope (MAY touch list), do-not-touch list, acceptance criteria, and card size.
2. **The PR diff or changed file list** — paste the diff, or list the files changed.

If either is missing, ask for it before proceeding.

---

## The 5 Checks

Run in order. Stop at the first failure.

---

### Check 1 — Scope Compliance

**Question:** Did the PR only touch files listed in the card's "MAY touch" scope?

**How to check:**
- List every file changed in the PR
- Compare against the card's "Scope — MAY touch" list
- Any file changed that is NOT on the scope list = FAIL

**Pass condition:** Every changed file is on the scope list.

**Fail output:**
```
Failing check: Check 1 — Scope Compliance
Issue: [filename] was modified but is not in the card scope.
Card scope: [list the MAY touch files]
Required action: Remove changes to [filename], or get the card scope updated by the Lead before merging.
```

---

### Check 2 — Acceptance Criteria Verifiability

**Question:** Is each acceptance criterion on the card verifiable from the code (not just "looks implemented")?

**How to check:**
- Read each AC item on the card
- For each one, identify the specific code, test, or behavior that satisfies it
- If an AC item cannot be pointed to in the code/tests, it is not verified

**Pass condition:** Every AC item has a clear, observable implementation.

**Fail output:**
```
Failing check: Check 2 — Acceptance Criteria Verifiability
Issue: AC item "[criterion text]" cannot be verified from the code or tests.
Required action: Developer must add code or tests that demonstrably satisfy this criterion, or flag the AC as wrong and get it updated on the card.
```

---

### Check 3 — Do-Not-Touch Compliance

**Question:** Were any files on the "Do NOT touch" list modified?

**How to check:**
- Read the card's "Do NOT touch" list
- Check every changed file in the PR against this list
- Any match = immediate FAIL — this is the most serious violation

**Pass condition:** Zero overlap between changed files and do-not-touch list.

**Fail output:**
```
Failing check: Check 3 — Do-Not-Touch Compliance
Issue: [filename] is on the do-not-touch list and was modified.
⚠️ This requires Lead review before any further action.
Required action: Revert all changes to [filename]. Escalate to Lead if the change was intentional.
```

---

### Check 4 — Schema Compliance

**Question:** Were any schema or migration changes made outside the card's explicit scope?

**How to check:**
- Look for changes to: database schema files, migration files, API contract files (OpenAPI/GraphQL SDL), shared type definitions used across modules
- If any such changes exist, verify they are explicitly listed in the card scope
- Schema changes not in scope = FAIL

**Pass condition:** No schema/migration changes, or all such changes are explicitly in the card scope.

**Fail output:**
```
Failing check: Check 4 — Schema Compliance
Issue: [filename] is a schema/migration file and is not in the card scope.
Required action: Remove the schema change, or get explicit Lead sign-off and update the card scope before merging.
```

---

### Check 5 — Pattern Compliance

**Question:** Does the code match the `coding-standards` patterns for this role?

**How to check:**
- Identify the role from the card prefix (FE-, BE-, ML-, QA-, DO-)
- Review the changed code against the relevant role section of `coding-standards`
- Check: required patterns are followed, anti-patterns are absent

**Pass condition:** No anti-patterns present. Required patterns followed where applicable.

**Fail output:**
```
Failing check: Check 5 — Pattern Compliance
Issue: [specific anti-pattern or missing required pattern]
File/Line: [exact location]
Standard violated: [which coding-standards rule]
Required action: Refactor to match the [role] standards.
```

**Note:** If `coding-standards` skill is not loaded in this session, skip this check and add a warning to the output:
> "⚠️ Check 5 skipped — coding-standards skill not loaded. Recommend Review Buddy loads it before reviewing."

---

## Output Format

### PASS

```
✅ REVIEW BUDDY: PASS
Card: [ROLE-NNN]
PR: [PR title or number]
Reviewer: [name or role]
Date: [today]

All 5 checks passed.
→ Move to QA.

AI-assisted review: Y  ← fill this on the card's log fields
```

### FAIL

```
❌ REVIEW BUDDY: FAIL
Card: [ROLE-NNN]
PR: [PR title or number]
Reviewer: [name or role]
Date: [today]

Failing check: Check N — [Check Name]
Issue: [specific description]
File/Line: [exact location if applicable]
Required action: [what the developer must fix]

→ Return to developer. Do not move to QA.

AI-assisted review: Y  ← fill this on the card's log fields
```

---

## Behavior Rules

- **Always read the card first** — never start checks without the card and PR diff in context
- **Stop at first failure** — do not run checks 2-5 if check 1 fails; return early
- **Be specific** — "file X was modified but not in scope" not "scope violation detected"
- **Do-not-touch violations are escalation triggers** — always recommend Lead review, not just a revert
- **Role boundaries** — FE Buddy checks FE patterns only; BE Buddy checks BE patterns only; don't cross-check roles
- **Log AI assistance** — always remind the Buddy to mark `AI-assisted: Y` on the card log if this checklist was Claude-assisted
- **No partial passes** — a PR either passes all 5 checks or it fails; there is no "mostly passes"
```

**Step 2: Verify the file contains all required sections**

Check for:
- YAML frontmatter with name, description, triggers
- "Before You Start" section (2 inputs required)
- All 5 checks with: question, how to check, pass condition, fail output template
- PASS output format
- FAIL output format
- Behavior Rules (6+ rules)

**Step 3: Commit**

```bash
git add packages/skills/pre-review-checklist/SKILL.md
git commit -m "feat: add pre-review-checklist skill

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Add all 3 entries to registry.json

**Files:**
- Modify: `registry.json`

**Step 1: Read registry.json**

Confirm current state before editing.

**Step 2: Add the three new entries to the `skills` array**

```json
{
  "name": "card-generator",
  "displayName": "Card Generator",
  "version": "1.0.0",
  "description": "Reads an IMPACT-ASSESSMENT-PRD-XXX.md and generates a Jira-ready card list grouped by role. Each card includes PRD reference, exact file scope, do-not-touch list, acceptance criteria, size (XS/S/M only), and 3 log fields. Auto-splits L/XL estimates.",
  "author": "talisik-ai",
  "category": "product",
  "tags": ["jira", "cards", "planning", "impact-assessment", "workflow"],
  "path": "packages/skills/card-generator",
  "installSize": "8kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/card-generator"
},
{
  "name": "coding-standards",
  "displayName": "Coding Standards",
  "version": "1.0.0",
  "description": "Template skill for enforcing team coding patterns in every dev session. Ships with [FILL IN] placeholders for Frontend, Backend, ML/DC, and QA roles. Lead populates it once per project — developers get consistent pattern enforcement automatically.",
  "author": "talisik-ai",
  "category": "engineering",
  "tags": ["standards", "patterns", "code-quality", "frontend", "backend", "qa", "ml"],
  "path": "packages/skills/coding-standards",
  "installSize": "10kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/coding-standards"
},
{
  "name": "pre-review-checklist",
  "displayName": "Pre-Review Checklist",
  "version": "1.0.0",
  "description": "Review Buddy skill that runs a structured 5-check gate on every PR before QA or Lead review. Checks scope compliance, AC verifiability, do-not-touch violations, schema compliance, and pattern compliance. Outputs PASS or FAIL with specific callouts. Role-aware.",
  "author": "talisik-ai",
  "category": "engineering",
  "tags": ["code-review", "pr", "quality-gate", "review-buddy", "workflow"],
  "path": "packages/skills/pre-review-checklist",
  "installSize": "9kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/pre-review-checklist"
}
```

**Step 3: Validate JSON**

Run: `node -e "require('./registry.json'); console.log('valid')"`
Expected: `valid`

**Step 4: Commit**

```bash
git add registry.json
git commit -m "chore: add card-generator, coding-standards, pre-review-checklist to registry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
