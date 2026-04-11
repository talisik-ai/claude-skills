# Claude Skills CLI — Full Scaffold Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the complete TypeScript CLI and skill content files from scratch so `npx @talisik-ai/claude-skills` works end-to-end.

**Architecture:** Commander-based CLI that reads a remote `registry.json`, downloads skill zip archives from GitHub, and installs `SKILL.md` files into the platform-appropriate Claude skills directory. Each command is a standalone module under `src/commands/`. Shared utilities live in `src/utils/`.

**Tech Stack:** TypeScript 5, Node 18+, commander, chalk, ora, prompts, adm-zip, node-fetch

---

### Task 1: TypeScript config + project structure

**Files:**
- Create: `tsconfig.json`
- Create: `src/index.ts`

**Step 1: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 2: Create src/index.ts (CLI entry)**

```typescript
#!/usr/bin/env node
import { program } from 'commander';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { updateCommand } from './commands/update.js';
import { removeCommand } from './commands/remove.js';

program
  .name('claude-skills')
  .description('Install and manage talisik-ai Claude skills')
  .version('1.0.0');

program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(searchCommand);
program.addCommand(updateCommand);
program.addCommand(removeCommand);

program.parse();
```

**Step 3: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, no errors

**Step 4: Commit**

```bash
git add tsconfig.json src/index.ts package.json package-lock.json
git commit -m "feat: add tsconfig and CLI entry point"
```

---

### Task 2: Utility — skill install paths

**Files:**
- Create: `src/utils/paths.ts`

**Step 1: Create paths.ts**

```typescript
import os from 'os';
import path from 'path';

export function getDefaultSkillsDir(): string {
  const platform = process.platform;

  if (platform === 'darwin') {
    return path.join(
      os.homedir(),
      'Library',
      'Application Support',
      'Claude',
      'skills'
    );
  }

  if (platform === 'win32') {
    const appData = process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming');
    return path.join(appData, 'Claude', 'skills');
  }

  // Linux / fallback
  return path.join(os.homedir(), '.claude', 'skills');
}
```

**Step 2: Commit**

```bash
git add src/utils/paths.ts
git commit -m "feat: add cross-platform skill install path resolver"
```

---

### Task 3: Utility — registry fetcher

**Files:**
- Create: `src/utils/registry.ts`

**Step 1: Create registry.ts**

```typescript
import fetch from 'node-fetch';

const REGISTRY_URL =
  'https://raw.githubusercontent.com/talisik-ai/claude-skills/main/registry.json';

export interface SkillEntry {
  name: string;
  displayName: string;
  version: string;
  description: string;
  author: string;
  category: string;
  tags: string[];
  path: string;
  installSize: string;
  requiresTools: string[];
  readme: string;
}

export interface Registry {
  version: string;
  updatedAt: string;
  skills: SkillEntry[];
}

export async function fetchRegistry(): Promise<Registry> {
  const res = await fetch(REGISTRY_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch registry: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<Registry>;
}

export function findSkill(registry: Registry, name: string): SkillEntry | undefined {
  return registry.skills.find((s) => s.name === name);
}
```

**Step 2: Commit**

```bash
git add src/utils/registry.ts
git commit -m "feat: add registry fetcher and skill types"
```

---

### Task 4: Utility — skill installer (download + extract)

**Files:**
- Create: `src/utils/installer.ts`

**Step 1: Create installer.ts**

