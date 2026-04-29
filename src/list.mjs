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

  let entries;
  try {
    entries = await readdir(dest, { withFileTypes: true });
  } catch {
    if (opts.json) {
      process.stdout.write("[]\n");
      return;
    }
    log.pipe(`No skills installed at ${log.cyan(prettyPath(dest))}`);
    return;
  }

  const skills = entries
    .filter((e) => e.isFile() && e.name.endsWith(".skill"))
    .map((e) => e.name)
    .sort();

  if (opts.json) {
    const out = await Promise.all(
      skills.map(async (file) => {
        const s = await stat(join(dest, file));
        return {
          name: file.replace(/\.skill$/, ""),
          path: join(dest, file),
          size: s.size,
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

  log.step(`${skills.length} ${describeScope(opts)} skill${skills.length === 1 ? "" : "s"} in ${log.cyan(prettyPath(dest))}`);
  for (const file of skills) {
    const s = await stat(join(dest, file));
    log.pipe(
      `  ${log.green("•")} ${log.bold(file.replace(/\.skill$/, ""))} ${log.dim(`(${log.humanSize(s.size)})`)}`,
    );
  }
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
${log.bold("coskills list")} - List Cowork skill bundles

${log.bold("Usage:")}
  coskills list [options]
  coskills ls   [options]

${log.bold("Options:")}
  -g, --global         List global skills (default: project)
  --dest <path>        Override destination directory
  --json               Output as JSON (machine-readable, no ANSI codes)
  -h, --help           Show this help message
`);
}
