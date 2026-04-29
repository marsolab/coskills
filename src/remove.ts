import { readdir, rm, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { resolveDest } from "./paths.js";
import * as log from "./log.js";

interface RemoveOptions {
  global: boolean;
  dest: string | null;
  names: string[];
  all: boolean;
  help: boolean;
}

export async function remove(args: string[]): Promise<void> {
  const opts = parseRemoveArgs(args);
  if (opts.help) {
    printRemoveHelp();
    return;
  }

  const dest = resolveDest(opts);

  let entries: string[];
  try {
    entries = await readdir(dest);
  } catch {
    log.pipe(`No skills bundled at ${log.cyan(prettyPath(dest))}`);
    return;
  }
  const skills = entries.filter((n) => n.endsWith(".skill"));

  let names = opts.names;
  if (opts.all) {
    names = skills.map((n) => n.replace(/\.skill$/, ""));
  }
  if (!names.length) {
    log.fail("Specify a skill name to remove, or use --all");
    log.pipe();
    log.pipe(
      `Available: ${skills.map((s) => s.replace(/\.skill$/, "")).join(", ") || "(none)"}`,
    );
    process.exit(1);
  }

  let removed = 0;
  for (const name of names) {
    const file = join(dest, `${name}.skill`);
    try {
      await stat(file);
    } catch {
      log.warn(`Not found: ${name}`);
      continue;
    }
    await rm(file, { force: true });
    log.success(`Removed ${log.bold(name)}`);
    removed++;
  }
  log.pipe(`${removed} removed from ${log.cyan(prettyPath(dest))}`);
}

function parseRemoveArgs(argv: string[]): RemoveOptions {
  const out: RemoveOptions = {
    global: false,
    dest: null,
    names: [],
    all: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
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

function prettyPath(p: string): string {
  const rel = relative(process.cwd(), resolve(p));
  if (!rel.startsWith("..") && !rel.startsWith("/")) return `./${rel}`;
  return p;
}

function printRemoveHelp(): void {
  process.stderr.write(`\
${log.bold("coskills remove")} - Remove bundled Cowork skill archives

${log.bold("Usage:")}
  coskills remove [skills...] [options]
  coskills rm     [skills...] [options]

${log.bold("Options:")}
  -g, --global         Remove from ~/.cowork/skills (default: project)
  --dest <path>        Override destination directory
  --all                Remove every archive in the destination
  -h, --help           Show this help message
`);
}