```typescript
import fetch from 'node-fetch';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import type { SkillEntry } from './registry.js';

const GITHUB_ZIP_BASE =
  'https://github.com/talisik-ai/claude-skills/archive/refs/heads/main.zip';

// Cached zip buffer per session
let cachedZip: AdmZip | null = null;

async function getRepoZip(): Promise<AdmZip> {
  if (cachedZip) return cachedZip;

  const res = await fetch(GITHUB_ZIP_BASE);
  if (!res.ok) {
    throw new Error(`Failed to download repo: ${res.status}`);
  }

  const buffer = await res.arrayBuffer();
  cachedZip = new AdmZip(Buffer.from(buffer));
  return cachedZip;
}

export async function installSkill(
  skill: SkillEntry,
  targetDir: string
): Promise<void> {
  fs.mkdirSync(targetDir, { recursive: true });

  const zip = await getRepoZip();

  // Zip entries are prefixed with "claude-skills-main/"
  const prefix = `claude-skills-main/${skill.path}/`;

  const entries = zip
    .getEntries()
    .filter((e) => e.entryName.startsWith(prefix) && !e.isDirectory);

  if (entries.length === 0) {
    throw new Error(`No files found for skill "${skill.name}" in archive`);
  }

  for (const entry of entries) {
    const relativePath = entry.entryName.slice(prefix.length);
    const destPath = path.join(targetDir, relativePath);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.writeFileSync(destPath, entry.getData());
  }
}

export function isSkillInstalled(targetDir: string): boolean {
  return (
    fs.existsSync(targetDir) &&
    fs.existsSync(path.join(targetDir, 'SKILL.md'))
  );
}

export function removeSkillDir(targetDir: string): void {
  fs.rmSync(targetDir, { recursive: true, force: true });
}
```

**Step 2: Commit**

```bash
git add src/utils/installer.ts
git commit -m "feat: add skill installer using GitHub zip download"
```

---

### Task 5: Command — `add`

**Files:**
- Create: `src/commands/add.ts`

**Step 1: Create add.ts**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { fetchRegistry, findSkill } from '../utils/registry.js';
import { installSkill, isSkillInstalled } from '../utils/installer.js';
import { getDefaultSkillsDir } from '../utils/paths.js';

