# Nexus Agent

Nexus Agent is a TypeScript CLI coding agent with skills, persistent memory, project mapping, code search tools, bounded auto-healing, MCP integrations, and audit logs.

## Install From GitHub

Install globally from your GitHub repo:

```bash
npm install -g github:<your-github-user>/<your-repo>
```

Then run Nexus inside any project directory:

```bash
cd path/to/your/project
nexus chat --skill nodejs-expert
```

For local development in this repo:

```bash
npm install
npm run build
npm link
nexus --help
```

## Environment

Create a `.env` file in the project where you run Nexus, or set environment variables globally:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4-turbo-preview
```

Optional MCP environment variables are documented in `.env.example`.

## Common Commands

Run one task:

```bash
nexus --skill nodejs-expert "Review this API design"
```

Start interactive chat:

```bash
nexus chat --session api --skill nodejs-expert
```

Use Java Spring skill:

```bash
nexus chat --skill java-spring-expert
```

Run bounded auto-heal:

```bash
nexus --auto-heal "Fix the failing tests"
```

Show memory:

```bash
nexus memory show
nexus memory show --session api
```

Show audit logs:

```bash
nexus audit list
nexus audit show latest
```

## Reusing Across Projects

Nexus uses `process.cwd()` as the workspace root. That means the project you `cd` into before running `nexus` becomes the active workspace.

Skills are resolved in this order:

1. `./skills/<skill>.md` inside the current project
2. bundled skills from the installed Nexus package

This lets each project override or add local skills without modifying the global Nexus install.

Project memory is stored under the current project:

```text
.nexus/history.json
.nexus/sessions/<session>.json
```

Audit logs are also project-local:

```text
.nexus/runs/*.json
```

## Safety

The terminal tool is allowlisted by default. Non-allowlisted terminal commands are rejected unless explicitly enabled:

```bash
nexus --unsafe-terminal "task"
```

Even with `--unsafe-terminal`, clearly destructive commands such as `git reset --hard`, `rm -rf`, and recursive `Remove-Item` remain blocked.

## Development

```bash
npm run typecheck
npm test
npm run build
```
