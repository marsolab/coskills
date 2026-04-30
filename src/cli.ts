import { readFile } from "node:fs/promises";

import { add } from "./add.js";
import { list } from "./list.js";
import { remove } from "./remove.js";
import * as log from "./log.js";

interface PackageJson {
  version: string;
}

const PKG: PackageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
) as PackageJson;

type Command = (args: string[]) => Promise<void>;

const COMMANDS: Record<string, Command> = {
  add,
  a: add,
  list,
  ls: list,
  remove,
  rm: remove,
};

export async function run(argv: string[]): Promise<void> {
  const [first, ...rest] = argv;

  if (!first || first === "-h" || first === "--help" || first === "help") {
    printHelp();
    return;
  }
  if (first === "-v" || first === "--version") {
    process.stdout.write(`${PKG.version}\n`);
    return;
  }

  const cmd = COMMANDS[first];
  if (!cmd) {
    log.fail(`Unknown command: ${first}`);
    log.pipe();
    log.pipe(`Run ${log.bold("coskills --help")} to see available commands.`);
    process.exit(1);
  }

  await cmd(rest);
}

function printHelp(): void {
  process.stderr.write(`\
${log.bold("coskills")} - Bundle skills.sh skills as Claude Cowork-uploadable ZIP archives

${log.bold("Usage:")}
  coskills <command> [options]

${log.bold("Manage skills:")}
  ${log.bold("add")} <package>        Install a skill from skills.sh and bundle it
                       (alias: ${log.bold("a")})
                       e.g. vercel-labs/agent-skills
                            https://github.com/vercel-labs/agent-skills
  ${log.bold("remove")} [skills...]   Remove a bundled skill archive (alias: ${log.bold("rm")})
  ${log.bold("list")}, ${log.bold("ls")}             List bundled skill archives

${log.bold("Add Options:")}
  -g, --global           Place archives in ~/.cowork/skills instead of project
  -s, --skill <skills>   Specify skill names to bundle (use '*' for all)
  --dest <path>          Override destination directory
  --full-depth           Search all subdirectories even when a root SKILL.md exists
  --                     Forward remaining args to 'skills add' (see 'coskills add --help')

${log.bold("Remove Options:")}
  -g, --global           Remove from ~/.cowork/skills (default: project)
  --dest <path>          Override destination directory
  --all                  Remove every archive in the destination

${log.bold("List Options:")}
  -g, --global           List archives in ~/.cowork/skills (default: project)
  --dest <path>          Override destination directory
  --json                 Output as JSON

${log.bold("Options:")}
  --help, -h             Show this help message
  --version, -v          Show version number

${log.bold("Examples:")}
  ${log.dim("$")} coskills add vercel-labs/agent-skills
  ${log.dim("$")} coskills add vercel-labs/agent-skills -s pr-review
  ${log.dim("$")} coskills add vercel-labs/agent-skills --global
  ${log.dim("$")} coskills add vercel-labs/agent-skills -- --ref main
  ${log.dim("$")} coskills list
  ${log.dim("$")} coskills remove pr-review

After bundling, upload each .skill archive in Claude Cowork via
  ${log.cyan("Customize → Skills → + → \"Upload a skill\"")}
  ${log.cyan("https://claude.ai/customize/skills")}

Discover more skills at ${log.cyan("https://skills.sh/")}
`);
}