export const addCommand = new Command('add')
  .description('Install a skill')
  .argument('<skill-name>', 'Name of the skill to install')
  .option('--dir <path>', 'Custom install directory')
  .action(async (skillName: string, opts: { dir?: string }) => {
    const spinner = ora(`Looking up "${skillName}"...`).start();

    try {
      const registry = await fetchRegistry();
      const skill = findSkill(registry, skillName);

      if (!skill) {
        spinner.fail(chalk.red(`Skill "${skillName}" not found in registry.`));
        console.log(
          chalk.dim(`  Run ${chalk.white('claude-skills list')} to see available skills.`)
        );
        process.exit(1);
      }

      const baseDir = opts.dir ?? getDefaultSkillsDir();
      const targetDir = path.join(baseDir, skill.name);

      if (isSkillInstalled(targetDir)) {
        spinner.warn(chalk.yellow(`"${skill.displayName}" is already installed.`));
        console.log(chalk.dim(`  Location: ${targetDir}`));
        return;
      }

      spinner.text = `Downloading ${skill.displayName} v${skill.version}...`;
      await installSkill(skill, targetDir);

      spinner.succeed(
        chalk.green(`Installed ${chalk.bold(skill.displayName)} v${skill.version}`)
      );
      console.log(chalk.dim(`  Location: ${targetDir}`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
```

**Step 2: Commit**

```bash
git add src/commands/add.ts
git commit -m "feat: add 'add' command to install skills"
```

---

### Task 6: Command — `list`

**Files:**
- Create: `src/commands/list.ts`

**Step 1: Create list.ts**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { fetchRegistry } from '../utils/registry.js';

export const listCommand = new Command('list')
  .description('List all available skills')
  .action(async () => {
    const spinner = ora('Fetching registry...').start();

    try {
      const registry = await fetchRegistry();
      spinner.stop();

      console.log(chalk.bold(`\n Available Skills (${registry.skills.length})\n`));

      for (const skill of registry.skills) {
        console.log(
          `  ${chalk.cyan(skill.name.padEnd(20))} ${chalk.dim(`v${skill.version}`)}  ${skill.description.split('.')[0]}.`
        );
      }

      console.log(
        `\n  Install with: ${chalk.white('npx @talisik-ai/claude-skills add <name>')}\n`
      );
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
```

**Step 2: Commit**

```bash
git add src/commands/list.ts
git commit -m "feat: add 'list' command to show available skills"
```

---

### Task 7: Command — `search`

**Files:**
- Create: `src/commands/search.ts`

**Step 1: Create search.ts**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { fetchRegistry } from '../utils/registry.js';

export const searchCommand = new Command('search')
  .description('Search skills by keyword')
  .argument('<query>', 'Search term')
  .action(async (query: string) => {
    const spinner = ora('Searching...').start();

    try {
      const registry = await fetchRegistry();
      const q = query.toLowerCase();

      const results = registry.skills.filter(
        (s) =>
          s.name.includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.includes(q)) ||
          s.category.includes(q)
      );

      spinner.stop();

      if (results.length === 0) {
        console.log(chalk.yellow(`\n  No skills matched "${query}".\n`));
        return;
      }

      console.log(chalk.bold(`\n Results for "${query}" (${results.length})\n`));

      for (const skill of results) {
        const tags = skill.tags.map((t) => chalk.dim(`#${t}`)).join(' ');
        console.log(`  ${chalk.cyan(skill.name.padEnd(20))} ${skill.description.split('.')[0]}.`);
        console.log(`  ${' '.repeat(20)} ${tags}`);
        console.log();
      }
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
```

**Step 2: Commit**

```bash
git add src/commands/search.ts
git commit -m "feat: add 'search' command with tag and keyword matching"
```

---

### Task 8: Command — `update`

**Files:**
- Create: `src/commands/update.ts`

**Step 1: Create update.ts**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import fs from 'fs';
import { fetchRegistry } from '../utils/registry.js';
import { installSkill, isSkillInstalled, removeSkillDir } from '../utils/installer.js';
import { getDefaultSkillsDir } from '../utils/paths.js';

export const updateCommand = new Command('update')
  .description('Update all installed skills')
  .option('--dir <path>', 'Custom install directory')
  .action(async (opts: { dir?: string }) => {
    const baseDir = opts.dir ?? getDefaultSkillsDir();

    if (!fs.existsSync(baseDir)) {
      console.log(chalk.yellow('\n  No skills installed yet.\n'));
      return;
    }

    const spinner = ora('Fetching registry...').start();

    try {
      const registry = await fetchRegistry();

      const installedNames = fs
        .readdirSync(baseDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      const toUpdate = registry.skills.filter((s) => installedNames.includes(s.name));

      if (toUpdate.length === 0) {
        spinner.warn('No installed skills found in registry.');
        return;
      }

      spinner.stop();

      for (const skill of toUpdate) {
        const skillSpinner = ora(`Updating ${skill.displayName}...`).start();
        const targetDir = path.join(baseDir, skill.name);

        if (isSkillInstalled(targetDir)) {
          removeSkillDir(targetDir);
        }

        await installSkill(skill, targetDir);
        skillSpinner.succeed(chalk.green(`Updated ${chalk.bold(skill.displayName)} v${skill.version}`));
      }

      console.log(chalk.dim(`\n  All skills updated.\n`));
    } catch (err) {
      spinner.fail(chalk.red(`Failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });
```

**Step 2: Commit**

```bash
git add src/commands/update.ts
git commit -m "feat: add 'update' command to refresh all installed skills"
```

---

### Task 9: Command — `remove`

**Files:**
- Create: `src/commands/remove.ts`

**Step 1: Create remove.ts**

```typescript
import { Command } from 'commander';
import chalk from 'chalk';
import prompts from 'prompts';
import path from 'path';
import { isSkillInstalled, removeSkillDir } from '../utils/installer.js';
import { getDefaultSkillsDir } from '../utils/paths.js';

export const removeCommand = new Command('remove')
  .description('Remove an installed skill')
  .argument('<skill-name>', 'Name of the skill to remove')
  .option('--dir <path>', 'Custom install directory')
  .option('-y, --yes', 'Skip confirmation prompt')
  .action(async (skillName: string, opts: { dir?: string; yes?: boolean }) => {
    const baseDir = opts.dir ?? getDefaultSkillsDir();
    const targetDir = path.join(baseDir, skillName);

    if (!isSkillInstalled(targetDir)) {
      console.log(chalk.yellow(`\n  Skill "${skillName}" is not installed.\n`));
      return;
    }

    if (!opts.yes) {
      const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: `Remove "${skillName}"?`,
        initial: false,
      });

      if (!confirmed) {
        console.log(chalk.dim('  Aborted.'));
        return;
      }
    }

    removeSkillDir(targetDir);
    console.log(chalk.green(`\n  Removed "${skillName}".\n`));
  });
```

**Step 2: Commit**

```bash
git add src/commands/remove.ts
git commit -m "feat: add 'remove' command with confirmation prompt"
```

---

### Task 10: Skill content — prd-assessment

**Files:**
- Create: `packages/skills/prd-assessment/SKILL.md`

**Step 1: Create SKILL.md**

```markdown
---
name: prd-assessment
description: >
  Conducts a structured interview and generates a complete Product Requirements Document as a Markdown file.
  Triggers on: PRD, product spec, feature doc, requirements document.
triggers:
  - PRD
  - product requirements
  - product spec
  - feature document
  - requirements document
---

# PRD Assessment Skill

You are a senior product manager conducting a structured product discovery interview. When triggered, follow this exact workflow.

## Trigger Conditions

Activate when the user mentions any of:
- "write a PRD", "create a PRD", "product requirements document"
- "product spec", "feature spec", "requirements document"
- "help me define this feature"

## Interview Phase

Conduct a structured interview with these questions (ask 2-3 at a time, not all at once):

**Round 1 — Problem Space**
1. What problem are we solving, and who has it?
2. How do users currently solve this problem (if at all)?
3. What does success look like in 6 months?

**Round 2 — Scope**
4. What is explicitly IN scope for v1?
5. What is explicitly OUT of scope?
6. Are there hard constraints (technical, legal, timeline)?

**Round 3 — Detail**
7. Who are the primary user personas?
8. What are the key user flows / jobs-to-be-done?
9. What are the acceptance criteria for "done"?

**Round 4 — Risk**
10. What assumptions are we making that could be wrong?
11. What are the biggest risks to delivery?

## Output Format

After the interview, generate a complete PRD as a Markdown file:

```markdown
# [Feature Name] — Product Requirements Document

**Status:** Draft
**Author:** [from context]
**Date:** [today]
**Version:** 1.0

---

## Executive Summary

[2-3 sentence summary of the feature and its business value]

## Problem Statement

### The Problem
[Clear description of the pain point]

### Current State
[How users solve it today]

### Desired State
[How they will solve it with this feature]

## Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| [goal] | [metric] | [target] |

## Scope

### In Scope (v1)
- [item]

### Out of Scope
- [item]

### Future Considerations
- [item]

## User Personas

### [Persona Name]
- **Role:**
- **Goals:**
- **Pain Points:**

## User Stories & Acceptance Criteria

### Story 1: [Title]
**As a** [persona], **I want to** [action], **so that** [benefit].

**Acceptance Criteria:**
- [ ] [criterion]

## Technical Considerations

[Any technical constraints, dependencies, or architecture notes surfaced during interview]

## Risks & Assumptions

| Type | Description | Mitigation |
|------|-------------|------------|
| Risk | [risk] | [mitigation] |
| Assumption | [assumption] | [validation approach] |

## Open Questions

- [ ] [question]

## Appendix

[Any additional context, research, or reference materials]
```

## Behavior Rules

- Ask clarifying questions before generating — never assume
- Keep interview conversational, not form-like
- Generate the full document in one response after interview
- Save the PRD as a `.md` file if the user provides a filename
- Flag any gaps or contradictions discovered during interview
```

**Step 2: Commit**

```bash
git add packages/skills/prd-assessment/SKILL.md
git commit -m "feat: add prd-assessment skill content"
```

---

### Task 11: Skill content — qa-engineer

**Files:**
- Create: `packages/skills/qa-engineer/SKILL.md`

**Step 1: Create SKILL.md**

```markdown
---
name: qa-engineer
description: >
  Helps define test strategies, write test cases, classify bugs, estimate story points,
  and generate QA documentation for software teams.
triggers:
  - test plan
  - test cases
  - QA
  - bug report
  - quality assurance
  - test strategy
---

# QA Engineer Skill

You are a senior QA engineer embedded in a software development team. Help with all quality assurance tasks using industry-standard practices.

## Trigger Conditions

Activate when the user mentions:
- "write test cases", "create a test plan", "QA strategy"
- "bug report", "classify this bug", "regression test"
- "estimate QA effort", "QA story points"

## Capabilities

### 1. Test Plans

Generate structured test plans with:
- Scope and objectives
- Test types (unit, integration, E2E, performance, security)
- Entry/exit criteria
- Environment requirements
- Risk-based prioritization

### 2. Test Cases

Write test cases in this format:

```
TC-[ID]: [Title]
Priority: P0 / P1 / P2 / P3
Type: Functional | Regression | Smoke | Edge Case

Preconditions:
- [condition]

Steps:
1. [step]
2. [step]

Expected Result:
[clear, observable outcome]

Notes:
[edge cases, data dependencies]
```

### 3. Bug Reports

Classify and document bugs:

```
Bug ID: BUG-[ID]
Title: [concise description]
Severity: Critical / High / Medium / Low
Priority: P0 / P1 / P2 / P3
Status: Open

Environment:
- OS:
- Browser/Version:
- App Version:

Steps to Reproduce:
1.
2.

Expected Behavior:
[what should happen]

Actual Behavior:
[what actually happens]

Root Cause Analysis:
[if known]

Attachments:
[screenshots, logs, recordings]
```

### 4. QA Estimation

Estimate QA effort using this model:
- **Smoke suite:** 0.5 days
- **Happy path coverage:** 1 day per major flow
- **Edge case coverage:** 1.5x happy path
- **Regression suite execution:** 0.5 days per sprint
- **Bug triage & retest:** 20% of total estimate

Provide estimates as story points (Fibonacci) with rationale.

### 5. Test Strategy

When asked for a QA strategy, cover:
- Testing pyramid (unit / integration / E2E ratio)
- Automation strategy and tooling
- CI/CD integration points
- Definition of Done from QA perspective
- Risk areas requiring extra attention

## Behavior Rules

- Always ask for the feature/story context before writing test cases
- Prioritize P0/P1 coverage before P2/P3
- Flag untestable requirements and request clarification
- Recommend test automation for regression-prone areas
- Use Given/When/Then format for BDD when appropriate
```

**Step 2: Commit**

```bash
git add packages/skills/qa-engineer/SKILL.md
git commit -m "feat: add qa-engineer skill content"
```

---

### Task 12: Skill content — frontend-spec

**Files:**
- Create: `packages/skills/frontend-spec/SKILL.md`

**Step 1: Create SKILL.md**

```markdown
---
name: frontend-spec
description: >
  Generates detailed frontend component specs, design tokens, and implementation guides
  optimized for AI-assisted development with React/TypeScript.
triggers:
  - component spec
  - frontend spec
  - UI spec
  - React component
  - design spec
---

# Frontend Spec Writer Skill

You are a senior frontend architect generating precise component specifications optimized for implementation by AI coding tools (Claude Code, Copilot, Cursor).

## Trigger Conditions

Activate when the user mentions:
- "write a component spec", "frontend spec", "UI spec"
- "spec out this component", "document this component"
- "React component spec", "TypeScript interface for..."

## Output Format

Generate specs in this exact structure:

---

```markdown
# [ComponentName] Spec

**Status:** Draft | Review | Approved
**Category:** [UI Primitive | Layout | Feature | Page]
**Design Ref:** [Figma link or N/A]

---

## Overview

[1-2 sentence description of what this component does and where it's used]

## TypeScript Interface

```typescript
export interface [ComponentName]Props {
  // Required props
  [propName]: [type]; // [description]

  // Optional props
  [propName]?: [type]; // [description] — default: [value]

  // Event handlers
  on[Event]?: (payload: [type]) => void;

  // Render props / slots
  [slotName]?: React.ReactNode;
}
```

## Variants

| Variant | Props | Description |
|---------|-------|-------------|
| Default | `variant="default"` | [description] |
| [Name] | `variant="[name]"` | [description] |

## States

| State | Trigger | Visual Change |
|-------|---------|---------------|
| Default | — | [description] |
| Hover | Mouse enter | [description] |
| Active | Click/focus | [description] |
| Disabled | `disabled={true}` | [description] |
| Loading | `loading={true}` | [description] |
| Error | `error="..."` | [description] |

## Design Tokens

```typescript
// Spacing
const spacing = {
  padding: '12px 16px',   // internal padding
  gap: '8px',              // gap between elements
  margin: '0',             // external margin (handled by parent)
};

// Typography
const typography = {
  fontSize: '14px',        // var(--text-sm)
  fontWeight: '500',       // var(--font-medium)
  lineHeight: '20px',
};

// Colors
const colors = {
  background: 'var(--color-surface)',
  text: 'var(--color-text-primary)',
  border: 'var(--color-border)',
  focus: 'var(--color-primary-500)',
};
```

## Usage Examples

### Basic

```tsx
<[ComponentName]
  [requiredProp]={value}
/>
```

### With Optional Props

```tsx
<[ComponentName]
  [requiredProp]={value}
  [optionalProp]={value}
  on[Event]={(payload) => handleEvent(payload)}
/>
```

### In Context

```tsx
// Where this component typically lives
function [ParentComponent]() {
  return (
    <[ComponentName]
      [props]
    />
  );
}
```

## Accessibility

- **Role:** `[ARIA role]`
- **Keyboard:** [Tab behavior, Enter/Space actions]
- **ARIA attributes:** `aria-[attr]="[value]"`
- **Focus management:** [description]
- **Screen reader:** [what SR announces]

## Implementation Notes

- [Key constraint or pattern to follow]
- [Dependencies or peer components needed]
- [Performance considerations]
- [Do NOT do X — common mistake]

## Acceptance Criteria

- [ ] Renders all variants without errors
- [ ] All states are visually distinct
- [ ] Keyboard navigation works correctly
- [ ] Screen reader announces correctly
- [ ] Design tokens match Figma spec
- [ ] Unit tests cover all props and events
```
---

## Interview Questions

Before writing the spec, ask:
1. What is the primary use case for this component?
2. What variants or states are needed?
3. Is there a Figma design to reference?
4. What's the parent context (where will it be used)?
5. Any accessibility requirements beyond WCAG AA?

## Behavior Rules

- Always include TypeScript interfaces — never use `any`
- Generate complete, copy-pasteable usage examples
- Flag missing design decisions as open questions
- Recommend splitting if component scope is too broad
- Reference existing design tokens if the codebase uses a token system
```

**Step 2: Commit**

```bash
git add packages/skills/frontend-spec/SKILL.md
git commit -m "feat: add frontend-spec skill content"
```

---

### Task 13: Build and verify

**Step 1: Build the TypeScript**

Run: `npm run build`
Expected: `dist/` directory created with `.js` files, no errors

**Step 2: Smoke test the CLI**

Run: `node dist/index.js --help`
Expected: Shows commands: add, list, search, update, remove

Run: `node dist/index.js list`
Expected: Fetches registry and displays the 3 skills

**Step 3: Fix any build errors**

If TypeScript errors appear:
- Check import paths end in `.js` (required for NodeNext module resolution)
- Verify all types are imported correctly

**Step 4: Commit**

```bash
git add dist/
git commit -m "build: add compiled output"
```

---

### Task 14: Housekeeping files

**Files:**
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`

**Step 1: Create LICENSE**

```
MIT License

Copyright (c) 2026 talisik-ai

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Step 2: Create CONTRIBUTING.md**

See content in implementation — covers skill folder structure, SKILL.md frontmatter requirements, registry.json entry format, and PR process.

**Step 3: Commit**

```bash
git add LICENSE CONTRIBUTING.md
git commit -m "docs: add LICENSE and CONTRIBUTING guide"
```

---

### Task 15: Add .gitignore and .npmignore

**Files:**
- Create: `.gitignore`
- Create: `.npmignore`

**Step 1: Create .gitignore**

```
node_modules/
dist/
*.js.map
.DS_Store
```

**Step 2: Create .npmignore**

```
src/
docs/
packages/
tsconfig.json
*.md
!README.md
.git/
.gitignore
```

**Step 3: Commit**

```bash
git add .gitignore .npmignore
git commit -m "chore: add .gitignore and .npmignore"
```
