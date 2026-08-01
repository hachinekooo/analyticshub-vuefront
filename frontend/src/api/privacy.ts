import request from '@/utils/request'
import type { ApiResponse } from '@/api/admin'

export type PrivacyRequestStatus =
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'

export type PrivacyRequestType = 'EXPORT' | 'DELETE'
export type PrivacyProcessor = 'ANALYTICSHUB' | 'POSTHOG'

export type PrivacyRequestItem = {
  requestId: string
  userId: string
  deviceId: string
  requestType: PrivacyRequestType
  processor: PrivacyProcessor
  status: PrivacyRequestStatus
  contactEmail: string
  requestedAt: string
  processedAt: string | null
  closedAt: string | null
  operator: string | null
  version: number
}

export type PrivacyRequestDetail = PrivacyRequestItem & {
  projectId: string
  source: string
  requesterNote: string | null
  operatorNote: string | null
  resultPayload: Record<string, unknown> | null
  metadata: Record<string, unknown> | null
  updatedAt: string | null
}

export type PrivacyRequestsResponse = {
  projectId: string
  rangeStart: string | null
  rangeEnd: string | null
  page: number
  pageSize: number
  total: number
  items: PrivacyRequestItem[]
}

export type PrivacyRequestListParams = {
  projectId: string
  from?: string
  to?: string
  page?: number
  pageSize?: number
  status?: PrivacyRequestStatus
  requestType?: PrivacyRequestType
  processor?: PrivacyProcessor
  userId?: string
  openOnly?: boolean
}

export type PrivacyRequestUpdatePayload = {
  version: number
  status: PrivacyRequestStatus
  operator?: string
  operatorNote?: string
  resultPayload?: Record<string, unknown>
  notifyUser?: boolean
  notificationMessage?: string
}

export type PrivacyRequestNotifyPayload = {
  subject: string
  message: string
  operator?: string
}

export type PrivacyExecutionPayload = {
  version: number
  operator: string
  confirmation?: string
}

export type PrivacyExecutionResponse = {
  requestId: string
  requestType: PrivacyRequestType
  status: 'COMPLETED'
  executedAt: string
  version: number
  downloadFileName: string | null
  summary: Record<string, unknown>
  exportData: Record<string, unknown> | null
}

export type WorkOrderActivity = {
  activityId: string
  activityType: string
  fromStatus: string | null
  toStatus: string | null
  actor: string | null
  details: Record<string, unknown> | null
  createdAt: string
}

export type WorkOrderNotificationQueued = {
  requestId: string
  notificationId: string
  status: 'QUEUED'
}

export const getPrivacyRequests = (params: PrivacyRequestListParams) => {
  return request.get<ApiResponse<PrivacyRequestsResponse>>('/admin/privacy/requests', { params })
}

export const getPrivacyRequestDetail = (projectId: string, requestId: string) => {
  return request.get<ApiResponse<PrivacyRequestDetail>>(`/admin/privacy/requests/${requestId}`, {
    params: { projectId },
  })
}

export const getPrivacyRequestActivities = (projectId: string, requestId: string) => {
  return request.get<ApiResponse<WorkOrderActivity[]>>(
    `/admin/privacy/requests/${requestId}/activities`,
    { params: { projectId } },
  )
}

export const updatePrivacyRequest = (
  projectId: string,
  requestId: string,
  payload: PrivacyRequestUpdatePayload,
) => {
  return request.patch<ApiResponse<PrivacyRequestDetail>>(
    `/admin/privacy/requests/${requestId}`,
    payload,
    { params: { projectId } },
  )
}

export const notifyPrivacyRequestUser = (
  projectId: string,
  requestId: string,
  payload: PrivacyRequestNotifyPayload,
) => {
  return request.post<ApiResponse<WorkOrderNotificationQueued>>(
    `/admin/privacy/requests/${requestId}/notify`,
    payload,
    { params: { projectId } },
  )
}

export const executePrivacyRequest = (
  projectId: string,
  requestId: string,
  payload: PrivacyExecutionPayload,
) => {
  return request.post<ApiResponse<PrivacyExecutionResponse>>(
    `/admin/privacy/requests/${requestId}/execute`,
    payload,
    { params: { projectId } },
  )
}
