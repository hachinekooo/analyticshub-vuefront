import request from '@/utils/request'
import type { CounterEventTrigger } from '@/features/counters/eventTrigger'

export type {
  CounterEventTrigger,
  CounterEventTriggerClause,
} from '@/features/counters/eventTrigger'
import type { ApiResponse } from '@/api/admin'

export type MetricsGranularity = 'hour' | 'day'
export type TrafficGranularity = MetricsGranularity | 'week' | 'month' | 'year'

export type MetricsOverview = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  devicesTotal: number
  devicesActive: number
  usersActive: number
  cloudAccountsCreated: number
  cloudAccountsRecreated: number
  sessionsTotal: number
  eventsTotal: number
  avgSessionDurationMs: number
  avgEventsPerSession: number
  /** 新后端声明的项目级可用指标；旧服务响应可能暂时缺失。 */
  availableMetricKeys?: string[]
}

export type TrendPoint = {
  time: string
  events: number
  activeDevices: number
  activeUsers: number
  cloudAccountsCreated: number
  cloudAccountsRecreated: number
  sessions: number
}

export type AppVersionDistributionItem = {
  appVersion: string
  buildNumber: string
  activeDevices: number
  share: number
  lastObservedAt: string
}

export type AppVersionDistribution = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  measurement: 'latest_occurred_event_per_device'
  activeDevices: number
  versionKnownDevices: number
  coverageRate: number
  items: AppVersionDistributionItem[]
}

export type MetricsTrends = {
  projectId: string
  granularity: MetricsGranularity
  rangeStart: string
  rangeEnd: string
  points: TrendPoint[]
  /** 新后端声明的项目级可用趋势；旧服务响应可能暂时缺失。 */
  availableMetricKeys?: string[]
}

export type TopEventItem = {
  eventType: string
  count: number
}

export type MetricsTopEvents = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  items: TopEventItem[]
}

export type EventRecord = {
  eventId: string
  eventType: string
  eventTimestamp: number
  createdAt: string
  deviceId: string
  userId: string | null
  resolvedActorId: string | null
  identityScope: string | null
  actorLinked: boolean
  sessionId: string | null
  properties: Record<string, unknown> | null
}

export type EventJourney = {
  projectId: string
  anchorEventId: string
  subjectType: 'actor' | 'device'
  resolvedActorId: string | null
  rangeStart: string
  rangeEnd: string
  total: number
  truncated: boolean
  items: JourneyEventRecord[]
}

export type JourneyEventRecord = EventRecord & {
  propertiesBytes: number
  propertiesLoadable: boolean
  propertiesDeferred: boolean
}

export type EventPropertiesResponse = {
  projectId: string
  eventId: string
  properties: Record<string, unknown> | null
}

export type DeviceRecord = {
  deviceId: string
  apiKey: string
  deviceModel: string
  osVersion: string
  /** 当前分析设备记录的注册版本快照，不代表安装版本或当前活跃版本。 */
  appVersion: string
  isBanned: boolean
  banReason: string | null
  createdAt: string
  lastActiveAt: string
}

export type SessionRecord = {
  sessionId: string
  deviceId: string
  userId: string | null
  sessionStartTime: string
  sessionDurationMs: number
  deviceModel: string
  osVersion: string
  appVersion: string
  buildNumber: string
  screenCount: number
  eventCount: number
  createdAt: string
}

export type TrafficMetricRecord = {
  metricId: string
  metricType: string
  pagePath: string | null
  referrer: string | null
  metricTimestamp: number
  createdAt: string
  deviceId: string
  userId: string | null
  sessionId: string | null
  metadata: Record<string, unknown> | null
}

export type PagedResult<T> = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  page: number
  pageSize: number
  total: number
  items: T[]
}

export type TrafficSummary = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  pageViews: number
  visitors: number
}

