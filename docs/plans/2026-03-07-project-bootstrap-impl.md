# Project Bootstrap Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create the `project-bootstrap` skill (two modes: BOOTSTRAP for new projects, ONBOARD for existing codebases), add it to the registry, and update the workflow doc with Step 0.

**Architecture:** Single SKILL.md with auto-detected mode, plus registry entry and workflow doc edits. No code — pure Markdown content. Three tasks, all independent of each other's output but Task 3 (workflow) should come last since it references the skill name.

**Tech Stack:** Markdown, YAML frontmatter, JSON.

**Design doc:** `docs/plans/2026-03-07-project-bootstrap-design.md`

---

### Task 1: Create `project-bootstrap` SKILL.md

**Files:**
- Create: `packages/skills/project-bootstrap/SKILL.md`

**Step 1: Create the directory**

Run: `mkdir -p /Users/erickluna/MMI_Repo/claude-skills/packages/skills/project-bootstrap`
Expected: no output

**Step 2: Write the file**

Write the following complete content to `packages/skills/project-bootstrap/SKILL.md`:

```markdown
---
name: project-bootstrap
description: >
  Two-mode Lead skill for project initialization. BOOTSTRAP: interview-driven — Lead answers
  questions about a new project and the skill generates ARCHITECTURE.md, stub context MDs per
  module, and a starter CONTEXT-HEALTH.md. ONBOARD: scan-driven — scans an existing codebase,
  infers stack, modules, and patterns, then interviews Lead to fill gaps. Both modes produce
  the same three output files. Run once per new project or when onboarding a legacy codebase
  into the Claude Code workflow.
triggers:
  - project bootstrap
  - bootstrap project
  - new project setup
  - create architecture
  - generate context MDs
  - onboard project
  - onboard codebase
  - /project-bootstrap
  - architecture.md
  - setup workflow
---

# Project Bootstrap Skill

You are the Lead's project initialization tool. Your job is to produce three files that every
other skill in the workflow depends on: `ARCHITECTURE.md`, a context MD per module, and
`CONTEXT-HEALTH.md`. Nothing else in the workflow runs correctly without these.

Run this once at the start of every new project, and once when onboarding an existing codebase
into the Claude Code workflow.

---

## Mode Detection

Read the conversation context and apply the first matching rule:

| Signal | Mode |
|--------|------|
| Source code found in `src/`, `app/`, `lib/`, `server/`, `api/`, `backend/`, `frontend/` | **ONBOARD** |
| User says "existing project", "legacy", "onboard", provides a repo path | **ONBOARD** |
| No code found, user says "new project", "from scratch", "starting fresh" | **BOOTSTRAP** |
| Ambiguous | Ask ONE question: "Do you have an existing codebase I should scan, or are we starting from scratch?" |

---

## Mode 1 — BOOTSTRAP

**When:** New project with no existing codebase.

Conduct a structured interview in 3 rounds. Ask 2-3 questions per round — never all at once.

### Round 1 — Project Foundation

1. What is the project name and what type of system is it? (web app, API, mobile app, CLI tool, full-stack, etc.)
2. What is the tech stack? (FE framework, BE framework, database, key external services)
3. What is the hosting/infra approach? (self-hosted, cloud provider, serverless, hybrid)

### Round 2 — Module Breakdown

4. What are the main domains or areas of the system? List them — for example: auth, billing, dashboard, notifications, admin, API.
5. For each module named: who owns it (FE / BE / QA / DevOps) and what is it responsible for?
6. Which files or areas require Lead approval before any developer can touch them?

### Round 3 — Team and Constraints

7. What is the team composition? (how many FE, BE, QA, DevOps developers)
8. Are there hard constraints — legal, compliance, performance, or existing integrations that affect design?
9. Are any patterns already decided team-wide? (e.g., "we always use Zod for validation", "Prisma only, no raw SQL")

After Round 3, generate all three output files.

---

## Mode 2 — ONBOARD

**When:** Existing codebase. Scan first, then interview to fill what can't be inferred.

### Scan Sequence

Run these scans before asking a single question:

**Step 1 — Detect stack**
Look for: `package.json`, `requirements.txt`, `go.mod`, `Cargo.toml`, `pyproject.toml`, `composer.json`, `Gemfile`.
Infer: primary language, framework, test runner, key dependencies.

**Step 2 — Map modules**
Read the top-level directory structure. Identify modules from directory names under `src/`, `app/`, `packages/`, `services/`, `apps/`, or the root.
For monorepos: treat each package/app as a separate module.

**Step 3 — Infer patterns**
Read 2-3 key files per module (entry points, largest files, router/controller files).
Look for: import patterns, validation libraries, ORM usage, naming conventions, folder organization rules.

**Step 4 — Check existing context MDs**
Look for `*.context.md` files anywhere in the project. Note which modules already have them — do not overwrite existing context MDs unless explicitly asked.

### Interview to fill gaps

After the scan, report what was found, then ask the Lead to fill what couldn't be inferred:

```
Scan complete. Here's what I found:

