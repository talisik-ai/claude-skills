# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**@talisikai/claude-skills** — an npm CLI that installs specialized Claude instruction sets (skills) for software teams. Users run `npx @talisikai/claude-skills add <skill-name>` to install a SKILL.md into their Claude skills directory.

## Build & Dev Commands

```bash
npm run build          # Compile TypeScript (src/ → dist/)
npm run dev            # Run CLI in dev mode with tsx hot reload
npm run prepublishOnly # Auto-build before npm publish
```

No test runner is configured. To test a skill locally:

```bash
npx @talisikai/claude-skills add <skill-name> --dir ./test-install
ls ./test-install/<skill-name>/
```

## Architecture

```
src/                      # CLI implementation (TypeScript, ESM)
├── index.ts              # Entry point (Commander program)
├── commands/             # One file per CLI command (add, list, search, update, remove)
└── utils/
    ├── installer.ts      # Download & extract skills from GitHub
    ├── paths.ts          # Platform-specific install directories
    └── registry.ts       # Load & filter registry.json

packages/skills/          # 16 skill packages (source of truth)
└── <skill-name>/
    ├── SKILL.md          # Instruction file with YAML frontmatter (name, description, triggers)
    └── references/       # Optional supporting files

registry.json             # Central index of all skills — CLI reads this to list/search/install
```

**Data flow**: CLI fetches `registry.json` → finds skill entry → downloads from `packages/skills/<name>/` → copies to user's platform-specific Claude skills directory.

**Install targets**:
- macOS: `~/Library/Application Support/Claude/skills/`
- Linux: `~/.claude/skills/`
- Windows: `%APPDATA%\Claude\skills\`

## Key Conventions

- **ESM + NodeNext**: All imports must use `.js` extensions (e.g., `import { foo } from './utils/paths.js'`), even for `.ts` source files. This is a NodeNext module resolution requirement.
- **Command pattern**: Each command in `src/commands/` follows Commander + ora spinner + chalk colors + try/catch error handling.
- **Skill frontmatter**: Every SKILL.md starts with YAML frontmatter containing `name`, `description`, and optionally `triggers`.
- **Registry sync**: When adding a new skill, both `packages/skills/<name>/SKILL.md` and `registry.json` must be updated together. The registry entry needs: name, displayName, version, description, author, category, tags, path, installSize.
- **Skill size limit**: Keep SKILL.md under 10KB. Use a `references/` subfolder for large supporting material.
- **Categories**: Skills are categorized as `product`, `engineering`, or `design` in the registry.

## Adding a New Skill

1. Create `packages/skills/<skill-name>/SKILL.md` with YAML frontmatter
2. Add optional `references/` directory for supporting files
3. Add entry to `registry.json` under `"skills"` array
4. Test: `npx @talisikai/claude-skills add <skill-name> --dir ./test-install`
5. Commit with message: `feat: add <skill-name> skill`

## Non-CLI Content

- `docs/` contains team workflow documentation, HTML presentations, and PRD artifacts — these are not part of the npm package
- `.claude/skills/` contains locally installed skills for this repo's own development — not published
