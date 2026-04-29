#!/usr/bin/env node
import { run } from "../dist/cli.js";

try {
  await run(process.argv.slice(2));
} catch (err) {
  process.stderr.write(`\n${err?.stack ?? err}\n`);
  process.exit(1);
}