Stack: [inferred stack]
Modules found: [list]
Patterns inferred: [list]

To complete the context MDs, I need a few things:
1. Owner (role) for each module — who is responsible?
2. Do-not-touch files per module — what requires Lead approval to modify?
3. Known gotchas per module — race conditions, quirks, legacy landmines to flag
4. Any required patterns not visible in the code?
```

Ask module by module if the list is long — do not dump all questions at once.

---

## Output Files (Both Modes)

Generate all three files after the interview is complete.

### 1. `ARCHITECTURE.md` (project root)

```markdown
# ARCHITECTURE.md — [Project Name]
Version: 1.0
Last updated: [today's date]
Updated by: [Lead name if provided, otherwise "Lead"]

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | [framework or N/A] |
| Backend | [framework or N/A] |
| Database | [db or N/A] |
| Infrastructure | [hosting/infra] |

## Modules

| Module | Owner Role | Context MD | Notes |
|--------|-----------|-----------|-------|
| [module] | [FE/BE/QA/DevOps] | docs/context/[module].context.md | [brief purpose] |

## Key Boundaries

**Requires Lead approval before modification:**
- [file or directory path]

**Shared modules (used across multiple roles):**
- [module name] — [what it provides]

**External integrations:**
- [service] — [what it does, which module owns it]

## Patterns Enforced Across All Modules

- [pattern]

## Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | [today] | Initial bootstrap |
```

### 2. `docs/context/[module].context.md` (one per module)

Create the `docs/context/` directory if it doesn't exist. One file per module.

```markdown
# [module-name].context.md
last_verified_sprint: UNVERIFIED — Lead must sign before Sprint 1
owner: [name or role]
prd_ref: —

## Key Files
[List exact file paths discovered from scan, or TO FILL if new project]

## Dependencies
[List inferred from imports, or TO FILL if new project]

## Do Not Touch
[TO FILL — Lead must specify which files require Lead approval]

## Gotchas
[List inferred from code comments and patterns, or TO FILL if new project]

## Required Patterns
[List inferred from codebase, or TO FILL if new project]
```

### 3. `CONTEXT-HEALTH.md` (project root)

```markdown
# CONTEXT-HEALTH.md — [Project Name]
Last reviewed: UNVERIFIED — Lead must sign before Sprint 1

| Module | Context MD | Last Verified | Owner | Status |
|--------|-----------|---------------|-------|--------|
| [module] | docs/context/[module].context.md | UNVERIFIED | [owner] | ⚠️ Stub — needs Lead sign-off |
```

---

## Post-Generation Checklist

After generating all files, always remind the Lead:

```
Bootstrap complete. Three files generated:
- ARCHITECTURE.md
- docs/context/[N] context MDs
- CONTEXT-HEALTH.md

Before Sprint 1 can start:
- [ ] Review each context MD — fill all [TO FILL] fields
- [ ] Sign last_verified_sprint on every context MD (replace UNVERIFIED with Sprint-01)
- [ ] Update CONTEXT-HEALTH.md status to ✅ Fresh for signed modules
- [ ] Share ARCHITECTURE.md with the team before first cards are created

Until last_verified_sprint is signed, no cards should be created against these modules.
```

---

## Behavior Rules

- **Never generate context MDs without module name and owner** — ask if missing before generating
- **ONBOARD: always state what was inferred vs what the Lead provided** — never mix them silently
- **`[TO FILL]` markers are required** on every field that couldn't be determined — never guess
- **Never overwrite existing context MDs** in ONBOARD mode unless explicitly asked
- **Do not mark `last_verified_sprint` as a real sprint** — always use `UNVERIFIED` until the Lead explicitly signs off
- **Context MDs go in `docs/context/`** by default — ask Lead if they prefer a different location
- **ARCHITECTURE.md goes in the project root** — always
- **One module per context MD** — never combine two modules in one file
```

**Step 3: Verify the file**

Run: `head -20 /Users/erickluna/MMI_Repo/claude-skills/packages/skills/project-bootstrap/SKILL.md`
Expected: YAML frontmatter starting with `---` and `name: project-bootstrap`

Confirm file contains:
- `## Mode Detection` table
- `## Mode 1 — BOOTSTRAP`
- `## Mode 2 — ONBOARD`
- `## Output Files (Both Modes)`
- `## Behavior Rules`

**Step 4: Commit**

```bash
cd /Users/erickluna/MMI_Repo/claude-skills
git add packages/skills/project-bootstrap/SKILL.md
git commit -m "$(cat <<'EOF'
feat: add project-bootstrap skill (BOOTSTRAP + ONBOARD modes)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Update registry.json

**Files:**
- Modify: `registry.json`

**Step 1: Read the current last entry**

Confirm the last entry is `web-design-guidelines` before editing.

**Step 2: Add the new entry and bump version**

In `registry.json`:
1. Update `"updatedAt"` to `"2026-03-07"`
2. Append this object after the `web-design-guidelines` entry (before the closing `]`):

```json
{
  "name": "project-bootstrap",
  "displayName": "Project Bootstrap",
  "version": "1.0.0",
  "description": "Two-mode Lead skill for project initialization. BOOTSTRAP: interview-driven setup for new projects — generates ARCHITECTURE.md, stub context MDs, and CONTEXT-HEALTH.md. ONBOARD: scans an existing codebase, infers stack and modules, interviews Lead to fill gaps, then produces the same three output files. Run once per new project or legacy onboarding.",
  "author": "talisik-ai",
  "category": "product",
  "tags": ["bootstrap", "architecture", "context-md", "new-project", "onboarding", "lead", "workflow"],
  "path": "packages/skills/project-bootstrap",
  "installSize": "8kb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/project-bootstrap"
}
```

**Step 3: Validate JSON**

Run: `node -e "require('./registry.json'); console.log('valid')"`
Expected: `valid`

Run: `node -e "const r = require('./registry.json'); console.log('skills count:', r.skills.length)"`
Expected: `skills count: 16`

**Step 4: Commit**

```bash
git add registry.json
git commit -m "$(cat <<'EOF'
chore: add project-bootstrap to registry (16 skills total)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Update `docs/claude-code-workflow.md`

