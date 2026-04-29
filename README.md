# coskills

Bundle skills from **[skills.sh](https://skills.sh/)** into ZIP archives that you can upload to **Claude Cowork** (and the other Claude.ai surfaces — web chat, Excel/PowerPoint add‑ins).

`coskills` is a small CLI that wraps [`skills.sh`](https://skills.sh/docs/cli):

1. Resolves the skill from the `skills.sh` registry (e.g. `vercel-labs/agent-skills`).
2. Installs each skill into a clean temporary workspace.
3. Renames the manifest from `SKILL.md` → `Skill.md` so the archive matches Claude Cowork's [skill format](https://support.claude.com/en/articles/12512198-how-to-create-custom-skills) ("Every Skill consists of a directory containing at minimum a Skill.md file").
4. Wraps every individual skill into a self-contained `.skill` archive (a ZIP under the hood, so any unzip tool can open it).
5. Drops the archives into `.cowork/skills/` (or `~/.cowork/skills/` with `--global`).

You then upload each `.skill` archive to Claude Cowork through:

> **Customize → Skills → "+" → "+ Create skill" → "Upload a skill"**
> ([claude.ai/customize/skills](https://claude.ai/customize/skills))

Org admins can also bulk-provision via **Organization settings → Skills → "+ Add"** (Team / Enterprise plans).

The CLI UX mirrors `skills.sh`: `add`, `list`, `remove`, `--global`, `--skill`, `--yes`, etc.

## Why a separate CLI?

Claude Cowork's skill upload is UI-only — there's no public API or filesystem watch path that turns a folder of skills into installed skills automatically. So this tool focuses on the bit you can automate: producing properly-formatted, upload-ready `.skill` archives from any `skills.sh` package, with one command, that anyone on the team can drop into their Cowork.

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

Each `.skill` archive contains the skill folder at the root of the zip (e.g. `deploy-to-vercel/Skill.md`) — the layout Claude Cowork's uploader expects.

### Commands

| Command | Description |
| --- | --- |
| `coskills add <package>` | Install and bundle a skill (alias: `a`) |
| `coskills list` | List bundled archives in the current scope (alias: `ls`) |
| `coskills remove <name>` | Remove a bundled archive (alias: `rm`) |
| `coskills --help` | Show the full help message |
| `coskills --version` | Show the CLI version |

### Add options

| Flag | Description |
| --- | --- |
| `-g, --global` | Place archives in `~/.cowork/skills` instead of the project |
| `-s, --skill <names>` | Filter which skills from a multi-skill repo (use `*` for all) |
| `-y, --yes` | Skip confirmation prompts (forwarded to `skills.sh`) |
| `--dest <path>` | Override the destination directory |
| `--full-depth` | Search all subdirectories even when a root `SKILL.md` exists |

### Examples

```sh
# Project scope (default) - bundles into ./.cowork/skills
npx coskills add vercel-labs/agent-skills

# User scope - bundles into ~/.cowork/skills
npx coskills add vercel-labs/agent-skills --global

# Pick specific skills from a multi-skill repo
npx coskills add vercel-labs/agent-skills -s deploy-to-vercel web-design-guidelines

# Send bundles to a custom directory (e.g. a shared drive for org admins)
npx coskills add vercel-labs/agent-skills --dest /srv/team/cowork-skills

# List what is bundled
npx coskills list
npx coskills list --json
npx coskills list --global

# Remove a single archive, or everything in scope
npx coskills remove deploy-to-vercel
npx coskills remove --all
```

## How uploads work in Claude Cowork

| Scope | How to install | Where the archive lands |
| --- | --- | --- |
| **Personal** | Customize → Skills → "+" → "Upload a skill" | Your personal skills list |
| **Shared** | Open one of your personal skills, share with specific people | Recipient's skills list, view-only, opt-in |
| **Organization** | Organization settings → Skills → "+ Add" (Team/Enterprise admins) | Org directory, enabled by default for everyone |

The `.skill` archives produced here are valid input to all three flows — the file you upload is the same regardless of the scope.

## Implementation notes

`coskills add` shells out to `skills.sh` in a fresh temporary directory:

```sh
npx skills add <package> --agent claude-code --copy --yes
```

`skills.sh` produces a normal Agent Skills tree (`.claude/skills/<skill-name>/SKILL.md` plus any supporting files) inside the temp directory. `coskills` then:

1. Renames each skill's manifest from `SKILL.md` → `Skill.md` (Cowork's expected casing).
2. Creates a `.skill` archive whose root is the skill directory (e.g. `deploy-to-vercel/Skill.md`, `deploy-to-vercel/resources/...`).
3. Writes the archive into `.cowork/skills/`.

The temp directory is cleaned up afterwards, so your real `.claude/skills/` is never touched.

The zip is built in pure Node with `zlib`, so there are no native dependencies and no need for the system `zip` utility. To inspect an archive manually, rename to `.zip` or run `unzip foo.skill`.

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
