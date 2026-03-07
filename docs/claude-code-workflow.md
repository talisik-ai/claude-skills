# Claude Code Development Workflow
**Version 3 — AI-First Engineering**

> **Purpose:** Use Claude Code to ship faster, release quality products, and build with a lean team that knows how to work with AI. Devs who adapt get more done with less effort. Devs who don't adapt become the bottleneck.

---

## The Core Idea

This workflow replaces the traditional dev loop with an AI-assisted one. Claude Code handles the heavy lifting of scoping, implementation, review, and documentation. The developer's job shifts from *writing boilerplate* to *making good decisions inside a well-scoped boundary*.

The result:
- Faster MVP delivery — PRD to working code in days, not weeks
- Consistent quality — context MDs and Skills enforce patterns every session
- Smaller, sharper team — one dev with this workflow outproduces two without it

**If a developer refuses to use the workflow, they are not slow — they are a cost with no multiplier.**

---

## What Claude Code Does in This Workflow

| Task | Without Claude Code | With Claude Code |
|---|---|---|
| PRD → card breakdown | Lead writes manually (2–4 hrs) | `/prd-assess` outputs full impact assessment (20 min) |
| Session context setup | Dev reads docs, copies code (30–45 min) | Skills auto-load, prompt template structures session (5 min) |
| Implementation | Dev writes from scratch | Dev reviews and steers AI output |
| PR pre-review | Manual checklist (30–60 min) | Review Buddy Skill runs checklist (10 min) |
| Test generation | QA writes manually (1–2 hrs) | Claude generates from acceptance criteria (20 min) |
| Context MD updates | Lead writes manually | Claude Code drafts, Lead verifies |

---

## Subscriptions

| Role | Plan | Cost | Why |
|---|---|---|---|
| Team Leads | Claude Max 5× | $100/mo | Claude Code for codebase scanning, PRD assessment, Skill building |
| All Developers | Claude Pro | $20/mo | Full Claude access, Agent Skills, replaces Cursor |
| Team Standard seat | Reference | $20/mo (annual) | If moving to centralized team plan later |
| Team Premium seat | Reference | $100/mo (annual) | Adds Claude Code centrally — option at 25+ devs |

---

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

## The 8-Step Pipeline

Every feature, every MVP, every hotfix follows this sequence. **No step is skippable.**

---

### Step 1 — PRD Received
**Owner:** PM / Stakeholder → Lead

The only valid trigger for development. No PRD = no card = no session.

A valid PRD must have:
- Clear objective
- Scope — what's IN and what's OUT
- Acceptance criteria (at least one verifiable condition)
- PRD number (e.g. PRD-042)

If the PRD is incomplete, Lead returns it. Work does not start on a partial PRD.

---

### Step 2 — Impact Assessment
**Owner:** Lead
**Tool:** Claude Code (Max tier) + `/prd-assess` Skill

```
/prd-assess docs/prd/PRD-042.md
```

Claude reads `ARCHITECTURE.md`, the PRD, and all active context MDs. Output is a full `IMPACT-ASSESSMENT.md`:

- PRD type (New Feature / New Project / Pivot / Hotfix / Cross-Project)
- Affected modules and their owners
- Context MDs that need updating
- Custom Skills that need rebuilding
- Estimated Jira cards per role
- Dependency and cross-project risks

**Gate:** Nothing moves forward until this document exists and the Lead has reviewed it.

---

### Step 3 — Context MDs Updated
**Owner:** Lead
**Trigger:** Every module listed in IMPACT-ASSESSMENT.md

For each affected module:
1. Update the context MD — key files, dependencies, do-not-touch list, gotchas, required patterns
2. Update `last_verified_sprint` field to current sprint (Lead sign-off)
3. Update `ARCHITECTURE.md` if structure changed
4. Rebuild the Custom Skill for that module
5. Update `CONTEXT-HEALTH.md` — staleness flags, ownership changes

> A stale context MD is worse than none. Developers working from stale context build confidently in the wrong direction.

**Context MD structure (per module):**
```
# [module-name].context.md
last_verified_sprint: Sprint-24
owner: [Lead name]
prd_ref: PRD-042

## Key Files
[exact files devs may touch]

## Dependencies
[internal modules and external libs]

## Do Not Touch
[files requiring Lead approval]

## Gotchas
[known bugs, Safari quirks, race conditions]

## Required Patterns
[React Query, Zod, API call rules]
```

