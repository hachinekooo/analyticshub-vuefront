import request from '@/utils/request'

export const validateAdminToken = (adminToken: string) => {
  // Backend rejects query/body tokens; use header for admin token verification.
  return request.post('/api/v1/auth/admin-token/verify', null, {
    headers: {
      'X-Admin-Token': adminToken,
    }
  })
}
