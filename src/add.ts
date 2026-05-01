import { mkdtemp, readdir, mkdir, rm, rename, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";

import { runSkillsAdd } from "./skills.js";
import { zipDirectory } from "./zip.js";
import { resolveDest, describeScope } from "./paths.js";
import * as log from "./log.js";

// Claude Cowork (Claude.ai surfaces) requires the manifest inside an uploaded
// skill ZIP to be named `Skill.md`. The skills.sh ecosystem stores it as
// `SKILL.md` (uppercase). Normalise that before packing so the resulting
// archive uploads cleanly via Customize > Skills.
const COWORK_MANIFEST = "Skill.md";
const SOURCE_MANIFEST = "SKILL.md";

interface AddOptions {
  pkg: string | null;
  global: boolean;
  skills: string[];
  fullDepth: boolean;
  dest: string | null;
  passthrough: string[];
  help: boolean;
}

interface BundledSkill {
  name: string;
  archivePath: string;
  size: number;
  existed: boolean;
}

export async function add(args: string[]): Promise<void> {
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
      extraArgs: opts.passthrough,
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

    const bundled: BundledSkill[] = [];
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

async function renameManifestForCowork(skillDir: string): Promise<void> {
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

export function parseAddArgs(argv: string[]): AddOptions {
  const out: AddOptions = {
    pkg: null,
    global: false,
    skills: [],
    fullDepth: false,
    dest: null,
    passthrough: [],
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === "--") {
      out.passthrough.push(...argv.slice(i + 1));
      break;
    }
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "-g" || a === "--global") out.global = true;
    // `--yes` is always passed to skills.sh; accept `-y`/`--yes` from muscle
    // memory without warning, but it's a no-op here.
    else if (a === "-y" || a === "--yes") continue;
    else if (a === "--full-depth") out.fullDepth = true;
    else if (a === "--dest") {
      const v = argv[++i];
      if (!v) {
        log.fail("--dest requires a path argument");
        process.exit(1);
      }
      out.dest = v;
    } else if (a === "-s" || a === "--skill") {
      while (
        i + 1 < argv.length &&
        argv[i + 1] !== "--" &&
        !argv[i + 1]!.startsWith("-")
      ) {
        out.skills.push(argv[++i]!);
      }
      if (out.skills.length === 0) {
        log.fail(`${a} requires at least one skill name`);
        process.exit(1);
      }
    } else if (!a.startsWith("-") && !out.pkg) {
      out.pkg = a;
    } else {
      log.warn(`Unknown option: ${a} (use \`-- ${a}\` to forward to skills.sh)`);
    }
  }
  return out;
}

function prettyPath(p: string): string {
  const rel = relative(process.cwd(), resolve(p));
  if (!rel.startsWith("..") && !rel.startsWith("/")) return `./${rel}`;
  return p;
}

function printAddHelp(): void {
  process.stderr.write(`\
${log.bold("coskills add")} - Bundle a skills.sh skill into a Cowork-uploadable ZIP

${log.bold("Usage:")}
  coskills add <package> [options]

${log.bold("Arguments:")}
  <package>            Skill package (e.g. vercel-labs/agent-skills, or a git URL)

${log.bold("Options:")}
  -g, --global         Place archives in ~/.cowork/skills instead of project
  -s, --skill <names>  Filter which skills from a multi-skill repo (use '*' for all)
  --dest <path>        Override destination directory
  --full-depth         Search all subdirectories even when a root SKILL.md exists
  --                   Forward remaining args verbatim to 'skills add'
  -h, --help           Show this help message

${log.bold("Forwarding to skills.sh:")}
  Anything after \`--\` is passed straight to \`skills add\`, so any future
  skills.sh flag works without a coskills release. Example:
  ${log.dim("$")} coskills add vercel-labs/agent-skills -- --ref main

After running, upload each .skill archive via Customize → Skills in
Claude Cowork: https://claude.ai/customize/skills
`);
}
