export type TwoFactorErrorPayload = {
  code?: string
  error?: { code?: string; message?: string }
  message?: string
}

const twoFactorCode = 'REQUIRE_2FA'
const twoFactorMessagePattern = /(?:\b(?:2fa|otp)\b|验证码|双因素)/i

/**
 * Classifies only the backend's explicit 403 two-factor challenge shapes.
 * Keeping this pure prevents unrelated response handling from accidentally
 * opening a security prompt and makes backend contract changes testable.
 */
export const isTwoFactorRequired = (
  status: number | undefined,
  payload: TwoFactorErrorPayload | undefined,
) => status === 403 && (
  payload?.code === twoFactorCode
  || payload?.error?.code === twoFactorCode
  || twoFactorMessagePattern.test(payload?.message ?? '')
  || twoFactorMessagePattern.test(payload?.error?.message ?? '')
)
