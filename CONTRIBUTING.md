# Contributing to claude-skills

## Adding a New Skill

### 1. Create the skill folder

```
packages/skills/<your-skill-name>/
  SKILL.md
  references/        (optional — supporting files)
```

### 2. Write SKILL.md

Your `SKILL.md` must start with YAML frontmatter:

```yaml
---
name: your-skill-name
description: >
  One-paragraph description. Include trigger keywords.
triggers:
  - keyword one
  - keyword two
---
```

Followed by the skill content — instructions, behavior rules, output formats, and examples that Claude should follow when the skill is active.

### 3. Add to registry.json

Add an entry to `registry.json` under `"skills"`:

```json
{
  "name": "your-skill-name",
  "displayName": "Your Skill Display Name",
  "version": "1.0.0",
  "description": "Short description shown in 'list' output.",
  "author": "your-github-username",
  "category": "product | engineering | design | other",
  "tags": ["tag1", "tag2"],
  "path": "packages/skills/your-skill-name",
  "installSize": "~Xkb",
  "requiresTools": [],
  "readme": "https://github.com/talisik-ai/claude-skills/tree/main/packages/skills/your-skill-name"
}
```

### 4. Test locally

```bash
# Install your skill from a local path
npx @talisik-ai/claude-skills add your-skill-name --dir ./test-install

# Verify SKILL.md was installed
ls ./test-install/your-skill-name/
```

### 5. Open a PR

- Branch from `main`
- Title: `feat: add <skill-name> skill`
- Include a brief description of what the skill does and when it triggers

## Skill Quality Guidelines

- **Trigger conditions** must be specific — avoid broad terms that conflict with other skills
- **Output formats** should be copy-pasteable and immediately useful
- **Behavior rules** should cover edge cases and what NOT to do
- **Examples** should demonstrate real-world usage, not toy scenarios
- Keep SKILL.md under 10KB — link to references/ for large supporting material

## Code Changes

For CLI changes (src/), ensure:
- TypeScript compiles without errors (`npm run build`)
- All imports use `.js` extensions (NodeNext ESM requirement)
- Commands follow the existing pattern (Commander + ora + chalk + try/catch)
