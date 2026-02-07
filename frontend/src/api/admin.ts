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

export interface ProjectHealth {
  connected: boolean
  tables: {
    devices: boolean
    events: boolean
    sessions: boolean
    trafficMetrics: boolean
  }
  allTablesExist: boolean
}

export interface Project {
  id: string
  projectId: string
  projectName: string
  dbHost: string
  dbPort: number
  dbName: string
  dbUser: string
  dbPassword?: string
  tablePrefix: string
  isActive: boolean

  health?: ProjectHealth | null
  healthLoading?: boolean
}

type ProjectPayload = {
  projectId?: string
  projectName?: string
  dbHost?: string
  dbPort?: number
  dbName?: string
  dbUser?: string
  dbPassword?: string
  tablePrefix?: string
  isActive?: boolean
}

const buildProjectPayload = (data: Partial<Project>): ProjectPayload => {
  const payload: ProjectPayload = {
    projectId: data.projectId,
    projectName: data.projectName,
    dbHost: data.dbHost,
    dbPort: data.dbPort,
    dbName: data.dbName,
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

export const updateProject = (id: string, data: Partial<Project>) => {
  return request.put<ApiResponse<Project>>(`/admin/projects/${id}`, buildProjectPayload(data))
}

export const deleteProject = (id: string) => {
  return request.delete<ApiResponse<null>>(`/admin/projects/${id}`)
}

export const checkProjectHealth = (id: string) => {
  return request.get<ApiResponse<ProjectHealth>>(`/admin/projects/${id}/health`)
}

export const initProjectDatabase = (id: string) => {
  return request.post<ApiResponse<null>>(`/admin/projects/${id}/init`)
}
