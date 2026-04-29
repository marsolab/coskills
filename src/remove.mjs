import { rm, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { resolveDest } from "./paths.mjs";
import { findSkills } from "./list.mjs";
import * as log from "./log.mjs";

export async function remove(args) {
  const opts = parseRemoveArgs(args);
  if (opts.help) {
    printRemoveHelp();
    return;
  }

  const dest = resolveDest(opts);
  const installed = await findSkills(dest);

  let names = opts.names;
  if (opts.all) names = installed;
  if (!names.length) {
    log.fail("Specify a skill name to remove, or use --all");
    log.pipe();
    log.pipe(`Available: ${installed.join(", ") || "(none)"}`);
    process.exit(1);
  }

  let removed = 0;
  for (const name of names) {
    const dir = join(dest, name);
    try {
      await stat(join(dir, "SKILL.md"));
    } catch {
      log.warn(`Not found: ${name}`);
      continue;
    }
    await rm(dir, { recursive: true, force: true });
    log.success(`Removed ${log.bold(name)}`);
    removed++;
  }
  log.pipe(`${removed} removed from ${log.cyan(prettyPath(dest))}`);
}

function parseRemoveArgs(argv) {
  const out = { global: false, dest: null, names: [], all: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-g" || a === "--global") out.global = true;
    else if (a === "--all") out.all = true;
    else if (a === "--dest") {
      const v = argv[++i];
      if (!v) {
        log.fail("--dest requires a path argument");
        process.exit(1);
      }
      out.dest = v;
    } else if (!a.startsWith("-")) {
      out.names.push(a);
    } else {
      log.warn(`Unknown option: ${a}`);
    }
  }
  return out;
}

function prettyPath(p) {
  const rel = relative(process.cwd(), resolve(p));
  if (!rel.startsWith("..") && !rel.startsWith("/")) return `./${rel}`;
  return p;
}

function printRemoveHelp() {
  process.stderr.write(`\
${log.bold("coskills remove")} - Remove an installed Cowork skill

${log.bold("Usage:")}
  coskills remove [skills...] [options]
  coskills rm     [skills...] [options]

${log.bold("Options:")}
  -g, --global         Remove from ~/.claude/skills (default: project)
  --dest <path>        Override destination directory
  --all                Remove every installed skill in the destination
  -h, --help           Show this help message
`);
}
