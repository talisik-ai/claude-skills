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
