# Agent Note: 设置里的账户管理

Status: implemented

[English](2026-08-23-settings-account-management.md) | 中文

## Problem

桌面游客只能在登录门页的昵称引导里设置本机显示名称。设置窗口没有页面可以查看该资料、改名、在不清除资料的情况下退出，或清除资料以便再次出现引导。

## Decision

`ui-settings-general` 注册 `settings.section` `id: account`，`order: -10`（排在「通用」之前）。页面标题是「账户管理」。页面展示 CORKS 标志、已存昵称或本地化「游客」、「本地游客」，以及「资料仅保存在这台设备」。修改写入 `window.dshDesktop.setGuestDisplayName`；空白输入清除 `guest-display-name.txt`，账号行回退为「游客」。保存或清除会派发同一文档内的 `dsh-guest-display-name-changed` 事件，以便监听方重新读取昵称。设置齿轮触发器不订阅该事件。退出登录仍 `loadFile` 登录门页，并保留昵称和 `guest-onboarding-completed.txt`。「清除资料」经确认后调用 `clearGuestProfile` 删除这两个文件，下次「游客登录」会打开引导。没有积分、套餐或计费 UI。

仅回环 Web UI 可以调用 set/clear/logout。浏览器标签页渲染该页，但不提供这些操作。本包调用可选的 `window.dshDesktop`；不新增 Electron 主进程。

## Alternatives considered

**只在侧栏账号菜单里改名。** 否决：设置窗口是资料主页；菜单仍保留设置、外观、帮助、更新和退出登录。

**在 settings.yaml 里再存一份昵称。** 否决：登录门页和账户页共用 `userData/guest-display-name.txt`。

**退出登录时清除资料。** 否决：退出只离开工作区，不重置首次引导状态。

## Consequences

打开「设置」仍落在「通用」。「账户」在导航最前。回访游客已通过 `getGuestOnboardingState` 跳过引导；只有清除资料才会再次看到引导。

## Testing

包测试覆盖账户分区注册、保存昵称并派发同一文档事件、确认后清除，以及浏览器标签页渲染该页但不提供 set/clear/logout。测试通过 mock `window.dshDesktop` 完成。
