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

```
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

```
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
