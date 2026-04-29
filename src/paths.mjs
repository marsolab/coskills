import { homedir } from "node:os";
import { join, isAbsolute, resolve } from "node:path";

export const SKILLS_PARENT_DIR = ".claude";
export const SKILLS_SUBDIR = "skills";

export function resolveDest({ dest, global, cwd = process.cwd() } = {}) {
  if (dest) return isAbsolute(dest) ? dest : resolve(cwd, dest);
  const root = global ? homedir() : cwd;
  return join(root, SKILLS_PARENT_DIR, SKILLS_SUBDIR);
}

export function describeScope({ dest, global }) {
  if (dest) return `custom (${dest})`;
  return global ? "global" : "project";
}
