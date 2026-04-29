import { spawn } from "node:child_process";

const SKILLS_BIN = "skills";
const RUNNER = process.env["COSKILLS_RUNNER"] || "npx";

export interface RunSkillsAddOptions {
  pkg: string;
  cwd: string;
  skills?: string[];
  fullDepth?: boolean;
  agent?: string;
  copy?: boolean;
  yes?: boolean;
  inherit?: boolean;
}

export interface RunnerResult {
  stdout: string;
  stderr: string;
}

export interface RunnerError extends Error {
  stdout: string;
  stderr: string;
  code: number | null;
}

export function runSkillsAdd(opts: RunSkillsAddOptions): Promise<RunnerResult> {
  const {
    pkg,
    cwd,
    skills = [],
    fullDepth = false,
    agent = "claude-code",
    copy = true,
    yes = true,
    inherit = true,
  } = opts;
  const args = buildAddArgs({ pkg, skills, fullDepth, agent, copy, yes });
  return spawnRunner(args, { cwd, inherit });
}

interface BuildAddArgsInput {
  pkg: string;
  skills: string[];
  fullDepth: boolean;
  agent: string;
  copy: boolean;
  yes: boolean;
}

function buildAddArgs({
  pkg,
  skills,
  fullDepth,
  agent,
  copy,
  yes,
}: BuildAddArgsInput): string[] {
  const args: string[] = [];
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

function spawnRunner(
  args: string[],
  { cwd, inherit }: { cwd: string; inherit: boolean },
): Promise<RunnerResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(RUNNER, args, {
      cwd,
      stdio: inherit ? "inherit" : ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    let stdout = "";
    let stderr = "";
    if (!inherit) {
      child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
      child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));
    }

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        const err = new Error(
          `${RUNNER} ${SKILLS_BIN} exited with code ${code}`,
        ) as RunnerError;
        err.stdout = stdout;
        err.stderr = stderr;
        err.code = code;
        reject(err);
      }
    });
  });
}
