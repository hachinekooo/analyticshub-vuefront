import { describe, expect, it } from 'vitest'
import { isFinalPrivacyStatus, privacyPrimaryAction } from './privacyWorkflow'

describe('privacy workflow', () => {
  it('requires a submitted ticket to be started before data execution', () => {
    expect(privacyPrimaryAction({
      status: 'SUBMITTED',
      processor: 'ANALYTICSHUB',
      requestType: 'DELETE',
    })).toBe('START')
  })

  it('exposes the correct data action for an in-progress internal ticket', () => {
    expect(privacyPrimaryAction({
      status: 'IN_PROGRESS',
      processor: 'ANALYTICSHUB',
      requestType: 'DELETE',
    })).toBe('ANONYMIZE')
    expect(privacyPrimaryAction({
      status: 'IN_PROGRESS',
      processor: 'ANALYTICSHUB',
      requestType: 'EXPORT',
    })).toBe('EXPORT')
  })

  it('keeps external processors extensible without exposing internal execution', () => {
    expect(privacyPrimaryAction({
      status: 'IN_PROGRESS',
      processor: 'POSTHOG',
      requestType: 'DELETE',
    })).toBe('COMPLETE')
  })

  it('treats every closed status as final', () => {
    expect(isFinalPrivacyStatus('COMPLETED')).toBe(true)
    expect(isFinalPrivacyStatus('REJECTED')).toBe(true)
    expect(isFinalPrivacyStatus('CANCELLED')).toBe(true)
    expect(isFinalPrivacyStatus('IN_PROGRESS')).toBe(false)
  })
})
