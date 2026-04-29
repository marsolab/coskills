# coskills

Install skills to **Cowork** using **[skills.sh](https://skills.sh/)**.

`coskills` is a small CLI that wraps [`skills.sh`](https://skills.sh/docs/cli):

1. Resolves the skill from the `skills.sh` registry (e.g. `vercel-labs/agent-skills`).
2. Installs each skill into a clean temporary workspace.
3. Wraps every individual skill into a self-contained `.skill` archive (a zip under the hood, so any unzip tool can open it).
4. Drops the archives into `.cowork/skills/` so coworkers can load them.

The UX mirrors `skills.sh`: `add`, `list`, `remove`, `--global`, `--skill`, `--yes`, etc.

## Usage

Run with `npx` (no install needed) or `bunx`:

```sh
npx coskills add vercel-labs/agent-skills
```

This installs every skill in the repo and produces:

```
.cowork/
└── skills/
    ├── deploy-to-vercel.skill
    ├── vercel-cli-with-tokens.skill
    ├── vercel-composition-patterns.skill
    ├── vercel-react-best-practices.skill
    ├── vercel-react-native-skills.skill
    ├── vercel-react-view-transitions.skill
    └── web-design-guidelines.skill
```

Each `.skill` file is a regular zip with the skill directory at its root (e.g. `deploy-to-vercel/SKILL.md`), so a coworker can unpack it into their own `.claude/skills/` (or any agent-skills compatible folder) and start using it.

### Commands

| Command | Description |
| --- | --- |
| `coskills add <package>` | Install and bundle a skill (alias: `a`) |
| `coskills list` | List bundled skills in the current scope (alias: `ls`) |
| `coskills remove <name>` | Remove a bundled skill (alias: `rm`) |
| `coskills --help` | Show the full help message |
| `coskills --version` | Show the CLI version |

### Add options

| Flag | Description |
| --- | --- |
| `-g, --global` | Place bundles in `~/.cowork/skills` instead of the project |
| `-s, --skill <names>` | Filter which skills from a multi-skill repo (use `*` for all) |
| `-y, --yes` | Skip confirmation prompts (forwarded to `skills.sh`) |
| `--dest <path>` | Override the destination directory |
| `--full-depth` | Search all subdirectories even when a root `SKILL.md` exists |
| `--keep-source` | Also keep the unzipped skill folder next to each `.skill` archive |

### Examples

```sh
# Project scope (default) - bundles into ./.cowork/skills
npx coskills add vercel-labs/agent-skills

# User scope - bundles into ~/.cowork/skills
npx coskills add vercel-labs/agent-skills --global

# Pick specific skills from a multi-skill repo
npx coskills add vercel-labs/agent-skills -s deploy-to-vercel web-design-guidelines

# Send bundles to a custom directory
npx coskills add vercel-labs/agent-skills --dest ./shared/cowork-skills

# List what is installed
npx coskills list
npx coskills list --json

# Remove a single skill, or everything
npx coskills remove deploy-to-vercel
npx coskills remove --all
```

## How it works

`coskills add` shells out to `skills.sh` in a fresh temporary directory:

```sh
npx skills add <package> --agent claude-code --copy --yes
```

This produces a normal Claude Code skill tree (`.claude/skills/<skill-name>/SKILL.md` plus any supporting files) inside the temp directory. `coskills` then creates a separate `.skill` archive for each skill (root-prefixed with the skill name) and writes it into `.cowork/skills/`. The temp directory is cleaned up afterwards, so your real `.claude/skills/` is never touched.

The `.skill` file is a standard zip — just with a `.skill` extension so Cowork can recognise it. It is built in pure Node with `zlib`, so there are no native dependencies and no need for the system `zip` utility. To inspect one manually, rename to `.zip` or run `unzip foo.skill`.

## Requirements

- Node.js ≥ 18 (tested on 18, 20, 22) — also runs under Bun.
- A working `npx` (ships with npm) so `skills.sh` can be fetched on demand. Set `COSKILLS_RUNNER=bunx` to use Bun's runner instead.

## Development

```sh
# run tests
node --test 'test/*.test.mjs'

# run the CLI from source
node bin/coskills.mjs add vercel-labs/agent-skills
```

## License

MIT