export type CounterItem = {
  key: string
  value: number
  displayName: Record<string, string> | string | null
  unit: Record<string, string> | string | null
  eventTrigger: CounterEventTrigger | null
  isPublic: boolean
  description: string | null
  updatedAt: string
  lastRebuiltAt: string | null
  lastRebuildEventCount: number | null
  rebuildOffset: number
  historyMode: CounterHistoryMode
  eventCountStartAt: string | null
}

export type CounterHistoryMode = 'INCLUDE_EXISTING' | 'START_FROM_NOW'

export type CounterUpsertPayload = {
  value?: number
  displayName?: Record<string, string>
  unit?: Record<string, string>
  eventTrigger?: CounterEventTrigger
  clearEventTrigger?: boolean
  isPublic?: boolean
  description?: string
  rebuildOffset?: number
  historyMode?: CounterHistoryMode
}

export type PublicCounterItem = {
  key: string
  value: number
  displayName: string
  unit: string
  updatedAt: string
}

export type CountersResponse = {
  projectId: string
  items: CounterItem[]
}

export type TrafficTrendPoint = {
  time: string
  pageViews: number
  visitors: number
}

export type TrafficTrends = {
  projectId: string
  granularity: TrafficGranularity
  rangeStart: string
  rangeEnd: string
  points: TrafficTrendPoint[]
}

export type TopPageItem = {
  key: string
  count: number
}

export type TopReferrerItem = {
  key: string
  count: number
}

export type TrafficTopResponse<T extends TopPageItem | TopReferrerItem> = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  items: T[]
}

export type FunnelStepResult = {
  stepIndex: number
  eventType: string
  users: number
  conversionRate: number
  dropOffRate: number
}

export type FunnelGroupResult = {
  groupValue: string
  steps: FunnelStepResult[]
}

export type FunnelResponse = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  steps: string[]
  groupBy: string | null
  journeyKey: string | null
  countingUnit: 'actors' | 'journeys'
  attributionModel: string
  groups: FunnelGroupResult[]
}

export type RetentionBucket = {
  day: number
  retainedUsers: number
  retentionRate: number
}

export type RetentionResponse = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  cohortEvent: string
  returnEvent: string
  cohortUsers: number
  buckets: RetentionBucket[]
}

export const getMetricsOverview = (params: {
  projectId: string
  from?: string
  to?: string
}) => {
  return request.get<ApiResponse<MetricsOverview>>('/admin/metrics/overview', { params })
}

export const getMetricsTrends = (params: {
  projectId: string
  from?: string
  to?: string
  granularity?: MetricsGranularity
}) => {
  return request.get<ApiResponse<MetricsTrends>>('/admin/metrics/trends', { params })
}

export const getAppVersionDistribution = (params: {
  projectId: string
  from?: string
  to?: string
}) => {
  return request.get<ApiResponse<AppVersionDistribution>>('/admin/metrics/app-versions', { params })
}

export const getTopEvents = (params: {
  projectId: string
  from?: string
  to?: string
  limit?: number
  aggregation?: 'raw' | 'semantic'
}) => {
  return request.get<ApiResponse<MetricsTopEvents>>('/admin/metrics/top-events', { params })
}

export const getEvents = (params: {
  projectId: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  eventType?: string
  userId?: string
  resolvedActorId?: string
  deviceId?: string
}) => {
  return request.get<ApiResponse<PagedResult<EventRecord>>>('/admin/events', { params })
}

export const getEventJourney = (params: {
  projectId: string
  anchorEventId: string
  beforeMinutes?: number
  afterMinutes?: number
}) => {
  return request.get<ApiResponse<EventJourney>>('/admin/events/journey', { params })
}

export const getEventProperties = (params: { projectId: string; eventId: string }) => {
  return request.get<ApiResponse<EventPropertiesResponse>>('/admin/events/properties', { params })
}

export const getDevices = (params: {
  projectId: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  deviceId?: string
  apiKey?: string
  isBanned?: boolean
}) => {
  return request.get<ApiResponse<PagedResult<DeviceRecord>>>('/admin/devices', { params })
}

export const getSessions = (params: {
  projectId: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  sessionId?: string
  userId?: string
  deviceId?: string
}) => {
  return request.get<ApiResponse<PagedResult<SessionRecord>>>('/admin/sessions', { params })
}

