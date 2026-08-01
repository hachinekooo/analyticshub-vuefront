import { describe, expect, it } from 'vitest'
import { isTwoFactorRequired } from './twoFactor'

describe('isTwoFactorRequired', () => {
  it.each([
    [{ code: 'REQUIRE_2FA' }],
    [{ error: { code: 'REQUIRE_2FA' } }],
    [{ message: 'Please enter your OTP' }],
    [{ error: { message: '需要双因素验证' } }],
  ])('accepts the supported backend error shapes', (payload) => {
    expect(isTwoFactorRequired(403, payload)).toBe(true)
  })

  it('does not trigger a security prompt from message text on other status codes', () => {
    expect(isTwoFactorRequired(401, { message: 'OTP required' })).toBe(false)
    expect(isTwoFactorRequired(500, { code: 'REQUIRE_2FA' })).toBe(false)
  })

  it('fails closed for missing and unrelated payloads', () => {
    expect(isTwoFactorRequired(403, undefined)).toBe(false)
    expect(isTwoFactorRequired(403, { message: 'Permission denied' })).toBe(false)
    expect(isTwoFactorRequired(403, { message: 'Hotpot access denied' })).toBe(false)
  })
})
