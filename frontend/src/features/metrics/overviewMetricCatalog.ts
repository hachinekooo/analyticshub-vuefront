export const OVERVIEW_METRIC_KEYS = {
  activeDevices: 'system.active_devices',
  activeActors: 'system.active_actors',
  eventOccurrences: 'system.event_occurrences',
  topActiveAppVersion: 'system.top_active_app_version',
  accountCreated: 'core.account.created',
  accountRecreated: 'core.account.recreated',
} as const

export type OverviewMetricKey = typeof OVERVIEW_METRIC_KEYS[keyof typeof OVERVIEW_METRIC_KEYS]

export type OverviewMetricDescriptor = {
  key: OverviewMetricKey
  kind: 'system' | 'business'
  labelKey: string
  helpKey: string
}

export const OVERVIEW_METRIC_CATALOG: readonly OverviewMetricDescriptor[] = [
  {
    key: OVERVIEW_METRIC_KEYS.activeDevices,
    kind: 'system',
    labelKey: 'metrics.overviewItems.devicesActive',
    helpKey: 'metrics.help.devicesActive',
  },
  {
    key: OVERVIEW_METRIC_KEYS.activeActors,
    kind: 'system',
    labelKey: 'metrics.overviewItems.usersActive',
    helpKey: 'metrics.help.usersActive',
  },
  {
    key: OVERVIEW_METRIC_KEYS.eventOccurrences,
    kind: 'system',
    labelKey: 'metrics.overviewItems.eventsTotal',
    helpKey: 'metrics.help.eventsTotal',
  },
  {
    key: OVERVIEW_METRIC_KEYS.topActiveAppVersion,
    kind: 'system',
    labelKey: 'metrics.overviewItems.topAppVersion',
    helpKey: 'metrics.help.topAppVersion',
  },
  {
    key: OVERVIEW_METRIC_KEYS.accountCreated,
    kind: 'business',
    labelKey: 'metrics.overviewItems.cloudAccountsCreated',
    helpKey: 'metrics.help.cloudAccountsCreated',
  },
  {
    key: OVERVIEW_METRIC_KEYS.accountRecreated,
    kind: 'business',
    labelKey: 'metrics.overviewItems.cloudAccountsRecreated',
    helpKey: 'metrics.help.cloudAccountsRecreated',
  },
]

const supportedKeys = new Set<OverviewMetricKey>(OVERVIEW_METRIC_CATALOG.map(metric => metric.key))

export const isOverviewMetricKey = (value: unknown): value is OverviewMetricKey =>
  typeof value === 'string' && supportedKeys.has(value as OverviewMetricKey)

/**
 * 配置缺失时使用后端声明的可用顺序；显式配置时保留用户顺序。
 * 不在客户端推断服务端能力，避免缺失合同被误装成可用指标。
 */
export const resolveOverviewMetricKeys = (
  configuredKeys: unknown,
  availableKeys: readonly string[],
): OverviewMetricKey[] => {
  const normalizedAvailable = [...new Set(availableKeys.filter(isOverviewMetricKey))]
  const available = new Set(normalizedAvailable)
  const requested = Array.isArray(configuredKeys)
    ? configuredKeys.filter(isOverviewMetricKey)
    : normalizedAvailable
  return [...new Set(requested)].filter(key => available.has(key))
}

export const resolveTrendMetricKeys = (
  availableKeys: readonly string[],
): OverviewMetricKey[] => [...new Set(availableKeys.filter(isOverviewMetricKey))]