---

### Step 4 — Jira Cards Created
**Owner:** Lead
**Tool:** `/gen-cards` Skill

```
/gen-cards docs/context/IMPACT-ASSESSMENT.md
```

Claude generates the full card list from the assessment. Lead reviews for size and accuracy before creating in Jira.

**Every card must have:**
- PRD reference (mandatory — no card without this)
- Skill name or context MD path
- Exact scope: files the developer MAY touch
- Explicit do-not-touch list
- Acceptance criteria (verifiable)
- Size: XS, S, or M only — no L or XL
- 3 pre-set log fields: `AI-assisted (Y/N)` · `rework required (Y/N)` · `session count`

Cards larger than M are split before creation. A card that's too large will cause the developer to hit session limits mid-implementation.

---

### Step 5 — Implementation
**Owner:** Developer
**Tool:** Claude Pro + role Skill + project context Skill

**Session start sequence:**
1. Open Claude Pro — confirm role Skill is enabled (`fe-best-practices` / `be-best-practices` / etc.)
2. Check if a project Skill exists for the module — if yes, it auto-loads. If no, attach the context MD manually
3. Open session using the role prompt template:

```
PRD: PRD-042 — [PRD title]
TASK: [exact task from Jira card]
SCOPE: Touch ONLY [files listed on card]
DO NOT: [do-not-touch list from card]
CONTEXT: [Skill name] loaded / [module.context.md] attached
DONE WHEN: [acceptance criteria]
```

**Rules:**
- One session per card — close and start fresh for each card
- When acceptance criteria are met, stop — do not keep going
- Limit hit mid-session = card was scoped too large → flag and split, do not continue
- Never paste raw source files into Claude — use Skills or attach context MDs only

**On card close, developer fills the 3 log fields before moving to Done.** This is not optional.

---

### Step 6 — Review Buddy + QA
**Owner:** Review Buddy (senior dev per role) → QA

**Review Buddy runs first:**

Using the pre-review checklist Skill:
- Did the PR only touch files listed on the card?
- Is acceptance criteria verifiable from the code?
- No untouched-file modifications
- No schema changes outside scope
- Patterns match `coding-standards` Skill

Buddy passes → moves to QA. Buddy fails → returns to developer with specific comments.

**QA runs after Buddy sign-off:**

Using module context Skill or context MD:
- Generate test cases from acceptance criteria
- Generate edge cases: empty states, boundary values, error paths
- Browser matrix: Chrome, Firefox, Safari
- Regression check on files adjacent to scope boundary

QA passes → moves to Lead review. Bug found → returns to Step 5.

> Review Buddy and QA must be different people. One person doing both defeats the two-gate system.

---

### Step 7 — Lead PR Review
**Owner:** Lead
**Target:** Less than 30% of all PRs

Lead reviews only:
- PRs touching `ARCHITECTURE.md`, `/lib/auth/`, cross-module dependencies
- New patterns not in `coding-standards` Skill
- Pivot-adjacent code (flagged high-risk in Impact Assessment)
- Anything the Buddy escalates

Everything else is Buddy-only — no Lead needed.

**After merge, Lead closes the loop:**
- New pattern established → update `coding-standards` Skill
- Module structure changed → update context MD, re-sign `last_verified_sprint`, rebuild Skill
- Module ownership changed → update `CONTEXT-HEALTH.md`
- Version bump `ARCHITECTURE.md` if structural changes shipped

> If a Lead is reviewing every PR, they are not doing Impact Assessments. Those are higher-value uses of Lead capacity.

---

### Step 8 — Deploy + Docs
**Owner:** DevOps (deploy) → Lead (docs)

**DevOps:**
- Deploy via CI/CD to self-hosted infrastructure
- Smoke test on staging before production
- Monitor Sentry for 30 min post-deploy
- Log deployment against PRD number in `devops-infra` Skill changelog

**Lead post-deploy:**
- Version bump `ARCHITECTURE.md`
- Confirm `last_verified_sprint` is current on all touched context MDs
- Rebuild affected Skills
- Update `CONTEXT-HEALTH.md` — all touched modules marked fresh
- Run monthly metric review if end-of-sprint

---

## Sprint Triggers Reference

