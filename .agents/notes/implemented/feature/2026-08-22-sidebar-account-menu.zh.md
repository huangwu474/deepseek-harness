# Agent Note: 侧栏账号菜单

Status: implemented

[English](2026-08-22-sidebar-account-menu.md) | 中文

## 问题

设置外壳占用 `sidebar.settings` 时，侧栏底部触发器直接打开设置对话框。桌面游客会话没有账号行入口来做外观快捷切换、帮助、更新状态，或在不关闭窗口的情况下回到 Electron 登录门页。游客也无法为该行自定本机显示名称。

## 决策

底部触发器为通栏账号条（圆形 CORKS 标志加文案），不是按内容收缩的芯片。点击后打开 portal `Menu`（`side="top"`）。「设置」是打开既有模态面板的菜单项。「外观」是子菜单，仅在 `ctx.get('theme', false)` 成功时调用可选的 `setTheme`；未挂载 `ui-theme` 的组合省略该项。「帮助」打开本机 `Modal` 说明。仅当 `window.dshDesktop.logout` 与 `checkUpdates` 都存在时才渲染「检查更新」和「退出登录」。

账号文案默认本地化「游客」。Electron 登录门页的可选显示名称随 `shell:enter` 提交；主进程规范化后写入 `userData/guest-display-name.txt`。设置里的「账户」页通过 `shell:setGuestDisplayName` 写同一文件，确认后可 `clearGuestProfile`（[账户管理](2026-08-23-settings-account-management.zh.md)）。preload 暴露 `getGuestDisplayName` 供门页回填与 Web 触发器读取。该名称仅是本机 UI 展示，不是账号身份。留空会清除存储并继续显示「游客」。

Electron preload 另有 `shell:logout` 与 `shell:checkUpdates`。主进程只接受来自环回 http(s) 的退出/更新 invoke；enter 与 getGuestDisplayName 接受登录文档（getGuestDisplayName 也接受环回）。退出登录 `loadFile` 登录门页，保留 dsh 子进程与 `pendingAppUrl`，并重发 `shell:hello`。检查更新返回 `{ ok: true }` 且不含下载 URL；由渲染进程提供本地化的「源码预览」文案。

`inject` 保持 `['slots', 'locale', 'connection', 'settingsScope']`。theme 永不作为必需 inject。外壳注册声明 `locale: 'settings'`，使菜单文案与 chrome 座位共用同一套字典。

## 曾考虑的替代方案

**保留触发器为直接打开设置的按钮，只把退出放进 Electron 应用菜单。** 不予采纳，因为产品交互是侧栏账号行；游客需要能在 UI 内退出并回到门页。

**账号菜单硬依赖 `ui-theme`。** 不予采纳，以便最小 profile 与包级 bench 在无 theme 时仍可加载。

**在本改动中实现安装包自动更新。** 不予采纳；源码壳没有安装渠道。菜单项只报告该事实。

**把游客显示名当作 harness 身份或与 anonymous-user-id 同步。** 不予采纳；遥测身份仍是 UUID，显示名仅是本机 chrome。

## 后果

浏览器标签页隐藏退出与检查更新，并保留「游客」文案。桌面游客会话可以离开环回 UI 而不杀死 dsh，并可在门页自定账号行名称。Web e2e 通过 `openSettingsDialog`（账号触发器 → 菜单项）打开设置。未注入桌面名称时，生命周期 chrome 快照将底部按钮命名为 Guest。

## 测试

包内单元测试覆盖账号菜单路径、可选桌面 API 探测、游客显示名读取，以及无 theme 时 themePreference 的默认值。测试通过 mock `window.dshDesktop` 完成；本改动不新增 Electron 主进程。Web e2e 助手与生命周期快照跟随 Guest 触发器。
