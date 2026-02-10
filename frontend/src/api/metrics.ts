import request from '@/utils/request'
import type { ApiResponse } from '@/api/admin'

export type MetricsOverview = {
  projectId: string
  rangeStart: string
  rangeEnd: string
  devicesTotal: number
  devicesActive: number
  usersActive: number
  sessionsTotal: number
  eventsTotal: number
  avgSessionDurationMs: number
  avgEventsPerSession: number
}

export type TrendPoint = {
  time: string
  events: number
  sessions: number
}

export type MetricsTrends = {
  projectId: string
  granularity: 'day' | 'hour'
  rangeStart: string
  rangeEnd: string
  points: TrendPoint[]
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
  sessionId: string | null
  properties: Record<string, unknown> | null
}

export type DeviceRecord = {
  deviceId: string
  apiKey: string
  deviceModel: string
  osVersion: string
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
  isPublic: boolean
  updatedAt: string
}

export type TrafficTrendPoint = {
  time: string
  pageViews: number
  visitors: number
}

export type TrafficTrends = {
  projectId: string
  granularity: 'day' | 'hour'
  rangeStart: string
  rangeEnd: string
  points: TrafficTrendPoint[]
}

export type TopPageItem = {
  pagePath: string
  count: number
}

export type TopReferrerItem = {
  referrer: string
  count: number
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
  granularity?: 'day' | 'hour'
}) => {
  return request.get<ApiResponse<MetricsTrends>>('/admin/metrics/trends', { params })
}

export const getTopEvents = (params: {
  projectId: string
  from?: string
  to?: string
  limit?: number
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
  deviceId?: string
}) => {
  return request.get<ApiResponse<PagedResult<EventRecord>>>('/admin/events', { params })
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
  return request.get<ApiResponse<PagedResult<CounterItem>>>('/admin/counters', { params })
}

export const getCounter = (key: string, params: { projectId: string }) => {
  return request.get<ApiResponse<CounterItem>>(`/admin/counters/${key}`, { params })
}

export const setCounter = (
  key: string,
  params: { projectId: string; value: number; isPublic?: boolean }
) => {
  const body = { value: params.value, isPublic: params.isPublic }
  return request.put<ApiResponse<CounterItem>>(`/admin/counters/${key}`, body, { params: { projectId: params.projectId } })
}

export const incrementCounter = (key: string, params: { projectId: string }) => {
  return request.post<ApiResponse<CounterItem>>(`/admin/counters/${key}/increment`, null, { params })
}

export const getPublicCounters = (params: { projectId: string }) => {
  return request.get<ApiResponse<CounterItem[]>>('/public/counters', { params })
}

export const getPublicCounter = (key: string, params: { projectId: string }) => {
  return request.get<ApiResponse<CounterItem>>(`/public/counters/${key}`, { params })
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
  granularity?: 'day' | 'hour'
}) => {
  return request.get<ApiResponse<TrafficTrends>>('/admin/traffic-metrics/trends', { params })
}

export const getTopPages = (params: {
  projectId: string
  from?: string
  to?: string
  limit?: number
}) => {
  return request.get<ApiResponse<TopPageItem[]>>('/admin/traffic-metrics/top-pages', { params })
}

export const getTopReferrers = (params: {
  projectId: string
  from?: string
  to?: string
  limit?: number
}) => {
  return request.get<ApiResponse<TopReferrerItem[]>>('/admin/traffic-metrics/top-referrers', { params })
}