| Event | Owner | Action |
|---|---|---|
| New project / legacy onboarding | Lead | Run `/project-bootstrap` → ARCHITECTURE.md + context MDs + CONTEXT-HEALTH.md |
| PRD received | Lead | Run `/prd-assess` → Impact Assessment |
| New module created | Lead | New context MD + new Skill |
| Module refactored | Lead | Update context MD + rebuild Skill |
| Pivot approved | Lead | Disable stale Skills → rebuild from pivot PRD |
| New pattern established | Lead | Update `coding-standards` Skill immediately |
| Sprint start | Lead | Sign off all context MD headers + review `CONTEXT-HEALTH.md` |
| Card closed | Developer | Log: AI-assisted, rework required, session count |
| PR opened | Review Buddy | Pre-review Skill checklist before Lead sees it |
| Monthly review | Lead | AI-assist rate, 1-session completion %, rework rate |
| Context MD not updated 2+ sprints | Lead | Flag in `CONTEXT-HEALTH.md` → verify or archive |
| Release | Lead | `ARCHITECTURE.md` version bump + full Skills audit |

---

## Measurement — Non-Negotiable

Without measurement there is no proof the workflow works and no basis for deciding who stays.

**Log per card close (developer fills):**
- `AI-assisted` — Y/N
- `Rework required` — Y/N
- `Session count` — how many sessions this card took

**Monthly Lead review:**

| Metric | Target |
|---|---|
| 1-session card completion rate | 85%+ |
| AI-assisted code rate | Track baseline, improve sprint-on-sprint |
| AI-related rework rate | < 10% |
| Lead PR review % | < 30% of all PRs |
| Limit events per sprint | Near zero by Month 3 |
| Stale context MDs used | 0 |

If a developer's cards consistently require multiple sessions, high rework, or generate limit events — the cards are scoped wrong **or** the developer is not using the workflow.

---

## Context Health System

**`CONTEXT-HEALTH.md`** lives in the project root. Lead maintains it.

```
# CONTEXT-HEALTH.md — [Project Name]
Last reviewed: Sprint-24

| Module          | Context MD              | Last Verified | Owner  | Status  |
|-----------------|-------------------------|---------------|--------|---------|
| auth            | auth.context.md         | Sprint-24     | [Lead] | ✅ Fresh |
| settings        | settings.context.md     | Sprint-23     | [Lead] | ✅ Fresh |
| billing         | billing.context.md      | Sprint-21     | [Lead] | ⚠️ Stale |
| dashboard       | dashboard.context.md    | Sprint-22     | [Dev]  | ⚠️ Stale |
```

Rules:
- Any module not signed off this sprint → do not use as Skill source
- Stale = not updated in 2+ sprints → Lead must verify or archive before next sprint touches it
- Run `/context-audit [module]` to have Claude Code compare context MD vs actual module files and flag divergences

---

## Review Buddy System

One senior developer per role acts as first-pass reviewer.

| Role | Review Buddy responsibility |
|---|---|
| Frontend | Pre-review FE PRs for scope compliance + React/CSS pattern check |
| Backend | Pre-review BE PRs for API pattern, Zod validation, no raw DB calls |
| QA | N/A — QA is already a gate step |
| DevOps | Lead reviews directly (low PR volume) |

Review Buddies use the **pre-review checklist Skill** for every review — not a manual checklist.

Lead only reviews what Buddy escalates + architectural changes. If Lead queue depth exceeds 5 PRs waiting more than 1 day, the Buddy system is not working.

---

## 11 Non-Negotiable Rules

1. **PRD first, Jira second.** No card without a completed Impact Assessment.
2. **Skills support the workflow — they don't define it.** The PRD → Impact Assessment → Context MD → Card → Session pipeline is immovable.
3. **No raw codebase dumping.** Context MDs or Skills only. Never paste raw source files.
4. **One session per card.** Close and restart for each card. No thread kept alive across multiple cards.
5. **Pivot = disable old Skills immediately.** Notify all developers before Skills are re-enabled.
6. **Leads handle "why", devs handle "how".** Architectural decisions stay with Leads on Max tier.
7. **Prompt template is mandatory.** PRD ref, task, scope, do-not-touch, done criteria — every session.
8. **Limit hits are planning signals.** Card was too large. Split it. Track limit events as a sprint health metric.
9. **Measure every sprint.** AI-assist rate, 1-session completion, rework rate. Without measurement, there is no improvement and no accountability.
10. **Review Buddies protect Lead capacity.** Lead reviews < 30% of PRs. If Lead reviews everything, Impact Assessments don't get done.
11. **Stale context MDs are worse than none.** Every context MD carries a `last_verified_sprint`. If it's not signed off this sprint, it is not a valid source.

