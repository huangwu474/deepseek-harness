/** Shell chrome, Account, and General-nav dictionaries; feature rows own their copy. */

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'trigger': '设置',
  'title': '设置',
  'close': '关闭',
  'openDocument': '打开配置文件',
  'openDocument.error': '无法打开配置文件',
  'general.nav': '通用设置',
  'account.nav': '账户',
  'account.title': '账户管理',
  'account.role': '本地游客',
  'account.localOnly': '资料仅保存在这台设备',
  'account.edit': '修改',
  'account.save': '保存',
  'account.cancel': '取消',
  'account.saveError': '无法保存昵称',
  'account.clearTitle': '危险操作',
  'account.clearHint': '清除昵称和本地游客资料',
  'account.clearAction': '清除资料',
  'account.clearConfirmTitle': '清除游客资料？',
  'account.clearConfirmBody': '将删除本机保存的昵称。下次游客登录会重新询问怎么称呼你。',
  'account.clearConfirm': '确认清除',
  'account.clearError': '无法清除游客资料',
  'account.guest': '游客',
  'account.logout': '退出登录',
} satisfies Record<string, string>

/** The settings namespace key union. */
export type SettingsKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'trigger': 'Settings',
  'title': 'Settings',
  'close': 'Close',
  'openDocument': 'Open configuration file',
  'openDocument.error': 'Could not open configuration file',
  'general.nav': 'General',
  'account.nav': 'Account',
  'account.title': 'Account management',
  'account.role': 'Local guest',
  'account.localOnly': 'Profile is stored only on this device',
  'account.edit': 'Edit',
  'account.save': 'Save',
  'account.cancel': 'Cancel',
  'account.saveError': 'Could not save the display name',
  'account.clearTitle': 'Danger zone',
  'account.clearHint': 'Clear the nickname and local guest profile',
  'account.clearAction': 'Clear profile',
  'account.clearConfirmTitle': 'Clear guest profile?',
  'account.clearConfirmBody': 'This deletes the nickname saved on this computer. The next guest sign-in will ask what to call you again.',
  'account.clearConfirm': 'Clear',
  'account.clearError': 'Could not clear the guest profile',
  'account.guest': 'Guest',
  'account.logout': 'Log out',
} satisfies Record<SettingsKey, string>
