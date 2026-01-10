import request from '@/utils/request'

export interface ProjectHealth {
  connected: boolean;
  tables: {
    devices: boolean;
    events: boolean;
    sessions: boolean;
    traffic_metrics: boolean;
  };
  allTablesExist: boolean;
}

export interface Project {
  id: string; // Internal UUID usually, but here likely the DB ID or similar. 
  // User provided guide says: project_id (unique string), project_name, etc.
  // Let's match the interface to what the API actually returns based on the user's HTML example.
  project_id: string;
  project_name: string;
  db_host: string;
  db_port: number;
  db_name: string;
  db_user: string;
  db_password?: string; // Optional in response?
  table_prefix: string;
  is_active: boolean;
  
  // UI helper props
  health?: ProjectHealth | null;
  healthLoading?: boolean;
}

export const getProjects = () => {
  return request({
    url: '/api/admin/projects',
    method: 'get'
  })
}

export const createProject = (data: any) => {
  return request({
    url: '/api/admin/projects',
    method: 'post',
    data
  })
}

export const updateProject = (id: string, data: any) => {
  return request({
    url: `/api/admin/projects/${id}`,
    method: 'put',
    data
  })
}

export const deleteProject = (id: string) => {
  return request({
    url: `/api/admin/projects/${id}`,
    method: 'delete'
  })
}

export const checkProjectHealth = (id: string) => {
  return request({
    url: `/api/admin/projects/${id}/health`,
    method: 'get'
  })
}

export const initProjectDatabase = (id: string) => {
  return request({
    url: `/api/admin/projects/${id}/init`,
    method: 'post'
  })
}
