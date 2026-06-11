import { ref } from 'vue';

type Locale = 'zh' | 'en';

const zh = {
  nav: {
    accounts: '账户', jobs: '任务', settings: '设置',
    logs: '日志', help: '帮助', logout: '退出登录',
  },
  common: {
    save: '保存', saving: '保存中...', cancel: '取消',
    edit: '编辑', delete: '删除', run: '运行', runBusy: '...',
    name: '名称', actions: '操作', yes: '是', no: '否',
    refresh: '刷新', loadMore: '加载更多', stop: '停止', stopping: '停止中...',
    blankForDefault: '留空使用系统默认',
    leaveBlankKeep: '留空保持不变',
    saveFailed: '保存失败',
    default: '默认', custom: '自定义',
  },
  login: {
    subtitle: '登录管理面板',
    username: '用户名', password: '密码',
    signIn: '登录', signingIn: '登录中...',
    error: '用户名或密码错误',
    rateLimited: '登录尝试次数过多，请 15 分钟后重试',
  },
  accounts: {
    title: 'Telegram 账户', addBtn: '+ 添加账户',
    colPhone: '手机号', colStatus: '状态', colAdded: '添加时间',
    noAccounts: '暂无账户',
    editTitle: '编辑账户', addTitle: '添加账户',
    labelName: '显示名称', labelPhone: '手机号码',
    labelApiId: 'API ID', labelApiHash: 'API Hash',
    apiHint: '从 my.telegram.org/apps 获取 API ID 和 Hash',
    authTitle: '认证',
    authHint: '验证码将发送到',
    labelCode: '验证码', labelTwoFa: '二步验证密码',
    sendCode: '发送验证码', sending: '发送中...',
    verify: '验证', verifying: '验证中...', submit: '提交',
    authenticate: '认证',
    confirmDelete: '确定删除此账户及其所有任务？',
    status: {
      unauthenticated: '未认证',
      pending_code: '等待验证码',
      pending_2fa: '等待二步验证',
      authenticated: '已认证',
    },
    errors: {
      sendFailed: '验证码发送失败',
      verifyFailed: '验证失败',
      twoFaFailed: '二步验证失败',
    },
  },
  jobs: {
    title: '任务', addBtn: '+ 添加任务',
    nextRuns: '下次计划运行',
    colAccount: '账户', colType: '类型', colBotUrl: '机器人/网址',
    colWindow: '时间窗口', colEnabled: '启用',
    noJobs: '暂无任务',
    editTitle: '编辑任务', addTitle: '添加任务',
    labelName: '任务名称', labelType: '任务类型',
    labelAccount: '账户', selectAccount: '选择账户',
    labelBot: '机器人用户名', labelServerUrl: '服务器地址',
    labelEmbyUser: 'Emby 用户名', labelEmbyPass: 'Emby 密码',
    labelPlayDuration: '播放时长（秒）',
    labelUserAgent: '用户代理',
    labelStartCommand: '启动命令',
    startCommandHint: '支持占位符：{word:N} {WORD:N} {num:N} {alpha:N} {uuid}',
    labelCheckinButton: '签到按钮文字',
    checkinButtonHint: '特殊选项：{anyBtn} 随机点击，{aiBtn} AI 智能选择（需配置 QWEN_API_KEY）',
    aiBtnOption: '{aiBtn} — AI 识别', anyBtnOption: '{anyBtn} — 随机',
    noApiKey: '未配置密钥', aiKeyWarning: '未配置 AI API 密钥，请前往设置页面配置。',
    labelReplyTimeout: '回复超时（毫秒）',
    labelWindowStart: '开始时间（HHMM）',
    labelWindowEnd: '结束时间（HHMM）',
    labelMaxRetries: '最大重试次数',
    labelEnabled: '启用',
    confirmDelete: '确定删除此任务及其日志？',
    confirmDisable: '确定禁用此任务？',
    errors: {
      nameRequired: '任务名称为必填项',
      accountRequired: '账户为必填项',
      hostRequired: '服务器主机为必填项',
      botRequired: '机器人用户名为必填项',
      embyCredRequired: 'Emby 用户名和密码为必填项',
    },
  },
  logs: {
    title: '日志', allJobs: '所有任务',
    colTime: '时间', colJob: '任务', colAccount: '账户',
    colStatus: '状态', colMessage: '消息',
    noLogs: '暂无日志',
    status: { success: '成功', failed: '失败', running: '运行中' },
    jobType: { checkin: '签到', embywatch: '观看' },
    detail: {
      attempt: '第 {n} 次尝试',
      commandSent: '发送命令',
      botResponse: '机器人回复',
      buttonClicked: '点击按钮',
      callbackAnswer: '回调消息',
      noDetail: '无详细记录',
      noText: '（无文字内容）',
      availableButtons: '可用按钮',
      loading: '加载中...',
    },
  },
  settings: {
    title: '设置',
    sysDefaults: '系统默认值',
    saved: '设置已保存', saveFailed: '保存失败',
    labelTimezone: '默认时区',
    labelMaxRetries: '默认最大重试次数',
    labelDailyRun: '每天仅运行一次',
    dailyRunHint: '测试时可关闭此选项，允许任务在当天重复运行。',
    embyDefaults: 'Emby 观看默认值',
    labelPlayDuration: '默认播放时长（秒）',
    labelDeviceName: '设备名称',
    labelUserAgent: '默认用户代理',
    saveBtn: '保存',
    aiSection: 'AI 按钮识别',
    aiHint: '用于 {aiBtn} 功能，从内联键盘中自动识别签到按钮。',
    labelAiBaseUrl: 'API 地址',
    labelAiApiKey: 'API 密钥',
    labelAiModel: '模型',
    labelAiTimeout: '超时（毫秒）',
    adminCreds: '管理员',
    credSaved: '已更新，如更改了用户名或密码请重新登录。',
    credFailed: '更新失败',
    labelNewUsername: '新用户名',
    labelNewPassword: '新密码',
    labelCurrentPass: '当前密码',
    hintKeepBlank: '留空保持不变',
    currentPassRequired: '请输入当前密码',
    updateBtn: '更新',
  },
};

