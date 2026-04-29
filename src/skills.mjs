import { spawn } from "node:child_process";

const SKILLS_BIN = "skills";
const RUNNER = process.env.COSKILLS_RUNNER || "npx";

export function runSkillsAdd({
  pkg,
  cwd,
  skills = [],
  fullDepth = false,
  agent = "claude-code",
  copy = true,
  yes = true,
  inherit = true,
} = {}) {
  const args = buildAddArgs({ pkg, skills, fullDepth, agent, copy, yes });
  return spawnRunner(args, { cwd, inherit });
}

function buildAddArgs({ pkg, skills, fullDepth, agent, copy, yes }) {
  const args = [];
  if (RUNNER === "npx") args.push("--yes");
  args.push(SKILLS_BIN, "add", pkg);
  if (agent) args.push("--agent", agent);
  if (copy) args.push("--copy");
  if (yes) args.push("--yes");
  if (skills.length) {
    args.push("--skill", ...skills);
  }
  if (fullDepth) args.push("--full-depth");
  return args;
}

function spawnRunner(args, { cwd, inherit }) {
  return new Promise((resolve, reject) => {
    const child = spawn(RUNNER, args, {
      cwd,
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    if (!inherit) {
      child.stdout.on("data", (d) => (stdout += d.toString()));
      child.stderr.on("data", (d) => (stderr += d.toString()));
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(`${RUNNER} ${SKILLS_BIN} exited with code ${code}`);
        err.stdout = stdout;
        err.stderr = stderr;
        err.code = code;
        reject(err);
      }
    });
  });
}
