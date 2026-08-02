import request from '@/utils/request'

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: {
    code?: string
    message?: string
  }
  timestamp?: string
}

export type ProjectTableKey =
  | 'devices'
  | 'events'
  | 'sessions'
  | 'traffic_metrics'
  | 'counters'
  | 'privacy_requests'
  | 'idempotency_keys'
  | 'work_order_activities'
  | 'work_order_outbox'

export interface ProjectHealth {
  connected: boolean
  tables: Partial<Record<ProjectTableKey, boolean>>
  allTablesExist: boolean
  schemaCurrent: boolean
  migrationHistoryValid: boolean
  schemaVersion?: string | null
  pendingMigrations: number
  historyTable?: string | null
  errorCode?: string | null
  error?: string | null
}

export interface ProjectInitResult {
  message: string
  tables: string[]
  schemaVersion: string | null
  migrationsExecuted: number
  historyTable: string
  legacyBaselineApplied: boolean
}

export interface Project {
  id: number
  projectId: string
  projectName: string
  analysisTemplate: ProjectAnalysisTemplate
  dbHost: string
  dbPort: number
  dbName: string
  dbSchema: string
  dbUser: string
  dbPassword?: string
  tablePrefix: string
  isActive: boolean

  health?: ProjectHealth | null
  healthLoading?: boolean
}

export type ProjectAnalysisTemplate = 'app' | 'website' | 'webapp' | 'blank'

type ProjectPayload = {
  projectId?: string
  projectName?: string
  analysisTemplate?: ProjectAnalysisTemplate
  dbHost?: string
  dbPort?: number
  dbName?: string
  dbSchema?: string
  dbUser?: string
  dbPassword?: string
  tablePrefix?: string
  isActive?: boolean
}

const buildProjectPayload = (data: Partial<Project>): ProjectPayload => {
  const payload: ProjectPayload = {
    projectId: data.projectId,
    projectName: data.projectName,
    analysisTemplate: data.analysisTemplate,
    dbHost: data.dbHost,
    dbPort: data.dbPort,
    dbName: data.dbName,
    dbSchema: data.dbSchema,
    dbUser: data.dbUser,
    tablePrefix: data.tablePrefix,
    isActive: data.isActive,
  }

  if (data.dbPassword) {
    payload.dbPassword = data.dbPassword
  }

  return payload
}

// Admin endpoints are protected by X-Admin-Token (added in the request interceptor).
export const getProjects = () => {
  return request.get<ApiResponse<Project[]>>('/admin/projects')
}

export const createProject = (data: Partial<Project>) => {
  return request.post<ApiResponse<Project>>('/admin/projects', buildProjectPayload(data))
}

export const updateProject = (id: number, data: Partial<Project>) => {
  return request.put<ApiResponse<Project>>(`/admin/projects/${id}`, buildProjectPayload(data))
}

export const deleteProject = (id: number) => {
  return request.delete<ApiResponse<null>>(`/admin/projects/${id}`)
}

export const checkProjectHealth = (id: number) => {
  return request.get<ApiResponse<ProjectHealth>>(`/admin/projects/${id}/health`)
}

export const initProjectDatabase = (id: number) => {
  return request.post<ApiResponse<ProjectInitResult>>(`/admin/projects/${id}/init`)
}
