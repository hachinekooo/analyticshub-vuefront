import { computed, ref } from 'vue'

export type Locale = 'en' | 'zh'

const resolveInitialLocale = (): Locale => {
  try {
    const stored = localStorage.getItem('locale')
    if (stored === 'zh' || stored === 'en') return stored
  } catch {
    // Ignore storage access errors (SSR or blocked storage).
  }
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language.toLowerCase()
    if (lang.startsWith('zh')) return 'zh'
  }
  return 'en'
}

export const locale = ref<Locale>(resolveInitialLocale())

export const setLocale = (next: Locale) => {
  locale.value = next
  try {
    localStorage.setItem('locale', next)
  } catch {
    // Ignore storage access errors.
  }
}

const messages = {
  en: {
    nav: {
      projects: 'Projects',
      metrics: 'Metrics',
    },
    dashboard: {
      title: '📊 Analytics System',
      subtitle: 'Manage project configurations and data pipelines',
      empty: 'No projects found. Click the button above to add one.',
      viewMetrics: 'View Metrics',
      labels: {
        id: 'ID',
        db: 'DB',
        prefix: 'Prefix',
      },
    },
    buttons: {
      addProject: 'Add Project',
      checkStatus: 'Check Status',
      initTables: 'Init Tables',
      edit: 'Edit',
      delete: 'Delete',
      save: 'Save',
      cancel: 'Cancel',
      refresh: 'Refresh',
    },
    status: {
      active: 'Active',
      inactive: 'Inactive',
      connection: 'Connection',
      devices: 'Devices',
      events: 'Events',
      sessions: 'Sessions',
      traffic: 'Traffic',
      banned: 'Banned',
      normal: 'Active',
    },
    dialogs: {
      addProject: 'Add Project',
      editProject: 'Edit Project',
      confirmInitTitle: 'Confirm Initialization',
      confirmInitMessage: 'Initialize database for {name}? This will create analytics tables.',
      confirmInitOk: 'Initialize',
      confirmDeleteTitle: 'Confirm Deletion',
      confirmDeleteMessage: 'Are you sure you want to delete {name}? Configuration will be removed but data remains.',
      confirmDeleteOk: 'Delete',
    },
    form: {
      projectId: 'Project ID',
      projectName: 'Project Name',
      dbHost: 'Database Host',
      port: 'Port',
      dbName: 'Database Name',
      tablePrefix: 'Table Prefix',
      username: 'Username',
      password: 'Password',
      status: 'Status',
      placeholders: {
        projectId: 'e.g. memobox',
        projectName: 'e.g. MemoBox',
        dbHost: 'localhost',
        dbName: 'e.g. memobox',
        tablePrefix: 'analytics_',
        username: 'root',
        password: 'Password',
        passwordEdit: 'Leave empty to keep unchanged',
      },
    },
    messages: {
      projectUpdated: 'Project updated successfully',
      projectCreated: 'Project created successfully',
      projectDeleted: 'Project deleted successfully',
      loadProjectsFailed: 'Failed to load projects',
      saveProjectFailed: 'Failed to save project',
      initSuccess: 'Initialization successful',
      initFailed: 'Initialization failed',
      deletionFailed: 'Deletion failed',
    },
    metrics: {
      title: 'Operational Metrics',
      subtitle: 'Monitor key indicators, trends, and detailed records',
      overview: 'Overview',
      trends: 'Trends',
      topEvents: 'Top Events',
      events: 'Events',
      devices: 'Devices',
      sessions: 'Sessions',
      traffic: 'Traffic',
      overviewEmpty: 'Select a project and click Refresh',
      noTrendData: 'No trend data',
      overviewItems: {
        devicesTotal: 'Devices Total',
        devicesActive: 'Active Devices',
        usersActive: 'Active Users',
        sessionsTotal: 'Sessions Total',
        eventsTotal: 'Events Total',
        avgSessionDuration: 'Avg Session Duration',
        avgEventsPerSession: 'Avg Events / Session',
      },
      chart: {
        range: 'Range',
        granularity: 'Granularity',
        events: 'Events',
        sessions: 'Sessions',
      },
    },
    filters: {
      project: 'Project',
      dateRange: 'Date Range',
      granularity: 'Granularity',
      topLimit: 'Top Limit',
      eventType: 'Event Type',
      deviceId: 'Device ID',
      sessionId: 'Session ID',
      metricType: 'Metric Type',
      userId: 'User ID',
      apiKey: 'API Key',
      banStatus: 'Ban Status',
      selectProject: 'Select project',
      startDate: 'Start date',
      endDate: 'End date',
      rangeSeparator: 'to',
      daily: 'Daily',
      hourly: 'Hourly',
      placeholders: {
        eventType: 'e.g. page_view',
        metricType: 'e.g. page_view',
        userId: 'user123',
        deviceId: 'UUID',
        sessionId: 'UUID',
        apiKey: 'ak_xxx',
      },
    },
    tables: {
      time: 'Time',
      events: 'Events',
      sessions: 'Sessions',
      count: 'Count',
      eventType: 'Event Type',
      eventTime: 'Event Time',
      deviceId: 'Device ID',
      userId: 'User ID',
      sessionId: 'Session ID',
      properties: 'Properties',
      model: 'Model',
      osVersion: 'OS Version',
      appVersion: 'App Version',
      status: 'Status',
      lastActive: 'Last Active',
      startTime: 'Start Time',
      duration: 'Duration',
      page: 'Page',
      referrer: 'Referrer',
      metricType: 'Metric Type',
    },
    errors: {
      selectProject: 'Please select a project',
      overviewFailed: 'Failed to load overview metrics',
      trendsFailed: 'Failed to load trend data',
      topEventsFailed: 'Failed to load top events',
      eventsFailed: 'Failed to load events',
      devicesFailed: 'Failed to load devices',
      sessionsFailed: 'Failed to load sessions',
      trafficFailed: 'Failed to load traffic metrics',
      networkFailed: 'Network request failed',
    },
    login: {
      title: 'Admin Login',
      subtitle: 'Enter your access token to continue',
      tokenPlaceholder: 'Access Token',
      login: 'Login',
      loggingIn: 'Logging in...',
      emptyToken: 'Please enter admin token',
      errorFallback: 'Network error or token invalid',
    },
    auth: {
      sessionExpired: 'Session expired. Please log in again.',
    },
  },
  zh: {
    nav: {
      projects: '项目管理',
      metrics: '运营数据',
    },
    dashboard: {
      title: '📊 运营管理中心',
      subtitle: '管理项目配置与数据管道',
      empty: '暂无项目，请点击上方按钮添加。',
      viewMetrics: '查看指标',
      labels: {
        id: '标识',
        db: '数据库',
        prefix: '前缀',
      },
    },
    buttons: {
      addProject: '新增项目',
      checkStatus: '检查状态',
      initTables: '初始化表',
      edit: '编辑',
      delete: '删除',
      save: '保存',
      cancel: '取消',
      refresh: '刷新',
    },
    status: {
      active: '启用',
      inactive: '停用',
      connection: '连接',
      devices: '设备',
      events: '事件',
      sessions: '会话',
      traffic: '流量',
      banned: '已封禁',
      normal: '正常',
    },
    dialogs: {
      addProject: '新增项目',
      editProject: '编辑项目',
      confirmInitTitle: '确认初始化',
      confirmInitMessage: '确认初始化 {name} 的数据库吗？这将创建分析表。',
      confirmInitOk: '初始化',
      confirmDeleteTitle: '确认删除',
      confirmDeleteMessage: '确定删除 {name} 吗？配置将被移除，但数据仍保留。',
      confirmDeleteOk: '删除',
    },
    form: {
      projectId: '项目 ID',
      projectName: '项目名称',
      dbHost: '数据库地址',
      port: '端口',
      dbName: '数据库名',
      tablePrefix: '表前缀',
      username: '用户名',
      password: '密码',
      status: '状态',
      placeholders: {
        projectId: '例如 memobox',
        projectName: '例如 MemoBox',
        dbHost: 'localhost',
        dbName: '例如 memobox',
        tablePrefix: 'analytics_',
        username: 'root',
        password: '密码',
        passwordEdit: '留空则保持不变',
      },
    },
    messages: {
      projectUpdated: '项目更新成功',
      projectCreated: '项目创建成功',
      projectDeleted: '项目已删除',
      loadProjectsFailed: '加载项目失败',
      saveProjectFailed: '保存项目失败',
      initSuccess: '初始化成功',
      initFailed: '初始化失败',
      deletionFailed: '删除失败',
    },
    metrics: {
      title: '运营数据',
      subtitle: '查看核心指标、趋势与明细记录',
      overview: '总览指标',
      trends: '趋势数据',
      topEvents: '事件排行',
      events: '事件记录',
      devices: '设备列表',
      sessions: '会话列表',
      traffic: '流量指标',
      overviewEmpty: '请选择项目并点击刷新',
      noTrendData: '暂无趋势数据',
      overviewItems: {
        devicesTotal: '设备总数',
        devicesActive: '活跃设备',
        usersActive: '活跃用户',
        sessionsTotal: '会话总数',
        eventsTotal: '事件总数',
        avgSessionDuration: '平均会话时长',
        avgEventsPerSession: '平均事件/会话',
      },
      chart: {
        range: '区间',
        granularity: '粒度',
        events: '事件',
        sessions: '会话',
      },
    },
    filters: {
      project: '项目',
      dateRange: '时间范围',
      granularity: '趋势粒度',
      topLimit: '排行数量',
      eventType: '事件类型',
      deviceId: '设备 ID',
      sessionId: '会话 ID',
      metricType: '指标类型',
      userId: '用户 ID',
      apiKey: 'API Key',
      banStatus: '封禁状态',
      selectProject: '请选择项目',
      startDate: '开始日期',
      endDate: '结束日期',
      rangeSeparator: '至',
      daily: '按天',
      hourly: '按小时',
      placeholders: {
        eventType: '例如 page_view',
        metricType: '例如 page_view',
        userId: 'user123',
        deviceId: 'UUID',
        sessionId: 'UUID',
        apiKey: 'ak_xxx',
      },
    },
    tables: {
      time: '时间',
      events: '事件数',
      sessions: '会话数',
      count: '数量',
      eventType: '事件类型',
      eventTime: '发生时间',
      deviceId: '设备 ID',
      userId: '用户 ID',
      sessionId: '会话 ID',
      properties: '属性',
      model: '设备型号',
      osVersion: '系统版本',
      appVersion: 'App 版本',
      status: '状态',
      lastActive: '最近活跃',
      startTime: '开始时间',
      duration: '时长',
      page: '页面',
      referrer: '来源',
      metricType: '指标类型',
    },
    errors: {
      selectProject: '请选择项目',
      overviewFailed: '获取总览指标失败',
      trendsFailed: '获取趋势数据失败',
      topEventsFailed: '获取事件排行失败',
      eventsFailed: '获取事件记录失败',
      devicesFailed: '获取设备列表失败',
      sessionsFailed: '获取会话列表失败',
      trafficFailed: '获取流量指标失败',
      networkFailed: '网络请求失败',
    },
    login: {
      title: '管理员登录',
      subtitle: '请输入管理员 Token 继续',
      tokenPlaceholder: 'Access Token',
      login: '登录',
      loggingIn: '登录中...',
      emptyToken: '请输入管理员 Token',
      errorFallback: '网络错误或 Token 无效',
    },
    auth: {
      sessionExpired: '登录已过期，请重新登录',
    },
  },
} as const

const resolveMessage = (key: string) => {
  const parts = key.split('.')
  let current: Record<string, unknown> | string = messages[locale.value]
  for (const part of parts) {
    if (typeof current !== 'object' || current === null) return key
    current = (current as Record<string, unknown>)[part] as Record<string, unknown> | string
  }
  return current
}

export const t = (key: string, params?: Record<string, string | number>) => {
  const message = resolveMessage(key)
  if (typeof message !== 'string') return key
  if (!params) return message
  return message.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ''))
}

export const useI18n = () => {
  return {
    locale,
    setLocale,
    t,
    isZh: computed(() => locale.value === 'zh'),
  }
}
