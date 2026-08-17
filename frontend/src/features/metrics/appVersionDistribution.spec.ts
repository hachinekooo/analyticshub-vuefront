import { describe, expect, it } from 'vitest'
import { findTopActiveAppVersion } from './appVersionDistribution'

describe('findTopActiveAppVersion', () => {
  it('combines builds before selecting the leading public App version', () => {
    const result = findTopActiveAppVersion([
      { appVersion: '1.1.6', buildNumber: '116', activeDevices: 3, share: 0.3, lastObservedAt: '2026-08-15T00:00:00Z' },
      { appVersion: '1.1.6', buildNumber: '117', activeDevices: 3, share: 0.3, lastObservedAt: '2026-08-16T00:00:00Z' },
      { appVersion: '1.1.5', buildNumber: '115', activeDevices: 5, share: 0.5, lastObservedAt: '2026-08-17T00:00:00Z' },
      { appVersion: 'unknown', buildNumber: 'unknown', activeDevices: 20, share: 0.2, lastObservedAt: '2026-08-17T00:00:00Z' },
    ])

    expect(result).toEqual({
      appVersion: '1.1.6',
      activeDevices: 6,
      lastObservedAt: '2026-08-16T00:00:00Z',
    })
  })

  it('returns no leading version when all active devices have unknown version metadata', () => {
    expect(findTopActiveAppVersion([
      { appVersion: 'unknown', buildNumber: 'unknown', activeDevices: 2, share: 1, lastObservedAt: '2026-08-17T00:00:00Z' },
    ])).toBeNull()
  })
})
