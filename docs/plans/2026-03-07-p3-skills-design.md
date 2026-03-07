# P3 Skills Design — context-audit, devops-infra

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Create two new maintenance/ops skill SKILL.md files + registry entries

---

## Context

These two skills cover Step 3 (context health), Step 7 (post-merge lead loop), and Step 8 (deploy + docs) of the Claude Code Development Workflow. They are maintenance and ops skills — used by Leads and DevOps engineers, not individual developers.

---

## Skill 1: `context-audit`

**File:** `packages/skills/context-audit/SKILL.md`
**Category:** engineering
**Tags:** context-md, audit, sprint, lead, maintenance, context-health

### Purpose

Lead runs `/context-audit [module]` at sprint start. Claude Code reads the context MD and the actual module files, then produces a structured divergence report. Helps prevent developer sessions from loading stale context.

### Input

User provides module name (e.g., `auth`) or context MD path (e.g., `docs/context/auth.context.md`). Claude resolves the file path.

### Pre-flight Checks

1. Locate the context MD — check `docs/context/[module].context.md`, `[module].context.md`, `docs/[module].context.md` in that order. If not found, stop and ask for the exact path.
2. Confirm `CONTEXT-HEALTH.md` exists in project root — if missing, note it and offer to create a starter template.
3. Confirm the module directory exists — if not, warn before proceeding.

### 5 Checks (in order)

**Check 1 — Missing files**
Files listed in the "Key Files" section that no longer exist in the repository.

**Check 2 — Untracked files**
New files discovered in the module directory that are not listed in "Key Files". Flag if they appear to be significant (`.ts`, `.tsx`, `.js`, `.py`, not test or build artifacts).

**Check 3 — Dependency drift**
Import statements in the actual module files reference packages or modules not listed in the "Dependencies" section of the context MD.

**Check 4 — Pattern drift**
"Required Patterns" listed in the context MD are not visible in the actual module code (e.g., pattern says "always use React Query" but module has `useState` loading server data).

**Check 5 — Staleness flag**
`last_verified_sprint` field is more than 1 sprint old. Flag with exact sprint gap.

### Output Format

```
## Context Audit — [module-name].context.md
Sprint: [current sprint if known, otherwise ask]
Audited: [today's date]

Status: CLEAN | STALE | OUTDATED

---

### Check 1 — Missing Files
[PASS / FAIL]
- [path that no longer exists]

### Check 2 — Untracked Files
[PASS / FAIL]
- [new file found in module not listed in MD]

### Check 3 — Dependency Drift
[PASS / FAIL]
- [import/package used in code but not in MD]

### Check 4 — Pattern Drift
[PASS / FAIL]
- [pattern listed in MD but not present in code]

### Check 5 — Staleness
[PASS / FAIL]
- last_verified_sprint: Sprint-XX ([N] sprints ago)

---

### Summary

Required actions before next session uses this context MD:
- [ ] [specific update needed]

### CONTEXT-HEALTH.md Row (copy-paste ready)

| [module] | [module].context.md | Sprint-XX | [owner] | [status emoji] [status label] |
```

### Status Definitions

- **CLEAN** — All 5 checks pass
- **STALE** — 1-2 checks fail (usable with caution, update before next sprint)
- **OUTDATED** — 3+ checks fail (do not use as session context until updated)

### Behavior Rules

- Never produce CLEAN if any check fails
- If module path doesn't exist, stop and ask — do not guess
- Always provide the exact `CONTEXT-HEALTH.md` row text, ready to copy-paste
- If `CONTEXT-HEALTH.md` is missing, note it and provide a starter template
- Pattern drift check is best-effort — flag it as limited if the module has many files
- Audit one module per run — do not batch across modules in one session

---

## Skill 2: `devops-infra`

**File:** `packages/skills/devops-infra/SKILL.md`
**Category:** engineering
**Tags:** devops, deployment, ci-cd, sentry, infrastructure, changelog, rollback

### Purpose

DevOps role skill covering the full deployment cycle: pre-deploy checks, CI/CD pipeline conventions, post-deploy Sentry monitoring, rollback protocol, and deployment changelog per PRD number.

### 6 Sections (by concern)

**1. Deployment Protocol**
Step sequence every deploy must follow:
1. All CI checks green on the merge commit
2. Deploy to staging
3. Run smoke test on staging (key flows for the PRD being deployed)
4. No open P0/P1 Sentry alerts in affected module before promoting
5. Deploy to production
6. Start 30-min Sentry watch
7. Log deployment in changelog

**2. Pre-Deploy Checklist**
- CI: all checks green (lint, tests, build)
- Staging: deployed and smoke-tested
- Sentry: no unresolved P0/P1 in affected module
- PRD: deployment is linked to a card (no orphan deploys)
- Secrets: no hardcoded values — all environment variables confirmed present in target env

**3. Post-Deploy Monitoring (30-min watch)**
- Watch Sentry for new errors in the deployed module
- Thresholds:
  - 0 new errors → log as Clean
  - 1-3 new errors, non-blocking → log as Degraded, create Sentry issue, monitor
  - P0/P1 error or error rate spike → rollback immediately
- After 30 min with no new P0/P1 errors → deployment is confirmed stable

**4. Deployment Changelog**
Every deployment must be logged. Format:

```
| Date | PRD | Version | Deployed By | Environment | Status | Sentry Result | Notes |
|------|-----|---------|-------------|-------------|--------|---------------|-------|
| 2026-03-07 | PRD-042 | v1.4.2 | [name] | prod | Stable | Clean (0 new) | — |
| 2026-03-07 | PRD-042 | v1.4.1 | [name] | staging | Rollback | P0: auth error | reverted |
```

Status options: `Stable` | `Degraded` | `Rollback`
Sentry Result: `Clean (0 new)` | `Degraded (N new, non-blocking)` | `P0: [brief description]`

**5. CI/CD Patterns**
- Environment promotion: dev → staging → prod (no skipping)
- Self-hosted infra: deployment via pipeline only — no manual `ssh` deploys to production
- Secrets: environment variables from vault/secrets manager, never in pipeline YAML
- Build artifacts: tag every build with version + PRD number for traceability
- Pipeline failure: stop and notify — never auto-retry failed tests to force a green

**6. Rollback Protocol**
Decision to rollback:
- Any P0 error in Sentry during the 30-min watch
- Error rate doubles versus pre-deploy baseline
- Core user flow broken in production

Rollback steps:
1. Revert to previous tagged build via pipeline
2. Confirm staging matches reverted version
3. Verify Sentry error rate returns to baseline
4. Log rollback in deployment changelog (Status: `Rollback`, note reason)
5. Notify Lead — rollback always warrants a Lead notification regardless of hour
6. Do not re-attempt deploy until root cause is identified

### Triggers

`deploy`, `deployment`, `CI/CD`, `Sentry`, `infrastructure`, `rollback`, `devops`, `smoke test`, `prod`, `staging`, `pipeline`

### Behavior Rules

- Always prompt for PRD number before generating a changelog entry — no orphan deploy entries
- If Sentry is not configured, note it and skip checks 3/6 with a warning — do not silently pass them
- Never approve skipping staging — if user asks to deploy directly to prod, refuse and explain
- Rollback decisions are binary: rollback or hold. Do not suggest "let's monitor longer" on a P0.

---

## Files to Create

| File | Action |
|------|--------|
| `packages/skills/context-audit/SKILL.md` | Create |
| `packages/skills/devops-infra/SKILL.md` | Create |
| `registry.json` | Add 2 new entries |
