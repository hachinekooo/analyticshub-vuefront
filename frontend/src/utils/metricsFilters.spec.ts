import { describe, expect, it } from 'vitest'
import { trafficMetricTypeForPlatform } from './metricsFilters'

describe('trafficMetricTypeForPlatform', () => {
  it('restores the Website PV filter after switching through App', () => {
    expect(trafficMetricTypeForPlatform('web')).toBe('page_view')
    expect(trafficMetricTypeForPlatform('app')).toBe('screen_view')
    expect(trafficMetricTypeForPlatform('web')).toBe('page_view')
  })
})
