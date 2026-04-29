import { homedir } from "node:os";
import { join, isAbsolute, resolve } from "node:path";

export const COWORK_DIR_NAME = ".cowork";
export const SKILLS_SUBDIR = "skills";

export interface ScopeOptions {
  dest?: string | null;
  global?: boolean;
  cwd?: string;
}

export function resolveDest(opts: ScopeOptions = {}): string {
  const { dest, global, cwd = process.cwd() } = opts;
  if (dest) return isAbsolute(dest) ? dest : resolve(cwd, dest);
  const root = global ? homedir() : cwd;
  return join(root, COWORK_DIR_NAME, SKILLS_SUBDIR);
}

export function describeScope({ dest, global }: ScopeOptions): string {
  if (dest) return `custom (${dest})`;
  return global ? "global" : "project";
}
