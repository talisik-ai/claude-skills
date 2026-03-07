# Project Bootstrap Design

**Date:** 2026-03-07
**Status:** Approved
**Scope:** Create `project-bootstrap` SKILL.md + registry entry + update `docs/claude-code-workflow.md`

---

## Context

New and onboarded projects have a bootstrapping gap: the workflow assumes `ARCHITECTURE.md` and context MDs exist, but nothing helps a Lead create them from scratch. This skill fills that gap with two modes: BOOTSTRAP (interview-driven for new projects) and ONBOARD (scan-driven for existing codebases).

---

## Skill: `project-bootstrap`

**File:** `packages/skills/project-bootstrap/SKILL.md`
**Category:** product
**Tags:** bootstrap, architecture, context-md, new-project, onboarding, lead

---

### Mode Detection

| Signal | Mode |
|--------|------|
| Source code found in common dirs (`src/`, `app/`, `lib/`, `server/`, `api/`, etc.) | **ONBOARD** |
| No significant code files found | **BOOTSTRAP** |
| Ambiguous | Ask: "Do you have an existing codebase I should scan, or are we starting from scratch?" |

---

### Mode 1 — BOOTSTRAP (new project, no codebase)

Interview the Lead in 3 rounds. Ask 2-3 questions per round — never all at once.

**Round 1 — Project foundation**
1. Project name and type (web app, API, mobile, CLI, full-stack)
2. Tech stack: FE framework, BE framework, DB, key external services
3. Hosting/infra approach (self-hosted, cloud, serverless)

**Round 2 — Module breakdown**
4. What are the main domains/areas of the system? (e.g., auth, billing, dashboard, API)
5. For each module: who owns it (FE/BE/QA/DevOps) and what it's responsible for
6. What files or areas are off-limits without Lead approval?

**Round 3 — Team and constraints**
7. Team roles (how many FE, BE, QA, DevOps devs)
8. Hard constraints (legal, performance, existing integrations)
9. Any patterns already decided (e.g., "we always use Zod for validation")

---

### Mode 2 — ONBOARD (existing codebase)

Scan first. Interview to fill what can't be inferred.

**Scan sequence:**
1. Detect stack from `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pyproject.toml`, etc.
2. Map top-level directory structure → identify modules
3. Read 2-3 key files per module to infer patterns (imports, naming conventions, used libraries)
4. Check for existing context MDs — note which modules already have them

**Interview Lead to fill gaps:**
- Owner per module (who is responsible?)
- Do-not-touch files (what requires Lead approval to modify?)
- Known gotchas (race conditions, quirks, legacy landmines)
- Required patterns not evident from code

After generating, always state clearly what was inferred from the codebase vs what was provided by the Lead.

---

### Output — Both Modes

Three files generated per run:

**1. `ARCHITECTURE.md`**

```markdown
# ARCHITECTURE.md — [Project Name]
Version: 1.0
Last updated: [date]
Updated by: [Lead name]

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [framework] |
| Backend | [framework] |
| Database | [db] |
| Infrastructure | [hosting/infra] |

## Modules

| Module | Owner Role | Context MD | Status |
|--------|-----------|-----------|--------|
| [module] | [FE/BE/QA/DevOps] | [module].context.md | stub |

## Key Boundaries

Files requiring Lead approval before any modification:
- [file or directory]

Shared modules (cross-team):
- [module]

External integrations:
- [service]

## Patterns Enforced Across All Modules

- [pattern]
```

**2. `docs/context/[module].context.md` per module**

```markdown
# [module-name].context.md
last_verified_sprint: UNVERIFIED — Lead must sign before Sprint 1
owner: [name or role]
prd_ref: —

## Key Files
[discovered from scan / TO FILL — list exact files devs may touch]

## Dependencies
[inferred from imports / TO FILL — internal modules and external libs]

## Do Not Touch
[TO FILL — files requiring Lead approval]

## Gotchas
[inferred from code comments / TO FILL — known bugs, quirks, race conditions]

## Required Patterns
[inferred from codebase / TO FILL — patterns devs must follow in this module]
```

**3. `CONTEXT-HEALTH.md`**

```markdown
# CONTEXT-HEALTH.md — [Project Name]
Last reviewed: UNVERIFIED — sign before Sprint 1

| Module | Context MD | Last Verified | Owner | Status |
|--------|-----------|---------------|-------|--------|
| [module] | [module].context.md | UNVERIFIED | [owner] | ⚠️ Stub — needs Lead sign-off |
```

---

### Behavior Rules

- Never generate context MDs without at least the module name and owner — ask if missing
- For ONBOARD: always state what was inferred vs what came from the Lead interview
- `[TO FILL]` markers required on every field that couldn't be determined — never guess or leave blank silently
- After generating all files, always remind: "Sign `last_verified_sprint` on all context MDs before starting Sprint 1. Until signed, no cards should be created against these modules."
- Place context MDs in `docs/context/` by default — ask Lead if they prefer a different location
- Never mark `last_verified_sprint` as a real sprint — always use `UNVERIFIED` until the Lead explicitly signs off

---

## Workflow Update

Add **Step 0 — Project Bootstrap** to `docs/claude-code-workflow.md` immediately above the existing 8-step pipeline heading. Clearly mark it as "runs once per new project or legacy onboarding."

Also add `/project-bootstrap` to the Skills Reference table and the Sprint Triggers table.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `packages/skills/project-bootstrap/SKILL.md` | Create |
| `registry.json` | Add 1 new entry, bump `updatedAt` |
| `docs/claude-code-workflow.md` | Add Step 0, update Skills Reference + Sprint Triggers |
