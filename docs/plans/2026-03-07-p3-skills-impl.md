# P3 Skills Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create two new SKILL.md files (`context-audit` and `devops-infra`) and add their entries to `registry.json`.

**Architecture:** Each skill is a single SKILL.md with YAML frontmatter (name, description, triggers) and Markdown body. No code — pure content files. Registry.json gets two new objects appended to the `skills` array.

**Tech Stack:** Markdown, YAML frontmatter. No build step.

**Design doc:** `docs/plans/2026-03-07-p3-skills-design.md`

---

### Task 1: Create `context-audit` SKILL.md

**Files:**
- Create: `packages/skills/context-audit/SKILL.md`

**Step 1: Create the directory**

Run: `mkdir -p packages/skills/context-audit`
Expected: directory created, no output

**Step 2: Write the file**

Write the following complete content to `packages/skills/context-audit/SKILL.md`:

```markdown
---
name: context-audit
description: >
  Lead skill for sprint-start context health checks. Reads a module's context MD
  and compares it against the actual files in the repo. Flags missing files, untracked
  new files, dependency drift, pattern drift, and staleness. Outputs a structured audit
  report with CLEAN / STALE / OUTDATED status and a copy-paste ready CONTEXT-HEALTH.md row.
triggers:
  - context-audit
  - audit context
  - context health
  - sprint start audit
  - /context-audit
  - stale context
  - context health check
---

# Context Audit Skill

You are the Lead's sprint-start audit tool. Your job is to compare a module's context MD against the actual codebase and surface every divergence — nothing slips past you.

Run this at the start of every sprint, for every module that will be touched. A stale context MD loaded into a developer session is worse than no context MD at all.

---

## Input

The user provides a module name or context MD path. Examples:
- `auth` → resolve to `docs/context/auth.context.md`
- `docs/context/billing.context.md` → use directly
- `auth.context.md` → use directly

**Resolution order (try in sequence until found):**
1. `docs/context/[module].context.md`
2. `[module].context.md`
3. `docs/[module].context.md`

If none found, stop: "Context MD not found. Please provide the exact file path."

---

## Pre-flight Checks

Before running the audit:

1. **Confirm context MD exists** — if not found after resolution, stop and ask.
2. **Confirm module directory exists** — warn if it can't be determined from "Key Files" paths.
3. **Check for `CONTEXT-HEALTH.md`** in project root — if missing, note it at the end and offer a starter template.

---

## The 5 Checks

Run all 5 checks. Do not stop at the first failure — collect all findings, then produce the report.

### Check 1 — Missing Files

Read every file listed under "## Key Files" in the context MD.
For each: does the file exist in the repo?

Flag any that are missing. These were once key files and have been deleted, renamed, or moved — the context MD doesn't know yet.

### Check 2 — Untracked Files

Read the module directory (infer it from the directory prefix of "Key Files" entries).
List all `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.go`, `.java`, `.rs` files in the module.
Exclude: `*.test.*`, `*.spec.*`, `__tests__/`, `dist/`, `build/`, `.d.ts`.

Flag any file not listed in "Key Files". New significant files suggest the module has grown beyond what the context MD documents.

### Check 3 — Dependency Drift

Read the import statements in each "Key Files" entry that exists.
Cross-reference against the "## Dependencies" section of the context MD.

Flag any package or internal module that appears in imports but is not listed in "Dependencies". This indicates the module now relies on something the context MD doesn't mention.

### Check 4 — Pattern Drift

Read the "## Required Patterns" section of the context MD.
Scan the actual module files for evidence of each pattern.

Examples:
- Pattern says "always use React Query" → look for `useQuery`/`useMutation` imports
- Pattern says "use Zod for validation" → look for `z.` or `import { z }`
- Pattern says "repository layer only" → look for direct Prisma calls in route files

Flag patterns that are listed as required but show no evidence of use in the actual code. Note this is best-effort — add "limited scan" disclaimer if the module is large (10+ files).

### Check 5 — Staleness

Read the `last_verified_sprint` field from the context MD frontmatter or header.
Compare to the current sprint (ask the user for the current sprint if not provided in the conversation).

- Same sprint → PASS
- 1 sprint old → PASS with note
- 2+ sprints old → FAIL — flag exact gap

---

## Output Format

```
## Context Audit — [module-name].context.md
Audited: [today's date]
Sprint: [current sprint, or "unknown — please specify"]

**Status: CLEAN ✅ / STALE ⚠️ / OUTDATED ❌**

---

### Check 1 — Missing Files
[PASS ✅ / FAIL ❌]
[If FAIL:]
  - `[path/to/file.ts]` — listed in Key Files, not found in repo

### Check 2 — Untracked Files
[PASS ✅ / FAIL ❌]
[If FAIL:]
  - `[path/to/new-file.ts]` — found in module, not listed in Key Files

### Check 3 — Dependency Drift
[PASS ✅ / FAIL ❌]
[If FAIL:]
  - `[package-name]` — imported in [file.ts] but not listed in Dependencies

### Check 4 — Pattern Drift
[PASS ✅ / FAIL ❌ / LIMITED ⚠️]
[If FAIL:]
  - "[pattern name]" — listed as required, no evidence found in module files
[If LIMITED:]
  - Scan was limited (large module). Manual verification recommended.

### Check 5 — Staleness
[PASS ✅ / FAIL ❌]
[If FAIL:]
  - last_verified_sprint: Sprint-XX ([N] sprints ago) — update required

---

### Summary

**Required actions before this context MD is used in a session:**
- [ ] [specific section to update]
- [ ] [specific file to add/remove from Key Files]
- [ ] [specific dependency to add]
- [ ] Update last_verified_sprint to [current sprint]

---

### CONTEXT-HEALTH.md Row (copy-paste ready)

| [module] | [module].context.md | [current sprint] | [owner from MD] | [status emoji] [CLEAN/STALE/OUTDATED] |
```

---

## Status Definitions

| Status | Condition |
|--------|-----------|
| **CLEAN ✅** | All 5 checks pass |
| **STALE ⚠️** | 1-2 checks fail (update before next developer session) |
| **OUTDATED ❌** | 3+ checks fail (do not use as session context until fully updated) |

---

## Behavior Rules

- **Never report CLEAN if any check fails** — even one failure is STALE minimum
- **Never guess the module path** — if resolution fails, stop and ask
- **Always provide the CONTEXT-HEALTH.md row** — copy-paste ready, even on CLEAN audits
- **Check 4 is best-effort** — if the module has 10+ files, add "(limited scan)" to the check result
- **One module per audit run** — do not batch across modules in a single session
- **If `CONTEXT-HEALTH.md` is missing**, output a starter template at the end:

```markdown
# CONTEXT-HEALTH.md — [Project Name]
Last reviewed: [current sprint]

| Module | Context MD | Last Verified | Owner | Status |
|--------|-----------|---------------|-------|--------|
| [module] | [module].context.md | [current sprint] | [owner] | [status] |
```
```

**Step 3: Verify the file**

Check the file starts with the correct frontmatter and contains:
- `## Input` section
- `## The 5 Checks` section with all 5 checks
- `## Output Format` with the complete template
- `## Status Definitions` table
- `## Behavior Rules`

Run: `head -20 packages/skills/context-audit/SKILL.md`
Expected: YAML frontmatter with `name: context-audit`

**Step 4: Commit**

```bash
git add packages/skills/context-audit/SKILL.md
git commit -m "feat: add context-audit skill (sprint-start context health check)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 2: Create `devops-infra` SKILL.md

**Files:**
- Create: `packages/skills/devops-infra/SKILL.md`

**Step 1: Create the directory**

Run: `mkdir -p packages/skills/devops-infra`
Expected: directory created, no output

**Step 2: Write the file**

Write the following complete content to `packages/skills/devops-infra/SKILL.md`:

```markdown
---
name: devops-infra
description: >
  DevOps role skill covering the full deployment cycle: deployment protocol step sequence,
  pre-deploy checklist, 30-min post-deploy Sentry monitoring, deployment changelog per PRD number,
  CI/CD pipeline conventions for self-hosted infrastructure, and rollback protocol with decision
  criteria. Required for every production deployment.
triggers:
  - deploy
  - deployment
  - CI/CD
  - Sentry
  - infrastructure
  - rollback
  - devops
  - smoke test
  - prod
  - staging
  - pipeline
  - release
---

# DevOps Infra Skill

You are the DevOps engineer's deployment guide. Every production deployment follows the same protocol. No steps are skippable. No orphan deploys (deploy without a PRD reference). No direct SSH to production.

---

## Section 1 — Deployment Protocol

Every deployment follows this exact sequence. Do not promote to the next step until the current step is confirmed.

```
1. CI passes on the merge commit (all checks green)
   ↓
2. Deploy to staging
   ↓
3. Run smoke test on staging (key flows for the PRD being deployed)
   ↓
4. Confirm no open P0/P1 Sentry alerts in affected module
   ↓
5. Deploy to production
   ↓
6. Start 30-min Sentry watch (see Section 3)
   ↓
7. Log deployment in changelog (see Section 4)
```

**Never skip staging.** If asked to deploy directly to production, refuse:
> "Direct prod deploys are not permitted. Deploy to staging first, run smoke test, then promote."

---

## Section 2 — Pre-Deploy Checklist

Run this before every production deployment. All items must be confirmed.

```
[ ] CI: all checks green on the merge commit (lint, tests, build)
[ ] Staging: deployed and smoke-tested (not just deployed — tested)
[ ] Sentry: no unresolved P0/P1 alerts in the affected module
[ ] PRD: this deployment is linked to a card number (no orphan deploys)
[ ] Secrets: all required environment variables confirmed present in prod environment
[ ] Rollback: previous stable build is tagged and accessible
```

If any item is unchecked, do not deploy. Flag the blocker and wait.

**Secrets check:**
- No secrets in pipeline YAML — all values from vault or secrets manager
- Confirm required env vars exist in the target environment before deployment starts
- A missing env var that surfaces post-deploy is a P0 — treat it like one

---

## Section 3 — Post-Deploy Monitoring (30-min Watch)

Start the watch immediately after production deployment completes.

**Watch duration:** 30 minutes
**Watch scope:** Sentry project(s) for the affected module(s)

### Error Thresholds

| Sentry Result | Action |
|---------------|--------|
| 0 new errors | Stable — log and close the watch |
| 1-3 new, non-blocking | Degraded — create Sentry issue, continue monitoring, log as Degraded |
| P0/P1 error appears | Rollback immediately — do not wait for 30 min (see Section 6) |
| Error rate doubles vs baseline | Rollback immediately |

**What counts as "new":** An error that did not exist in Sentry before this deployment, or an existing error whose occurrence rate has significantly increased.

**Establishing baseline:** Before deploying, note the current error rate in the affected module. This is your comparison point during the watch.

**After 30 min with no P0/P1:** Deployment is confirmed stable. Log result in changelog.

---

## Section 4 — Deployment Changelog

Every deployment must be logged. Maintain the changelog in `docs/deploy-log.md` (create it if it doesn't exist).

### Entry Format

```markdown
| Date | PRD | Version | Deployed By | Environment | Status | Sentry Result | Notes |
|------|-----|---------|-------------|-------------|--------|---------------|-------|
| 2026-03-07 | PRD-042 | v1.4.2 | [name] | prod | Stable | Clean (0 new) | — |
| 2026-03-07 | PRD-042 | v1.4.1 | [name] | staging | Rollback | P0: auth error | reverted, PRD-042 blocked |
```

### Field Definitions

| Field | Values |
|-------|--------|
| Status | `Stable` / `Degraded` / `Rollback` |
| Sentry Result | `Clean (0 new)` / `Degraded (N new, non-blocking)` / `P0: [brief description]` |

### Rules

- **Never create a changelog entry without a PRD number** — ask for it if not provided
- Log both staging and production deployments
- Log rollbacks with reason in the Notes field
- Rollbacks always have Status: `Rollback` — never mark a rollback as Stable

### If `docs/deploy-log.md` doesn't exist

Create it with this starter:

```markdown
# Deployment Log

| Date | PRD | Version | Deployed By | Environment | Status | Sentry Result | Notes |
|------|-----|---------|-------------|-------------|--------|---------------|-------|
```

---

## Section 5 — CI/CD Patterns

Conventions for self-hosted infrastructure.

**Environment promotion:** dev → staging → prod. Never skip staging. Never deploy a branch directly to prod.

**Build tagging:** Every build artifact is tagged with `[version]-[PRD-number]-[short-commit-sha]`.
Example: `v1.4.2-PRD042-a3f9c12`

**Secrets management:**
- All secrets from vault or environment secrets manager
- Never in pipeline YAML, never in `.env` committed to repo
- Pipeline has read access to secrets at deploy time only — no broad permissions

**Pipeline failure rules:**
- A failed test is a failed build — do not bypass, do not retry to force green
- A failed deploy to staging is a blocker — do not promote to prod until staging is confirmed
- Do not use `--no-verify` or `--force` flags in pipeline scripts

**Self-hosted infra conventions:**
- Production deploys via pipeline only — no manual SSH deploys
- All pipeline steps logged and retained for at least 30 days
- Deployment user has minimal permissions — deploy access only, no shell access to app server

**Sentry integration:**
- Source maps uploaded on every build — stack traces must be human-readable
- Release tracking enabled — Sentry knows which commits are in each release
- If Sentry is not configured: flag it as a gap. Skip Sections 3 and 6 monitoring steps with a warning, but do not silently pass them.

---

## Section 6 — Rollback Protocol

### Decision Criteria (any one = rollback)

- P0 or P1 error appears in Sentry during the 30-min watch
- Error rate in affected module doubles vs pre-deploy baseline
- Core user flow is broken in production (confirmed by smoke test or user report)
- Deployment-blocking environment variable is missing post-deploy

**Rollback is binary: rollback or hold.** Do not suggest "let's monitor for another 10 minutes" on a P0.

### Rollback Steps

```
1. Trigger rollback to previous tagged build via pipeline
   ↓
2. Confirm staging matches the reverted version (or that staging is safe)
   ↓
3. Verify Sentry error rate returns to pre-deploy baseline
   ↓
4. Log rollback in deployment changelog:
   Status: Rollback | Sentry Result: [reason] | Notes: [root cause if known]
   ↓
5. Notify Lead immediately — rollbacks always warrant Lead notification
   ↓
6. Do not re-attempt deployment until root cause is identified and fixed
```

### Notification Template

```
Rollback on [date] — PRD-[number]
Environment: prod
Reason: [P0 error description / error rate spike / user flow broken]
Version reverted to: [previous version tag]
Sentry: [link to error or incident]
Next steps: [who owns root cause investigation]
```

---

## Behavior Rules

- **Always ask for the PRD number** before generating a changelog entry — never create an orphan entry
- **Never approve skipping staging** — if asked, explain why and refuse
- **Never approve bypassing CI** — failing tests are not a blocker to work around
- **If Sentry is not configured**, note the gap explicitly and skip monitoring sections with a warning
- **Rollback decisions are immediate on P0** — do not hedge, do not "monitor a bit longer"
- **Secrets in pipeline YAML** — flag immediately as a critical security issue, do not proceed
```

**Step 3: Verify the file**

Check the file starts with the correct frontmatter and contains all 6 sections:
- `## Section 1 — Deployment Protocol`
- `## Section 2 — Pre-Deploy Checklist`
- `## Section 3 — Post-Deploy Monitoring`
- `## Section 4 — Deployment Changelog`
- `## Section 5 — CI/CD Patterns`
- `## Section 6 — Rollback Protocol`

Run: `head -20 packages/skills/devops-infra/SKILL.md`
Expected: YAML frontmatter with `name: devops-infra`

**Step 4: Commit**

```bash
git add packages/skills/devops-infra/SKILL.md
git commit -m "feat: add devops-infra skill (deployment protocol, Sentry monitoring, changelog, rollback)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 3: Update registry.json

**Files:**
- Modify: `registry.json`

**Step 1: Read the current registry**

Run: `cat registry.json`
Confirm it has 8 entries (prd-assessment through be-best-practices). The last entry ends with `}` before the closing `]`.

**Step 2: Add two new entries**

Append the following two objects to the `skills` array, after the existing `be-best-practices` entry:

```json
{
  "name": "context-audit",
  "displayName": "Context Audit",
  "version": "1.0.0",
  "description": "Lead sprint-start skill for context health checks. Compares a module's context MD against actual repo files and flags missing files, untracked new files, dependency drift, pattern drift, and staleness. Outputs CLEAN / STALE / OUTDATED status with a copy-paste ready CONTEXT-HEALTH.md row.",
  "author": "talisik-ai",
  "category": "engineering",
  "tags": ["context-md", "audit", "sprint", "lead", "maintenance", "context-health"],
  "path": "packages/skills/context-audit",
  "installSize": "10kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/context-audit"
},
{
  "name": "devops-infra",
  "displayName": "DevOps Infrastructure",
  "version": "1.0.0",
  "description": "DevOps role skill covering the full deployment cycle: deployment protocol step sequence, pre-deploy checklist, 30-min post-deploy Sentry monitoring, deployment changelog per PRD number, CI/CD conventions for self-hosted infrastructure, and rollback protocol with decision criteria.",
  "author": "talisik-ai",
  "category": "engineering",
  "tags": ["devops", "deployment", "ci-cd", "sentry", "infrastructure", "changelog", "rollback"],
  "path": "packages/skills/devops-infra",
  "installSize": "12kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/devops-infra"
}
```

**Step 3: Validate JSON**

Run: `node -e "require('./registry.json'); console.log('valid')"`
Expected: `valid`

**Step 4: Commit**

```bash
git add registry.json
git commit -m "chore: add context-audit and devops-infra to registry

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```
