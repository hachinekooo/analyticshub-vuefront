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
    traffic_metrics: boolean
  }
  allTablesExist: boolean
}

export interface Project {
  id: string
  project_id: string
  project_name: string
  db_host: string
  db_port: number
  db_name: string
  db_user: string
  db_password?: string
  table_prefix: string
  is_active: boolean
  
  health?: ProjectHealth | null
  healthLoading?: boolean
}

// Admin endpoints are protected by X-Admin-Token (added in the request interceptor).
export const getProjects = () => {
  return request.get<ApiResponse<Project[]>>('/api/admin/projects')
}

export const createProject = (data: Partial<Project>) => {
  return request.post<ApiResponse<Project>>('/api/admin/projects', data)
}

export const updateProject = (id: string, data: Partial<Project>) => {
  return request.put<ApiResponse<Project>>(`/api/admin/projects/${id}`, data)
}

export const deleteProject = (id: string) => {
  return request.delete<ApiResponse<null>>(`/api/admin/projects/${id}`)
}

export const checkProjectHealth = (id: string) => {
  return request.get<ApiResponse<ProjectHealth>>(`/api/admin/projects/${id}/health`)
}

export const initProjectDatabase = (id: string) => {
  return request.post<ApiResponse<null>>(`/api/admin/projects/${id}/init`)
}
