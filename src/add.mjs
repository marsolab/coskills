import { mkdtemp, readdir, mkdir, rm, rename, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import { runSkillsAdd } from "./skills.mjs";
import { zipDirectory } from "./zip.mjs";
import { resolveDest, describeScope } from "./paths.mjs";
import * as log from "./log.mjs";

// Claude Cowork (Claude.ai surfaces) requires the manifest inside an uploaded
// skill ZIP to be named `Skill.md`. The skills.sh ecosystem stores it as
// `SKILL.md` (uppercase). Normalise that before packing so the resulting
// archive uploads cleanly via Customize > Skills.
const COWORK_MANIFEST = "Skill.md";
const SOURCE_MANIFEST = "SKILL.md";

export async function add(args) {
  const opts = parseAddArgs(args);
  if (opts.help) {
    printAddHelp();
    return;
  }
  if (!opts.pkg) {
    log.fail("Missing required argument: <package>");
    log.pipe();
    log.pipe(`Usage:    ${log.bold("coskills add <package> [options]")}`);
    log.pipe(`Example:  ${log.bold("coskills add vercel-labs/agent-skills")}`);
    process.exit(1);
  }

  const dest = resolveDest(opts);
  const scope = describeScope(opts);

  log.step(`Bundling ${log.bold(opts.pkg)} for Cowork (${scope} scope)`);
  log.pipe(`Destination: ${log.cyan(prettyPath(dest))}`);
  log.blank();

  const tmp = await mkdtemp(join(tmpdir(), "coskills-"));
  try {
    await runSkillsAdd({
      pkg: opts.pkg,
      cwd: tmp,
      skills: opts.skills,
      fullDepth: opts.fullDepth,
    });

    const skillsRoot = join(tmp, ".claude", "skills");
    let entries;
    try {
      entries = await readdir(skillsRoot, { withFileTypes: true });
    } catch {
      log.fail(`skills.sh did not produce ${prettyPath(skillsRoot)}`);
      process.exit(1);
    }
    const dirs = entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();

    if (dirs.length === 0) {
      log.fail("skills.sh did not install any skill directories.");
      process.exit(1);
    }

    await mkdir(dest, { recursive: true });

    const bundled = [];
    for (const name of dirs) {
      const srcDir = join(skillsRoot, name);
      await renameManifestForCowork(srcDir);

      const archivePath = join(dest, `${name}.skill`);
      let existed = false;
      try {
        await stat(archivePath);
        existed = true;
      } catch {
        /* fresh */
      }
      await rm(archivePath, { force: true });
      await zipDirectory(srcDir, archivePath, { prefix: name });
      const s = await stat(archivePath);
      bundled.push({ name, archivePath, size: s.size, existed });
    }

    log.blank();
    log.step(`Bundled ${bundled.length} skill${bundled.length === 1 ? "" : "s"}`);
    for (const b of bundled) {
      const action = b.existed ? "updated" : "added";
      log.pipe(
        `  ${log.green("✓")} ${log.bold(b.name)} ${log.dim(`(${action}, ${log.humanSize(b.size)})`)}`,
      );
      log.pipe(`    → ${prettyPath(b.archivePath)}`);
    }
    log.blank();
    log.done(
      `Done!  Upload these archives via ${log.bold("Customize → Skills → +")} in Claude Cowork.`,
    );
    log.pipe(
      `       Source: ${log.cyan("https://claude.ai/customize/skills")}`,
    );
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

async function renameManifestForCowork(skillDir) {
  const upper = join(skillDir, SOURCE_MANIFEST);
  const cowork = join(skillDir, COWORK_MANIFEST);
  let upperExists = false;
  let coworkExists = false;
  try {
    const s = await stat(upper);
    upperExists = s.isFile();
  } catch {
    /* missing */
  }
  try {
    const s = await stat(cowork);
    coworkExists = s.isFile();
  } catch {
    /* missing */
  }
  if (upperExists && !coworkExists) {
    await rename(upper, cowork);
  }
}

function parseAddArgs(argv) {
  const out = {
    pkg: null,
    global: false,
    skills: [],
    fullDepth: false,
    dest: null,
    yes: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-g" || a === "--global") out.global = true;
    else if (a === "-y" || a === "--yes") out.yes = true;
    else if (a === "--full-depth") out.fullDepth = true;
    else if (a === "--dest") {
      const v = argv[++i];
      if (!v) {
        log.fail("--dest requires a path argument");
        process.exit(1);
      }
      out.dest = v;
    } else if (a === "-s" || a === "--skill") {
      while (i + 1 < argv.length && !argv[i + 1].startsWith("-")) {
        out.skills.push(argv[++i]);
      }
      if (out.skills.length === 0) {
        log.fail(`${a} requires at least one skill name`);
        process.exit(1);
      }
    } else if (!a.startsWith("-") && !out.pkg) {
      out.pkg = a;
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

function printAddHelp() {
  process.stderr.write(`\
${log.bold("coskills add")} - Bundle a skills.sh skill into a Cowork-uploadable ZIP

${log.bold("Usage:")}
  coskills add <package> [options]

${log.bold("Arguments:")}
  <package>            Skill package (e.g. vercel-labs/agent-skills, or a git URL)

${log.bold("Options:")}
  -g, --global         Place archives in ~/.cowork/skills instead of project
  -s, --skill <names>  Filter which skills from a multi-skill repo (use '*' for all)
  -y, --yes            Skip confirmation prompts (forwarded to skills.sh)
  --dest <path>        Override destination directory
  --full-depth         Search all subdirectories even when a root SKILL.md exists
  -h, --help           Show this help message

After running, upload each .skill archive via Customize → Skills in
Claude Cowork: https://claude.ai/customize/skills
`);
}
