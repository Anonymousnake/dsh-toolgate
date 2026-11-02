# Toolgate · 工具闸门

**Bring only the tools you need into the next prompt.**

[中文](README.md) · [npm](https://www.npmjs.com/package/@jidekaixin2dian/dsh-toolgate/v/0.1.7) · [Marketplace](https://awesome-dsh-plugin.com/p/jidekaixin2dian/dsh-toolgate/) · [Download](https://github.com/jidekaixin2dian/dsh-toolgate/releases/latest) · [Changelog](CHANGELOG.md)

Toolgate is an MCP server, skill and context-budget management plugin for DeepSeek Harness (DSH). Have many MCP servers installed but only a few relevant to the task? Hide tool definitions by server in one settings page and restore them when needed; configuration stays in place and MCP processes keep running.

![Tool grouping illustration; example counts are not measured savings](assets/readme-schema-v2.svg)

## Three jobs, one settings page

| Tab | What it does |
|---|---|
| Budget | Estimate context usage, hide groups / all MCP / the largest group, restore tools |
| MCP servers | Add, edit, enable, disable and remove stdio or streamable-http servers |
| Skills | Search, create and toggle by Session workspace; move eligible local skills to trash |

For example, hide MCP tool groups unrelated to a coding task to change the tool definitions supplied with the next prompt, then restore them when needed. The page estimates tokens from schema and description length; the estimate is not a measurement of cost or speed. Settings-page budgets apply to all sessions and subagents; permitted session overrides affect only that session.

## Downloads

| GitHub release assets · all releases | npm 0.1.5 · past 7 days |
|---|---|
| [**471 downloads**](https://api.github.com/repos/jidekaixin2dian/dsh-toolgate/releases?per_page=100) | [**126 downloads**](https://api.npmjs.org/versions/@jidekaixin2dian%2Fdsh-toolgate/last-week) |

Snapshot: **2026-10-29**. GitHub counts release-asset requests, including checksums; npm counts downloads of the named version. Requests can include repeat installs and automation, so these are not unique-user counts and the two columns are not added together. Click a number for its live source.

## Install and update

Requires **DSH >=0.2.1-rc.2 and Node >=24**. CI verifies DSH rc.2 / rc.3 / rc.4.

Search for **dsh-toolgate**, author **jidekaixin2dian**, in the marketplace. Both npm and GitHub sources support version checks. Once the catalog recognizes the npm package it prefers npm; existing users can check under installed plugins. Catalog and registry data may take time to refresh.

Alternatively, quit DSH and run the same command to install or update, then reopen it:

```powershell
dsh plugin --profile desktop add @jidekaixin2dian/dsh-toolgate --registry=https://registry.npmjs.org
```

Offline packages are available in [Releases](https://github.com/jidekaixin2dian/dsh-toolgate/releases/latest). While Desktop owns a running profile, use its plugin manager and respect profile locks.

## Get started

1. Open **Settings → Toolgate** and review groups under Budget.
2. Hide groups this task does not need. Changes apply from the next prompt and can be reversed.
3. Before changing MCP or skills, verify the configuration scope or selected workspace Session.

MCP edits preserve unrelated configuration and comments, back up before writing and reject ambiguous or read-only sources. Secret fields are retained by default and never returned in plaintext. Audit entries exclude secret values.

Skills retain source identity. Only matching local `.dsh/skills/<name>` directories can move to `.trash`; shared, bundled, custom and virtual sources stay read-only.

<details>
<summary>Session tool and fixed global settings</summary>

```text
toolgate action=status
toolgate action=session disabled=["mcp:github", "skills"]
toolgate action=reset
```

`mcp` matches all MCP; `mcp:<server>` matches one. Settings apply globally to sessions and subagents, while Session overrides affect only that Session.

Set `allowSessionOverride: false` to prevent the model from changing or resetting Session overrides. The settings page still controls the global gate.

</details>

Existing `.tgz` or local installations can use the same command in the same profile to switch to npm; GitHub installs remain updatable.

## Boundaries

**Project and feedback** at the bottom of every settings tab opens this plugin's GitHub repository or a new issue.

- Hiding tools is context budgeting, **not a permission sandbox**. MCP processes keep running; permitted Session overrides can restore tools.
- Token estimates use schema / description length. Neither estimates nor illustrated counts establish cost or latency savings.
- Some dynamically scoped tools cannot be hidden; use their manager to unload them. Skill ZIP / folder import is not implemented.
- MCP management writes configuration. Review changes to hand-edited files. Backups under `DSH_HOME/backups/toolgate/` retain the latest 20 after successful writes and **may contain original secrets; keep them private**.
- Audit records are stored in `DSH_HOME/toolgate-audit.jsonl`. Management requires host authentication and the current profile, failing closed if either is missing.
- Plugin updates require an app restart; existing MCP configuration changes can hot reload through the host.

To remove, quit DSH, run `dsh plugin --profile desktop remove @jidekaixin2dian/dsh-toolgate`, then reopen it.

[Development and verification](https://github.com/jidekaixin2dian/dsh-toolgate/blob/main/docs/development.md) · [Security](SECURITY.md) · [Issues](https://github.com/jidekaixin2dian/dsh-toolgate/issues)

MIT · Independent community plugin, not affiliated with DeepSeek.
