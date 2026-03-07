# ⚡ Talisik AI Claude Skills

[![npm version](https://img.shields.io/npm/v/@talisik-ai/claude-skills)](https://www.npmjs.com/package/@talisik-ai/claude-skills)
[![license](https://img.shields.io/github/license/talisik-ai/claude-skills)](./LICENSE)

> Specialized Claude skills for software teams — installable in one command.

```bash
npx @talisik-ai/claude-skills add prd-assessment
```

---

## What are Skills?

Skills are specialized instruction sets for Claude that extend its behavior for specific workflows — like generating PRDs, writing QA test cases, or creating frontend component specs. Install them once, and Claude automatically uses them when relevant.

---

## Available Skills

### Product

| Skill | Role | Description |
|-------|------|-------------|
| `prd-assessment` | Lead | Three-mode PRD skill: CREATE (interview → new PRD), ASSESS (PRD → impact assessment), PIVOT (direction change → impact assessment with invalidation) |
| `card-generator` | Lead | Reads an impact assessment and generates a Jira-ready card list grouped by role. Auto-splits L/XL estimates. |

### Engineering

| Skill | Role | Description |
|-------|------|-------------|
| `coding-standards` | All | Template skill for enforcing team coding patterns. Ships with `[FILL IN]` placeholders — Lead populates once per project. |
| `fe-best-practices` | Frontend | Best practices for React + Tailwind + shadcn/ui + React Query, organized by concern. |
| `be-best-practices` | Backend | Best practices for Node.js + Zod + Prisma + PostgreSQL + MongoDB + Redis, organized by concern. |
| `pre-review-checklist` | Review Buddy | Structured 5-check PR gate before QA or Lead review. Outputs PASS or FAIL with specific callouts. |
| `context-audit` | Lead | Sprint-start context health check. Compares a module's context MD against actual files. Outputs CLEAN / STALE / OUTDATED. |
| `devops-infra` | DevOps | Full deployment cycle: protocol, pre-deploy checklist, Sentry monitoring, changelog, CI/CD patterns, rollback. |
| `qa-engineer` | QA | Test plans, test cases, bug reports, and QA estimation. |
| `frontend-spec` | Frontend | Component specs with TypeScript interfaces and usage examples. |

---

## Installation

### Install a skill

```bash
npx @talisik-ai/claude-skills add prd-assessment
```

### List all available skills

```bash
npx @talisik-ai/claude-skills list
```

### Search skills

```bash
npx @talisik-ai/claude-skills search "testing"
```

### Update all skills

```bash
npx @talisik-ai/claude-skills update
```

### Remove a skill

```bash
npx @talisik-ai/claude-skills remove prd-assessment
```

---

## Skills Directory

By default, skills are installed to:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/skills/` |
| Windows | `%APPDATA%\Claude\skills\` |
| Linux | `~/.claude/skills/` |

Use `--dir` to override:

```bash
npx @talisik-ai/claude-skills add prd-assessment --dir ./my-skills
```

---

## Adding a New Skill

1. Create a folder under `packages/skills/your-skill-name/`
2. Add `SKILL.md` with YAML frontmatter (`name`, `description`)
3. Add any reference files in a `references/` subfolder
4. Add an entry to `registry.json`
5. Open a PR

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

---

## Roadmap

- [x] CLI install / list / update / remove / search
- [x] `prd-assessment` v2 — three-mode PRD skill (CREATE / ASSESS / PIVOT)
- [x] `card-generator` — impact assessment → Jira cards
- [x] `coding-standards` — team pattern template
- [x] `fe-best-practices` — React + Tailwind + shadcn + React Query
- [x] `be-best-practices` — Node + Zod + Prisma + PostgreSQL + MongoDB + Redis
- [x] `pre-review-checklist` — 5-check PR gate
- [x] `context-audit` — sprint-start context health check
- [x] `devops-infra` — deployment protocol + Sentry + rollback
- [x] `qa-engineer` skill
- [x] `frontend-spec` skill
- [ ] `ml-workflow` skill (model pipeline, data handling, inference patterns)
- [ ] `claude-skills init` — interactive skill scaffold generator
- [ ] Web registry UI at `skills.talisik-ai`
- [ ] Community skill submissions

---

## License

MIT © [talisik-ai](https://github.com/talisik-ai)
