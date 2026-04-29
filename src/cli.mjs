import { readFile } from "node:fs/promises";

import { add } from "./add.mjs";
import { list } from "./list.mjs";
import { remove } from "./remove.mjs";
import * as log from "./log.mjs";

const PKG = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

const COMMANDS = {
  add,
  a: add,
  list,
  ls: list,
  remove,
  rm: remove,
};

export async function run(argv) {
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

function printHelp() {
  process.stderr.write(`\
${log.bold("coskills")} - Install skills from skills.sh into your Cowork skill folder

${log.bold("Usage:")}
  coskills <command> [options]

${log.bold("Manage skills:")}
  ${log.bold("add")} <package>        Install a skill from skills.sh (alias: ${log.bold("a")})
                       e.g. vercel-labs/agent-skills
                            https://github.com/vercel-labs/agent-skills
  ${log.bold("remove")} [skills...]   Remove an installed skill (alias: ${log.bold("rm")})
  ${log.bold("list")}, ${log.bold("ls")}             List installed skills

${log.bold("Add Options:")}
  -g, --global           Install to ~/.claude/skills (available across projects)
  -s, --skill <skills>   Specify skill names to install (use '*' for all)
  -y, --yes              Skip confirmation prompts
  --dest <path>          Override destination directory
  --full-depth           Search all subdirectories even when a root SKILL.md exists

${log.bold("Remove Options:")}
  -g, --global           Remove from ~/.claude/skills (default: project)
  --dest <path>          Override destination directory
  --all                  Remove every installed skill in the destination

${log.bold("List Options:")}
  -g, --global           List skills under ~/.claude/skills (default: project)
  --dest <path>          Override destination directory
  --json                 Output as JSON

${log.bold("Options:")}
  --help, -h             Show this help message
  --version, -v          Show version number

${log.bold("Examples:")}
  ${log.dim("$")} coskills add vercel-labs/agent-skills
  ${log.dim("$")} coskills add vercel-labs/agent-skills -s pr-review -y
  ${log.dim("$")} coskills add vercel-labs/agent-skills --global
  ${log.dim("$")} coskills list
  ${log.dim("$")} coskills remove pr-review

Discover more skills at ${log.cyan("https://skills.sh/")}
`);
}
