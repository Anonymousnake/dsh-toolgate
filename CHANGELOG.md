# Changelog

## 0.1.7 — 2026-11-02

- 修复设置页空白：0.1.6 新增的「项目与反馈」直接读取 `ctx.locale`，而插件未声明 `locale` 服务；较新的宿主对该读取直接抛错（`cannot get property "locale" without inject`），整个 `settings.section` 条目被错误边界吞掉，点进「工具闸门」只剩空白。
- 在 `inject` 中声明 `locale`，并将该读取包在 `try/catch` 里回退到 `navigator.language`，与其他可选服务读取保持一致。
- Fix blank settings page: the 0.1.6 project/feedback block read `ctx.locale` without declaring the service. Newer hosts throw on that read, the whole `settings.section` entry is swallowed by the error boundary, and the Toolgate page renders empty. `locale` is now declared and the read falls back to `navigator.language`.
- 新增 3 项客户端渲染回归测试，覆盖「宿主拒绝 locale 服务」时设置页仍渲染，以及中英文文案跟随语言。

## 0.1.6 — 2026-10-31

- 设置页新增「项目与反馈」入口，在预算、MCP、Skills 页面均可打开对应 GitHub 项目或新建反馈；页面加载失败时也保留入口。
- Add project and issue links across settings tabs, including when the main settings panel fails to load.

## 0.1.5 — 2026-10-28

- 发布与更新维护：明确 npm 安装、GitHub 来源迁移、市场检测与重启步骤；保留既有运行时行为。
- 固定并验证 DSH 0.2.1-rc.4，同时保留较旧宿主回归。
- 新增 npm 公开发布配置、tag/main/CI/归档门槛与 Trusted Publishing 工作流；继续复用宿主运行时，不安装第二份 DSH。


## 0.1.4 — 2026-10-26

- 重整中英文 README：安装更新优先，保留兼容与权限边界，开发说明移入独立文档。
- Refresh Chinese/English documentation and installation guidance; runtime behavior is unchanged.
- 使用 GitHub 源安装以支持市场版本检查；包含尚未发包的 rc.2 / rc.3 宿主支持声明。


## Previously unreleased compatibility metadata

- Declare the supported host explicitly: `engines.dsh >=0.2.1-rc.2`, with CI
  continuously verifying both 0.2.1-rc.2 and 0.2.1-rc.3.
- Re-pin the host regression suite to DSH 0.2.1-rc.3 (`1f81c047`): rc.2 → rc.3
  changed no source in the packages this plugin uses, and the authenticated host
  suite passes unchanged (11 passed / 1 browser-gated skip). Shipped plugin
  code and the peer range (`>=0.2.1-rc.1 <0.3.0-0`) are unchanged.

## 0.1.3 — 2026-10-24

- Add an append-only audit log at `DSH_HOME/toolgate-audit.jsonl`: one JSON line
  per management write (op, target id, outcome, timestamp), never containing
  env/header values. It rotates past 1 MiB to `.1` and a failed append never
  blocks the operation it records.
- Tighten the management API: `mcp-add` and `mcp-edit` now accept only the
  documented `{ row }` payload; flattened probe bodies are rejected with the
  normal validation error instead of being silently interpreted.
- Add the `allowSessionOverride` plugin config (default `true`). Set it to `false`
  to make the `toolgate` model tool read-only: `action=session` and `action=reset`
  return a notice without changing tool visibility, so prompt-injected turns
  cannot hide tool groups; the authenticated settings page still owns the gate.
- Cap configuration backups at the 20 most recent copies under
  `DSH_HOME/backups/toolgate/`; pruning runs after a successful write only, so
  failed writes keep their recovery copy. Backup directories are matched by the
  exact `timestamp-uuid` naming pattern and foreign entries are never removed.

## 0.1.2 — 2026-10-23

- Align the release tag and archive, including the scoped client bundle. The
  0.1.1 archive had the fix, but its tag source did not; neither is overwritten.
- Verify published package versions and all archive files against tagged source,
  allowing only Git checkout line endings, and check the GitHub asset digest.
- Correct stale installation/version documentation and remove the stale UI
  version label.

## 0.1.1 — 2026-10-23

- Authenticate management requests using the running host Connection service;
  reject missing auth support and omit secret values from management responses.
- Edit YAML nodes precisely, retain sibling configuration and complex arguments,
  compose profile/global/overlay layers using the host, and back up atomic writes.
- Resolve the current DSH home/profile and selected workspace from host services.
  Keep Skill provider/path identities, scoped restrictions and recoverable trash.
- Own state per plugin instance, release restrictions on unload and clear disposed
  Agent overrides. Roll back Skill toggles if settings cannot be persisted; use
  unique private temporary files and clean failed writes.
- Add Windows/Linux unit, authenticated host/browser and archive-install CI.

See [root-cause evidence](docs/root-cause-fixes.md). Release 0.1.0 lacks these fixes. Its historical assets remain unchanged.

## 0.1.0

Initial Toolgate release after the Context Budget rename. Historical archive;
does not include the authentication, configuration integrity or lifecycle fixes.
