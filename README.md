# ⚡ Talisk AI Claude Skills

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

| Skill | Category | Description |
|-------|----------|-------------|
| `prd-assessment` | Product | Structured PRD interview → complete Markdown document |
| `qa-engineer` | Engineering | Test plans, test cases, bug reports, QA estimation |
| `frontend-spec` | Engineering | Component specs with TypeScript interfaces and usage examples |

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
- [x] `prd-assessment` skill
- [x] `qa-engineer` skill  
- [x] `frontend-spec` skill
- [ ] `standup-writer` skill
- [ ] `api-spec` skill (OpenAPI generation)
- [ ] `claude-skills init` — interactive skill scaffold generator
- [ ] Web registry UI at `skills.talisik-ai`
- [ ] Community skill submissions

---

## License

MIT © [talisik-ai](https://github.com/talisik-ai)
