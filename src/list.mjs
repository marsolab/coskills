import { readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

import { resolveDest, describeScope } from "./paths.mjs";
import * as log from "./log.mjs";

export async function list(args) {
  const opts = parseListArgs(args);
  if (opts.help) {
    printListHelp();
    return;
  }
  const dest = resolveDest(opts);

  const skills = await findSkills(dest);

  if (opts.json) {
    const out = await Promise.all(
      skills.map(async (name) => {
        const dir = join(dest, name);
        const skillFile = join(dir, "SKILL.md");
        const s = await stat(skillFile);
        return {
          name,
          path: dir,
          modified: s.mtime.toISOString(),
        };
      }),
    );
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return;
  }

  if (skills.length === 0) {
    log.pipe(`No skills installed at ${log.cyan(prettyPath(dest))}`);
    return;
  }

  log.step(
    `${skills.length} ${describeScope(opts)} skill${skills.length === 1 ? "" : "s"} in ${log.cyan(prettyPath(dest))}`,
  );
  for (const name of skills) {
    log.pipe(`  ${log.green("•")} ${log.bold(name)}`);
  }
}

export async function findSkills(dest) {
  let entries;
  try {
    entries = await readdir(dest, { withFileTypes: true });
  } catch {
    return [];
  }
  const dirs = entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();

  const skills = [];
  for (const name of dirs) {
    try {
      const s = await stat(join(dest, name, "SKILL.md"));
      if (s.isFile()) skills.push(name);
    } catch {
      /* directory without a SKILL.md is not a skill */
    }
  }
  return skills;
}

function parseListArgs(argv) {
  const out = { global: false, dest: null, json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-g" || a === "--global") out.global = true;
    else if (a === "--json") out.json = true;
    else if (a === "--dest") {
      const v = argv[++i];
      if (!v) {
        log.fail("--dest requires a path argument");
        process.exit(1);
      }
      out.dest = v;
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

function printListHelp() {
  process.stderr.write(`\
${log.bold("coskills list")} - List installed Cowork skills

${log.bold("Usage:")}
  coskills list [options]
  coskills ls   [options]

${log.bold("Options:")}
  -g, --global         List skills under ~/.claude/skills (default: project)
  --dest <path>        Override destination directory
  --json               Output as JSON (machine-readable, no ANSI codes)
  -h, --help           Show this help message
`);
}