const en: typeof zh = {
  nav: {
    accounts: 'Accounts', jobs: 'Jobs', settings: 'Settings',
    logs: 'Logs', help: 'Help', logout: 'Logout',
  },
  common: {
    save: 'Save', saving: 'Saving...', cancel: 'Cancel',
    edit: 'Edit', delete: 'Delete', run: 'Run', runBusy: '...',
    name: 'Name', actions: 'Actions', yes: 'Yes', no: 'No',
    refresh: 'Refresh', loadMore: 'Load more', stop: 'Stop', stopping: 'Stopping...',
    blankForDefault: '— blank uses system default',
    leaveBlankKeep: '— leave blank to keep current',
    saveFailed: 'Save failed',
    default: 'Default', custom: 'Custom',
  },
  login: {
    subtitle: 'Sign in to access the admin panel',
    username: 'Username', password: 'Password',
    signIn: 'Sign in', signingIn: 'Signing in...',
    error: 'Invalid username or password',
    rateLimited: 'Too many login attempts. Please try again in 15 minutes.',
  },
  accounts: {
    title: 'Telegram Accounts', addBtn: '+ Add Account',
    colPhone: 'Phone', colStatus: 'Status', colAdded: 'Added',
    noAccounts: 'No accounts yet',
    editTitle: 'Edit Account', addTitle: 'Add Account',
    labelName: 'Display Name', labelPhone: 'Phone Number',
    labelApiId: 'API ID', labelApiHash: 'API Hash',
    apiHint: 'Get API ID & Hash from my.telegram.org/apps',
    authTitle: 'Authenticate',
    authHint: 'A verification code will be sent to',
    labelCode: 'Verification Code', labelTwoFa: '2FA Password',
    sendCode: 'Send Verification Code', sending: 'Sending...',
    verify: 'Verify', verifying: 'Verifying...', submit: 'Submit',
    authenticate: 'Authenticate',
    confirmDelete: 'Delete this account and all its jobs?',
    status: {
      unauthenticated: 'Unauthenticated',
      pending_code: 'Pending Code',
      pending_2fa: 'Pending 2FA',
      authenticated: 'Authenticated',
    },
    errors: {
      sendFailed: 'Failed to send code',
      verifyFailed: 'Verification failed',
      twoFaFailed: '2FA failed',
    },
  },
  jobs: {
    title: 'Jobs', addBtn: '+ Add Job',
    nextRuns: 'Next Scheduled Runs',
    colAccount: 'Account', colType: 'Type', colBotUrl: 'Bot / URL',
    colWindow: 'Window', colEnabled: 'Enabled',
    noJobs: 'No jobs yet',
    editTitle: 'Edit Job', addTitle: 'Add Job',
    labelName: 'Job Name', labelType: 'Job Type',
    labelAccount: 'Account', selectAccount: 'Select account',
    labelBot: 'Bot Username', labelServerUrl: 'Server URL',
    labelEmbyUser: 'Emby Username', labelEmbyPass: 'Emby Password',
    labelPlayDuration: 'Play Duration (s)',
    labelUserAgent: 'User Agent',
    labelStartCommand: 'Start Command',
    startCommandHint: 'Placeholders: {word:N} {WORD:N} {num:N} {alpha:N} {uuid}',
    labelCheckinButton: 'Check-in Button Text',
    checkinButtonHint: 'Special: {anyBtn} picks random, {aiBtn} uses AI (requires QWEN_API_KEY)',
    aiBtnOption: '{aiBtn} — AI picks', anyBtnOption: '{anyBtn} — random',
    noApiKey: 'no API key', aiKeyWarning: 'AI API key not configured — set it in Settings.',
    labelReplyTimeout: 'Reply Timeout (ms)',
    labelWindowStart: 'Window Start (HHMM)',
    labelWindowEnd: 'Window End (HHMM)',
    labelMaxRetries: 'Max Retries',
    labelEnabled: 'Enabled',
    confirmDelete: 'Delete this job and its logs?',
    confirmDisable: 'Disable this job?',
    errors: {
      nameRequired: 'Job name is required',
      accountRequired: 'Account is required',
      hostRequired: 'Server host is required',
      botRequired: 'Bot username is required',
      embyCredRequired: 'Emby username and password are required',
    },
  },
  logs: {
    title: 'Logs', allJobs: 'All jobs',
    colTime: 'Time', colJob: 'Job', colAccount: 'Account',
    colStatus: 'Status', colMessage: 'Message',
    noLogs: 'No logs yet',
    status: { success: 'Success', failed: 'Failed', running: 'Running' },
    jobType: { checkin: 'Check-in', embywatch: 'Emby Watch' },
    detail: {
      attempt: 'Attempt {n}',
      commandSent: 'Command sent',
      botResponse: 'Bot response',
      buttonClicked: 'Button clicked',
      callbackAnswer: 'Callback message',
      noDetail: 'No detail recorded',
      noText: '(no text content)',
      availableButtons: 'Available buttons',
      loading: 'Loading...',
    },
  },
  settings: {
    title: 'Settings',
    sysDefaults: 'System Defaults',
    saved: 'Settings saved.', saveFailed: 'Save failed',
    labelTimezone: 'Default Timezone',
    labelMaxRetries: 'Default Max Retries',
    labelDailyRun: 'Enforce one run per day',
    dailyRunHint: 'Disable when testing so the scheduler re-runs even if the job already ran today.',
    embyDefaults: 'Emby Watch Defaults',
    labelPlayDuration: 'Default Play Duration (seconds)',
    labelDeviceName: 'Device Name',
    labelUserAgent: 'Default User Agent',
    saveBtn: 'Save',
    aiSection: 'AI Button Detection',
    aiHint: 'Used by {aiBtn} to automatically identify the check-in button from an inline keyboard.',
    labelAiBaseUrl: 'API Base URL',
    labelAiApiKey: 'API Key',
    labelAiModel: 'Model',
    labelAiTimeout: 'Timeout (ms)',
    adminCreds: 'Admin Credentials',
    credSaved: 'Credentials updated. Re-login if you changed your username or password.',
    credFailed: 'Update failed',
    labelNewUsername: 'New Username',
    labelNewPassword: 'New Password',
    labelCurrentPass: 'Current Password',
    hintKeepBlank: '— leave blank to keep current',
    currentPassRequired: 'Current password is required',
    updateBtn: 'Update Credentials',
  },
};

const messages = { zh, en };

export const locale = ref<Locale>(
  (localStorage.getItem('bemby-locale') as Locale | null) ?? 'zh'
);

export function setLocale(l: Locale) {
  locale.value = l;
  localStorage.setItem('bemby-locale', l);
}

export function t(key: string): string {
  const parts = key.split('.');
  let cur: unknown = messages[locale.value];
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return key;
    cur = (cur as Record<string, unknown>)[p];
  }
  return typeof cur === 'string' ? cur : key;
}

export function ta(key: string): string[] {
  const parts = key.split('.');
  let cur: unknown = messages[locale.value];
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return [];
    cur = (cur as Record<string, unknown>)[p];
  }
  return Array.isArray(cur) ? (cur as string[]) : [];
}
