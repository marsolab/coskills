import { test } from "node:test";
import assert from "node:assert/strict";

import { buildAddArgs } from "../src/skills.ts";
import { parseAddArgs } from "../src/add.ts";

const RUNNER = process.env["COSKILLS_RUNNER"] || "npx";

// Strip the leading "--yes" that npx prepends so each test asserts the
// skills.sh argv it cares about.
function skillsArgv(args: string[]): string[] {
  return RUNNER === "npx" && args[0] === "--yes" ? args.slice(1) : args;
}

test("buildAddArgs: defaults end with the canonical skills.sh invocation", () => {
  const args = skillsArgv(buildAddArgs({ pkg: "foo" }));
  assert.deepEqual(args, [
    "skills",
    "add",
    "foo",
    "--agent",
    "claude-code",
    "--copy",
    "--yes",
  ]);
});

test("buildAddArgs: --skill carries every name through", () => {
  const args = skillsArgv(buildAddArgs({ pkg: "foo", skills: ["a", "b"] }));
  assert.ok(args.includes("--skill"));
  const i = args.indexOf("--skill");
  assert.deepEqual(args.slice(i, i + 3), ["--skill", "a", "b"]);
});

test("buildAddArgs: --full-depth appears as a bare flag", () => {
  const args = skillsArgv(buildAddArgs({ pkg: "foo", fullDepth: true }));
  assert.ok(args.includes("--full-depth"));
});

test("buildAddArgs: extraArgs are appended verbatim at the tail", () => {
  const args = skillsArgv(
    buildAddArgs({ pkg: "foo", extraArgs: ["--ref", "main"] }),
  );
  assert.deepEqual(args.slice(-2), ["--ref", "main"]);
});

test("buildAddArgs: --agent claude-code and --copy are always present", () => {
  const args = skillsArgv(
    buildAddArgs({
      pkg: "foo",
      skills: ["a"],
      fullDepth: true,
      extraArgs: ["--ref", "main"],
    }),
  );
  const agentIdx = args.indexOf("--agent");
  assert.ok(agentIdx >= 0, "--agent must be present");
  assert.equal(args[agentIdx + 1], "claude-code");
  assert.ok(args.includes("--copy"));
});

test("buildAddArgs: skills.sh receives exactly one --yes", () => {
  const args = skillsArgv(
    buildAddArgs({ pkg: "foo", extraArgs: ["--ref", "main"] }),
  );
  assert.equal(
    args.filter((a) => a === "--yes").length,
    1,
    "skills.sh should get a single --yes",
  );
});

test("parseAddArgs: -- splits owned flags from passthrough", () => {
  const opts = parseAddArgs(["foo", "--", "--ref", "main"]);
  assert.equal(opts.pkg, "foo");
  assert.deepEqual(opts.passthrough, ["--ref", "main"]);
});

test("parseAddArgs: owned flags before -- still apply", () => {
  const opts = parseAddArgs(["foo", "--global", "--", "--bar"]);
  assert.equal(opts.global, true);
  assert.deepEqual(opts.passthrough, ["--bar"]);
});

test("parseAddArgs: -s consumption stops at --", () => {
  const opts = parseAddArgs(["foo", "-s", "a", "b", "--", "--ref", "main"]);
  assert.deepEqual(opts.skills, ["a", "b"]);
  assert.deepEqual(opts.passthrough, ["--ref", "main"]);
});

test("parseAddArgs: -y is silently swallowed (no error, no warning)", () => {
  const opts = parseAddArgs(["foo", "-y"]);
  assert.equal(opts.pkg, "foo");
});
