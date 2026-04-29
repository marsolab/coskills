import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { zipDirectory } from "../src/zip.ts";

async function makeFixture(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "coskills-test-"));
  await mkdir(join(dir, "src", "rules"), { recursive: true });
  await writeFile(
    join(dir, "src", "SKILL.md"),
    "---\nname: my-skill\ndescription: test skill\n---\n\nHello.\n",
  );
  await writeFile(
    join(dir, "src", "rules", "rule-one.md"),
    "# Rule one\n\nBe kind.\n",
  );
  return dir;
}

function hasUnzip(): boolean {
  const r = spawnSync("unzip", ["-v"], { stdio: "ignore" });
  return r.status === 0;
}

test("zipDirectory creates a readable zip with prefix", async () => {
  const root = await makeFixture();
  try {
    const out = join(root, "my-skill.zip");
    await zipDirectory(join(root, "src"), out, { prefix: "my-skill" });

    const buf = await readFile(out);
    assert.equal(buf.readUInt32LE(0), 0x04034b50, "starts with local file header");

    const eocdOffset = buf.length - 22;
    assert.equal(
      buf.readUInt32LE(eocdOffset),
      0x06054b50,
      "ends with end-of-central-directory record",
    );

    if (hasUnzip()) {
      const list = spawnSync("unzip", ["-l", out], { encoding: "utf8" });
      assert.equal(list.status, 0, `unzip -l failed: ${list.stderr}`);
      assert.match(list.stdout, /my-skill\/SKILL\.md/);
      assert.match(list.stdout, /my-skill\/rules\/rule-one\.md/);

      const test = spawnSync("unzip", ["-t", out], { encoding: "utf8" });
      assert.equal(test.status, 0, `unzip -t failed: ${test.stderr}`);
      assert.match(test.stdout, /No errors detected/);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("zipDirectory accepts an empty prefix", async () => {
  const root = await makeFixture();
  try {
    const out = join(root, "flat.zip");
    await zipDirectory(join(root, "src"), out);
    if (hasUnzip()) {
      const list = spawnSync("unzip", ["-l", out], { encoding: "utf8" });
      assert.equal(list.status, 0);
      assert.match(list.stdout, /\bSKILL\.md\b/);
      assert.doesNotMatch(list.stdout, /^my-skill\//m);
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
