# coskills

Install skills to **Cowork** using **[skills.sh](https://skills.sh/)**.

`coskills` is a small CLI that wraps [`skills.sh`](https://skills.sh/docs/cli) and drops the resulting skills directly into the directories Claude Code (and other Agent Skills compatible agents) read from:

- **Project scope** — `./.claude/skills/<skill-name>/SKILL.md`
- **Global / personal scope** — `~/.claude/skills/<skill-name>/SKILL.md`

These paths come straight from the [Claude Code skills docs](https://code.claude.com/docs/en/skills#where-skills-live), so installed skills are picked up automatically without any extra wiring.

## How it works

1. Resolves the package against the `skills.sh` registry (e.g. `vercel-labs/agent-skills`).
2. Runs `skills.sh add` inside a clean temporary workspace so your existing `.claude/skills/` is never touched mid-install.
3. Copies each individual skill directory (with its `SKILL.md` and supporting files) into `./.claude/skills/<name>/` (project) or `~/.claude/skills/<name>/` (global).
4. Cleans up the temp workspace.

The UX mirrors `skills.sh`: `add`, `list`, `remove`, `--global`, `--skill`, `--yes`, etc.

## Usage

Run with `npx` (no install needed) or `bunx`:

```sh
npx coskills add vercel-labs/agent-skills
```

A multi-skill repo unpacks into one directory per skill:

```
.claude/
└── skills/
    ├── deploy-to-vercel/
    │   ├── SKILL.md
    │   └── resources/
    ├── vercel-cli-with-tokens/
    │   └── SKILL.md
    ├── vercel-composition-patterns/
    │   ├── SKILL.md
    │   └── rules/
    └── …
```

Claude Code watches `.claude/skills/` for changes, so a teammate cloning the repo gets every skill the moment they open it.

### Commands

| Command | Description |
| --- | --- |
| `coskills add <package>` | Install skill(s) from skills.sh (alias: `a`) |
| `coskills list` | List installed skills in the current scope (alias: `ls`) |
| `coskills remove <name>` | Remove an installed skill (alias: `rm`) |
| `coskills --help` | Show the full help message |
| `coskills --version` | Show the CLI version |

### Add options

| Flag | Description |
| --- | --- |
| `-g, --global` | Install to `~/.claude/skills` (available across projects) |
| `-s, --skill <names>` | Filter which skills from a multi-skill repo (use `*` for all) |
| `-y, --yes` | Skip confirmation prompts (forwarded to `skills.sh`) |
| `--dest <path>` | Override the destination directory |
| `--full-depth` | Search all subdirectories even when a root `SKILL.md` exists |

### Examples

```sh
# Project scope (default) - installs into ./.claude/skills
npx coskills add vercel-labs/agent-skills

# Global / personal scope - installs into ~/.claude/skills
npx coskills add vercel-labs/agent-skills --global

# Pick specific skills from a multi-skill repo
npx coskills add vercel-labs/agent-skills -s deploy-to-vercel web-design-guidelines

# Send skills to a custom directory (e.g. a shared location)
npx coskills add vercel-labs/agent-skills --dest /srv/team/.claude/skills

# List what is installed
npx coskills list
npx coskills list --json
npx coskills list --global

# Remove a single skill, or everything in scope
npx coskills remove deploy-to-vercel
npx coskills remove --all
```

## Implementation notes

`coskills add` shells out to `skills.sh` in a fresh temporary directory:

```sh
npx skills add <package> --agent claude-code --copy --yes
```

`skills.sh` produces a normal Claude Code skill tree (`.claude/skills/<skill-name>/SKILL.md` plus any supporting files) inside the temp directory. `coskills` then copies each skill directory into the chosen scope and discards the temp workspace.

## Requirements

- Node.js ≥ 18 (tested on 18, 20, 22) — also runs under Bun.
- A working `npx` (ships with npm) so `skills.sh` can be fetched on demand. Set `COSKILLS_RUNNER=bunx` to use Bun's runner instead.

## Development

```sh
# run the CLI from source
node bin/coskills.mjs add vercel-labs/agent-skills
```

## License

MIT
