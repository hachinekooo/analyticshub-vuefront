import type { PrivacyRequestItem, PrivacyRequestStatus } from '@/api/privacy'

export type PrivacyPrimaryAction = 'START' | 'ANONYMIZE' | 'EXPORT' | 'COMPLETE' | 'FINISHED'

export const isFinalPrivacyStatus = (status: PrivacyRequestStatus) =>
  status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELLED'

export const privacyPrimaryAction = (
  request: Pick<PrivacyRequestItem, 'status' | 'processor' | 'requestType'>,
): PrivacyPrimaryAction => {
  if (request.status === 'SUBMITTED') return 'START'
  if (request.status !== 'IN_PROGRESS') return 'FINISHED'
  if (request.processor !== 'ANALYTICSHUB') return 'COMPLETE'
  return request.requestType === 'DELETE' ? 'ANONYMIZE' : 'EXPORT'
}