**Files:**
- Modify: `docs/claude-code-workflow.md`

**Step 1: Add Step 0 before the 8-Step Pipeline**

Find the line:
```
## The 8-Step Pipeline
```

Insert the following block immediately before it:

```markdown
## Step 0 — Project Bootstrap
**Owner:** Lead
**When:** Once per new project, or when onboarding a legacy codebase into this workflow
**Tool:** Claude Code (Max tier) + `/project-bootstrap` Skill

```
/project-bootstrap
```

Before the 8-step pipeline can run, three files must exist:
- `ARCHITECTURE.md` — module map, stack, key boundaries
- `docs/context/[module].context.md` — one per module
- `CONTEXT-HEALTH.md` — staleness tracker

**For new projects (BOOTSTRAP mode):** Claude interviews the Lead about modules, stack, team, and constraints. Generates all three files from the interview.

**For existing projects (ONBOARD mode):** Claude scans the codebase, infers stack and modules, then interviews the Lead to fill gaps (owners, do-not-touch lists, gotchas). Generates all three files.

**Gate:** No Sprint 1 cards are created until the Lead has signed `last_verified_sprint` on every context MD. `UNVERIFIED` context MDs are not valid session sources.

---

```

**Step 2: Add `project-bootstrap` to the Skills Reference table**

Find:
```
| `context-audit` | Lead | Compares context MD vs actual module files, flags divergences |
```

Add after it:
```
| `project-bootstrap` | Lead | Runs `/project-bootstrap` — generates ARCHITECTURE.md, context MDs, and CONTEXT-HEALTH.md for new or onboarded projects |
```

**Step 3: Add to Sprint Triggers table**

Find:
```
| PRD received | Lead | Run `/prd-assess` → Impact Assessment |
```

Add before it (it's a pre-pipeline event):
```
| New project / legacy onboarding | Lead | Run `/project-bootstrap` → ARCHITECTURE.md + context MDs + CONTEXT-HEALTH.md |
```

**Step 4: Verify the changes**

Run: `grep -n "project-bootstrap" /Users/erickluna/MMI_Repo/claude-skills/docs/claude-code-workflow.md`
Expected: at least 3 matches (Step 0 section, Skills Reference, Sprint Triggers)

**Step 5: Commit**

```bash
git add docs/claude-code-workflow.md
git commit -m "$(cat <<'EOF'
docs: add Step 0 (project-bootstrap) to claude-code-workflow.md

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
EOF
)"
```
