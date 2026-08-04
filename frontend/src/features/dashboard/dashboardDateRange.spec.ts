import { describe, expect, it } from 'vitest'
import { dateRangeForDashboardPreset } from './dashboardDateRange'

describe('dateRangeForDashboardPreset', () => {
  const now = new Date(2026, 7, 4, 18, 30)

  it.each([
    ['24h', ['2026-08-04', '2026-08-04']],
    ['7d', ['2026-07-29', '2026-08-04']],
    ['30d', ['2026-07-06', '2026-08-04']],
    ['90d', ['2026-05-07', '2026-08-04']],
  ] as const)('converts %s to an inclusive calendar range', (preset, expected) => {
    expect(dateRangeForDashboardPreset(preset, now)).toEqual(expected)
  })

  it('leaves custom ranges to the user', () => {
    expect(dateRangeForDashboardPreset('custom', now)).toBeNull()
  })
})
