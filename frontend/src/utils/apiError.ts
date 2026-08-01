export type ApiErrorPayload = {
  error?: { message?: string }
  message?: string
}

/**
 * 从统一 ApiResponse 或兼容的顶层 message 中提取可展示错误。
 * 不记录完整响应，避免认证、工单等接口的上下文进入浏览器 Console。
 */
export const getApiErrorMessage = (error: unknown, fallback: string): string => {
  const candidate = error as { response?: { data?: ApiErrorPayload } }
  return candidate.response?.data?.error?.message
    || candidate.response?.data?.message
    || fallback
}
