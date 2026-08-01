import type { SkillGroup } from "./types";

// Canonical category buckets, in display order. Mirrors the backend seed.
export const SKILL_CATEGORIES = [
  "Languages",
  "Frameworks & Libraries",
  "Databases",
  "Tools & Infra",
] as const;

// flattenSkills collapses the grouped skills into one ordered, de-duplicated
// list — the mirror of the backend's SiteContent.AllSkills. Used wherever a
// flat token list or a total count is needed.
export function flattenSkills(groups: SkillGroup[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const g of groups) {
    for (const it of g.items) {
      const key = it.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}