---

## Skills Reference

### Custom Skills (Lead-built)

| Skill | Role | Purpose |
|---|---|---|
| `prd-assessment` | Lead | Runs `/prd-assess` — full impact assessment from PRD |
| `card-generator` | Lead | Runs `/gen-cards` — Jira card list from impact assessment |
| `coding-standards` | All | Required patterns, anti-patterns, file structure rules |
| `[project]-context` | All | Project-specific module map and architecture |
| `fe-best-practices` | Frontend | React, Tailwind, component patterns |
| `be-best-practices` | Backend | API structure, Zod, Prisma, error handling |
| `ml-workflow` | ML/DC | Model pipeline, data handling, inference patterns |
| `devops-infra` | DevOps | CI/CD, deployment config, Sentry integration |
| `pre-review-checklist` | Review Buddy | Scope check before Lead sees any PR |
| `context-audit` | Lead | Compares context MD vs actual module files, flags divergences |
| `project-bootstrap` | Lead | Runs `/project-bootstrap` — generates ARCHITECTURE.md, context MDs, and CONTEXT-HEALTH.md for new or onboarded projects |

### Partner Skills (Anthropic integrations)

| Skill | Role | What it does |
|---|---|---|
| Figma | Frontend | Pull design tokens, component specs, layout constraints into session |
| Atlassian | All | Query Jira cards, Confluence docs directly in session |
| Sentry | Backend / DevOps | Surface active errors for the module being worked on |
| Hugging Face | ML/DC | Access model cards, datasets, inference endpoints |

---

## Transition Phases

### Month 1 — Foundation
- All devs migrate from Cursor to Claude Pro
- Leads on Claude Max 5×
- Context MD system built for Tier A projects
- `/prd-assess` Skill built first — highest ROI
- Partner Skills enabled per role
- **Gap 01:** Add 3 log fields to every Jira card close
- **Gap 03:** Add `last_verified_sprint` to every context MD header
- Measure: limit events/sprint, sessions-per-card

### Month 2 — Skills Scaling
- Top 5 context MDs per role converted to Custom Skills
- Role Skills deployed: `fe-best-practices`, `be-best-practices`, `devops-infra`, `ml-workflow`
- Senior devs become co-owners of their module Skills
- **Gap 02:** Designate Review Buddy per role, build pre-review checklist Skill
- **Gap 03:** `CONTEXT-HEALTH.md` added to every Tier A project
- Measure: PR cycle time baseline, 1-session completion rate, Lead review queue depth

### Month 3+ — Lean Team Operations
- Every project has a full Custom Skill
- Shared Skills library for cross-project modules (auth, design-system)
- `/context-audit` Skill built — Lead runs it every sprint start
- Cursor retired
- **Monthly review:** AI-assist rate, rework rate < 10%, Lead reviews < 30% of PRs
- Team sizing decision made based on measurement data

---

## Project Tiers

| Tier | Projects | Skills priority |
|---|---|---|
| **A** — Build first | Salina Web, V4 Admin, V4 Client, V4 Mobile | Impact Assessment + context Skills immediately |
| **B** — Build by Sprint 2 | Salina Desktop, Salina CRX, Downlodr, Dividr, Dyaryo App, Schedulosa | After Tier A Skills are proven |
| **C** — Build on-demand | Putulero, Lexibean, Pallos, SearchSif, Scoup, Metawhale, AFDA | As sprints touch them |

---

## The Team Filter

This workflow makes the gap visible.

A developer using this workflow:
- Starts every session from a clean, scoped context
- Completes most cards in one session
- Fills log fields — contributing to sprint data
- PRs pass Review Buddy on first submission
- Is asking *Claude* the implementation questions, not blocking the Lead

A developer not using this workflow:
- Starts sessions without loading context → asks Lead for direction
- Needs multiple sessions per card → hits limits → blames card scope
- Skips log fields → sprint measurement is incomplete
- PRs fail Buddy review → rework → delay
- Is the bottleneck the workflow was designed to eliminate

The measurement system (Rule 09) makes this objective, not subjective. After 2 sprints, the data tells the story. The decision on team composition follows the data.

---

*Claude Code Workflow v3 — AI-First Engineering*
*Updated: Sprint start — sign ARCHITECTURE.md version and last_verified_sprint on all Tier A context MDs*
