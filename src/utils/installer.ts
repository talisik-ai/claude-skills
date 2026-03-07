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
