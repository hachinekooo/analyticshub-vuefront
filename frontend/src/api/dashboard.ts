import request from '@/utils/request'
import type { ApiResponse } from '@/api/admin'

export type DashboardWidgetLayout = {
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
}

export type DashboardWidgetDefinition = {
  id: string
  type: string
  layout: DashboardWidgetLayout
  config?: Record<string, unknown>
}

export type DashboardDefinition = {
  schemaVersion: 1 | 2
  defaultRange?: '24h' | '7d' | '30d' | '90d' | 'custom'
  widgets: DashboardWidgetDefinition[]
}

export type AdminDashboard = {
  projectId: string
  dashboardKey: string
  displayName: Record<string, string>
  description: string | null
  schemaVersion: number
  definition: DashboardDefinition
  revision: number
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type DashboardUpsertPayload = {
  displayName: Record<string, string>
  description?: string
  schemaVersion: 1 | 2
  definition: DashboardDefinition
  expectedRevision: number
  isDefault: boolean
  isActive: boolean
}

const basePath = (projectId: string) =>
  `/admin/projects/${encodeURIComponent(projectId)}/dashboards`

export const getProjectDashboards = (projectId: string) =>
  request.get<ApiResponse<AdminDashboard[]>>(basePath(projectId))

export const upsertProjectDashboard = (
  projectId: string,
  dashboardKey: string,
  payload: DashboardUpsertPayload,
) => request.put<ApiResponse<AdminDashboard>>(
  `${basePath(projectId)}/${encodeURIComponent(dashboardKey)}`,
  payload,
)
