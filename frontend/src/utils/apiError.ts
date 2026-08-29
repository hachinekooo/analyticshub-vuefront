export type ApiErrorPayload = {
  error?: { code?: string; message?: string; details?: unknown }
  message?: string
}

export const getApiErrorCode = (error: unknown): string | undefined => {
  const candidate = error as { response?: { data?: ApiErrorPayload } }
  return candidate.response?.data?.error?.code
}

export const getApiErrorDetails = <T>(error: unknown): T | undefined => {
  const candidate = error as { response?: { data?: ApiErrorPayload } }
  return candidate.response?.data?.error?.details as T | undefined
}

/**
 * 从统一 ApiResponse 或兼容的顶层 message 中提取可展示错误。
 * 不记录完整响应，避免认证、工单等接口的上下文进入浏览器 Console。
 */
export const getApiErrorMessage = (
  error: unknown,
  fallback: string,
  codeMessages: Readonly<Record<string, string>> = {},
): string => {
  const candidate = error as { response?: { data?: ApiErrorPayload } }
  const apiError = candidate.response?.data?.error
  return (apiError?.code ? codeMessages[apiError.code] : undefined)
    || apiError?.message
    || candidate.response?.data?.message
    || fallback
}
