import { describe, expect, it } from 'vitest'
import { getApiErrorMessage } from './apiError'

describe('getApiErrorMessage', () => {
  it('prefers the unified ApiResponse error message', () => {
    expect(getApiErrorMessage({
      response: { data: { error: { message: 'project unavailable' }, message: 'legacy' } },
    }, 'fallback')).toBe('project unavailable')
  })

  it('supports a compatible top-level message', () => {
    expect(getApiErrorMessage({
      response: { data: { message: 'authentication required' } },
    }, 'fallback')).toBe('authentication required')
  })

  it('uses the supplied fallback for unknown errors', () => {
    expect(getApiErrorMessage(new Error('local detail'), 'request failed')).toBe('request failed')
  })
})
