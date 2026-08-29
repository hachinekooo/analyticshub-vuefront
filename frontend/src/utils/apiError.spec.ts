import { describe, expect, it } from 'vitest'
import { getApiErrorDetails, getApiErrorMessage } from './apiError'

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

  it('prefers a localized stable-code message when supplied', () => {
    expect(getApiErrorMessage({
      response: { data: { error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: '后端原始文案' } } },
    }, 'request failed', {
      INVALID_ANALYSIS_CONFIGURATION: 'Check the analysis definition and try again.',
    })).toBe('Check the analysis definition and try again.')
  })
})

describe('getApiErrorDetails', () => {
  it('returns structured recovery details without exposing them as the message', () => {
    const details = { removedMetricKeys: ['completed_count'] }
    expect(getApiErrorDetails({ response: { data: { error: { details } } } })).toEqual(details)
  })
})
