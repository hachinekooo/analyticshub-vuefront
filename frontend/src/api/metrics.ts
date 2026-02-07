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
