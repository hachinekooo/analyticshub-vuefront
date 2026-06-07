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
  rangeStart: string
  rangeEnd: string
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
}

export type PrivacyRequestUpdatePayload = {
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

export const getPrivacyRequests = (params: PrivacyRequestListParams) => {
  return request.get<ApiResponse<PrivacyRequestsResponse>>('/admin/privacy/requests', { params })
}

export const getPrivacyRequestDetail = (projectId: string, requestId: string) => {
  return request.get<ApiResponse<PrivacyRequestDetail>>(`/admin/privacy/requests/${requestId}`, {
    params: { projectId },
  })
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
  return request.post<ApiResponse<{ requestId: string; status: string }>>(
    `/admin/privacy/requests/${requestId}/notify`,
    payload,
    { params: { projectId } },
  )
}
