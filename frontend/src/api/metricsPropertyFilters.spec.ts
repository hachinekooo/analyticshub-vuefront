import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from '@/utils/request'
import {
  getAppVersionDistribution,
  getMetricsOverview,
  getMetricsTrends,
  getProductFunnel,
  getProductRetention,
  getTopEvents,
} from './metrics'
import { ANALYTICS_QUERY_TIMEOUT_MS } from './analyticsQueryPolicy'

vi.mock('@/utils/request', () => ({
  default: { get: vi.fn() },
}))

describe('analytics property-filter API contract', () => {
  beforeEach(() => vi.mocked(request.get).mockReset())

  it('forwards one serialized filter contract to every supported analysis endpoint', () => {
    const propertyFilters = '[{"propertyKey":"schema_version","operator":"EQ","values":["3"]}]'
    const base = { projectId: 'sample', from: '2026-08-01T00:00:00Z', to: '2026-08-02T00:00:00Z', propertyFilters }

    getMetricsOverview(base)
    getMetricsTrends({ ...base, granularity: 'day' })
    getAppVersionDistribution(base)
    getTopEvents({ ...base, aggregation: 'semantic' })
    getProductFunnel({ ...base, steps: 'start,complete' })
    getProductRetention({ ...base, cohortEvent: 'start', returnEvent: 'return', days: '1,7' })

    expect(vi.mocked(request.get).mock.calls).toEqual([
      ['/admin/metrics/overview', { params: base, timeout: ANALYTICS_QUERY_TIMEOUT_MS }],
      ['/admin/metrics/trends', { params: { ...base, granularity: 'day' }, timeout: ANALYTICS_QUERY_TIMEOUT_MS }],
      ['/admin/metrics/app-versions', { params: base, timeout: ANALYTICS_QUERY_TIMEOUT_MS }],
      ['/admin/metrics/top-events', { params: { ...base, aggregation: 'semantic' }, timeout: ANALYTICS_QUERY_TIMEOUT_MS }],
      ['/admin/analytics/funnel', { params: { ...base, steps: 'start,complete' }, timeout: ANALYTICS_QUERY_TIMEOUT_MS }],
      ['/admin/analytics/retention', { params: { ...base, cohortEvent: 'start', returnEvent: 'return', days: '1,7' }, timeout: ANALYTICS_QUERY_TIMEOUT_MS }],
    ])
  })
})
