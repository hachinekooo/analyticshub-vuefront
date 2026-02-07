import request from '@/utils/request'

/**
 * 验证管理员Token
 * 
 * 安全说明：
 * - Token必须通过请求头传递，避免在URL或请求体中暴露
 * - 后端服务只接受 X-Admin-Token 头部的Token验证
 * - 此接口用于登录时的Token有效性验证
 * 
 * @param adminToken - 管理员Token字符串
 * @returns Promise包含验证结果
 */
export const validateAdminToken = (adminToken: string) => {
  // Backend rejects query/body tokens; use header for admin token verification.
  return request.post('/v1/auth/admin-token/verify', null, {
    headers: {
      'X-Admin-Token': adminToken,
    }
  })
}
