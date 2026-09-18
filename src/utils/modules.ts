import type { ApiModule } from '@/api';

export const getParentId = (mod: ApiModule): string | null => {
  if (!mod.parentId) return null;
  return typeof mod.parentId === 'object' ? mod.parentId._id : mod.parentId;
};

/** URL segment for a module name, e.g. "First Entry" -> "first-entry". */
export const toSlug = (name: string) => name.toLowerCase().replace(/\s+/g, '-');

/**
 * Resolve URL segments to the chain of modules they name, root first.
 * `matched` is how many leading segments resolved; the rest (if any) matched no child module.
 */
export function resolveModuleTrail(modules: ApiModule[], segments: string[]): { trail: ApiModule[]; matched: number } {
  const trail: ApiModule[] = [];
  let parentId: string | null = null;
  for (const segment of segments) {
    const slug = segment.toLowerCase();
    const next = modules.find(m => getParentId(m) === parentId && toSlug(m.name) === slug);
    if (!next) break;
    trail.push(next);
    parentId = next._id;
  }
  return { trail, matched: trail.length };
}