export const getTrafficMetrics = (params: {
  projectId: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  metricType?: string
  userId?: string
  deviceId?: string
  sessionId?: string
}) => {
  return request.get<ApiResponse<PagedResult<TrafficMetricRecord>>>('/admin/traffic-metrics', { params })
}

export const getTrafficSummary = (params: {
  projectId: string
  from?: string
  to?: string
  granularity?: string
}) => {
  return request.get<ApiResponse<TrafficSummary>>('/admin/traffic-metrics/summary', { params })
}

export const getCounters = (params: { projectId: string }) => {
  return request.get<ApiResponse<CountersResponse>>('/admin/counters', { params })
}

export const getCounter = (key: string, params: { projectId: string }) => {
  return request.get<ApiResponse<CounterItem>>(`/admin/counters/${encodeURIComponent(key)}`, { params })
}

export const upsertCounter = (
  key: string,
  projectId: string,
  payload: CounterUpsertPayload,
) => {
  return request.put<ApiResponse<CounterItem>>(
    `/admin/counters/${encodeURIComponent(key)}`,
    payload,
    { params: { projectId } },
  )
}

export const setCounter = (
  key: string,
  params: { projectId: string; value: number; isPublic?: boolean },
) => {
  return upsertCounter(key, params.projectId, {
    value: params.value,
    isPublic: params.isPublic,
  })
}

export const deleteCounter = (key: string, params: { projectId: string }) => {
  return request.delete<ApiResponse<null>>(
    `/admin/counters/${encodeURIComponent(key)}`,
    { params },
  )
}

export const incrementCounter = (key: string, params: { projectId: string }) => {
  return request.post<ApiResponse<CounterItem>>(
    `/admin/counters/${encodeURIComponent(key)}/increment`,
    null,
    { params },
  )
}

export const rebuildCounter = (key: string, params: { projectId: string }) => {
  return request.post<ApiResponse<CounterItem>>(
    `/admin/counters/${encodeURIComponent(key)}/rebuild`,
    null,
    { params },
  )
}

export const getPublicCounters = (params: { projectId: string }) => {
  return request.get<ApiResponse<PublicCounterItem[]>>('/public/counters', { params })
}

export const getPublicCounter = (key: string, params: { projectId: string }) => {
  return request.get<ApiResponse<PublicCounterItem | null>>(
    `/public/counters/${encodeURIComponent(key)}`,
    { params },
  )
}

export const getProductFunnel = (params: {
  projectId: string
  from?: string
  to?: string
  steps: string
  groupBy?: string
  journeyKey?: string
}) => {
  return request.get<ApiResponse<FunnelResponse>>('/admin/analytics/funnel', { params })
}

export const getProductRetention = (params: {
  projectId: string
  from?: string
  to?: string
  cohortEvent: string
  returnEvent: string
  days?: string
}) => {
  return request.get<ApiResponse<RetentionResponse>>('/admin/analytics/retention', { params })
}

export const getPublicTrafficSummary = (params: {
  projectId: string
  from?: string
  to?: string
}) => {
  return request.get<ApiResponse<TrafficSummary>>('/public/traffic/summary', { params })
}

export const getTrafficTrends = (params: {
  projectId: string
  from?: string
  to?: string
  granularity?: TrafficGranularity
}) => {
  return request.get<ApiResponse<TrafficTrends>>('/admin/traffic-metrics/trends', { params })
}

export const getTopPages = (params: {
  projectId: string
  from?: string
  to?: string
  limit?: number
}) => {
  return request.get<ApiResponse<TrafficTopResponse<TopPageItem>>>('/admin/traffic-metrics/top-pages', { params })
}

export const getTopReferrers = (params: {
  projectId: string
  from?: string
  to?: string
  limit?: number
}) => {
  return request.get<ApiResponse<TrafficTopResponse<TopReferrerItem>>>('/admin/traffic-metrics/top-referrers', { params })
}
