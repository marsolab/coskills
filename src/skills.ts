import { spawn } from "node:child_process";

const SKILLS_BIN = "skills";
const RUNNER = process.env["COSKILLS_RUNNER"] || "npx";

export interface RunSkillsAddOptions {
  pkg: string;
  cwd: string;
  skills?: string[];
  fullDepth?: boolean;
  extraArgs?: string[];
  agent?: string;
  copy?: boolean;
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
    extraArgs = [],
    agent = "claude-code",
    copy = true,
    inherit = true,
  } = opts;
  const args = buildAddArgs({ pkg, skills, fullDepth, extraArgs, agent, copy });
  return spawnRunner(args, { cwd, inherit });
}

export interface BuildAddArgsInput {
  pkg: string;
  skills?: string[];
  fullDepth?: boolean;
  extraArgs?: string[];
  agent?: string;
  copy?: boolean;
}

// `--agent claude-code` and `--copy` are intentionally non-configurable:
// post-processing in add.ts reads `<cwd>/.claude/skills/<name>/`, which is
// exactly the layout those two flags produce. Anything else and the bundler
// silently finds nothing to zip.
export function buildAddArgs({
  pkg,
  skills = [],
  fullDepth = false,
  extraArgs = [],
  agent = "claude-code",
  copy = true,
}: BuildAddArgsInput): string[] {
  const args: string[] = [];
  if (RUNNER === "npx") args.push("--yes");
  args.push(SKILLS_BIN, "add", pkg);
  if (agent) args.push("--agent", agent);
  if (copy) args.push("--copy");
  args.push("--yes");
  if (skills.length) {
    args.push("--skill", ...skills);
  }
  if (fullDepth) args.push("--full-depth");
  if (extraArgs.length) args.push(...extraArgs);
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
