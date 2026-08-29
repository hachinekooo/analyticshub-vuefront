import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from '@/utils/request'
import { getAnalysisPacks, getAnalyticsMetricResult, getTrustedSchemaPolicy, upsertAnalyticsMetricDefinition } from './semantic'
import { ANALYTICS_QUERY_TIMEOUT_MS } from './analyticsQueryPolicy'

vi.mock('@/utils/request', () => ({
  default: { get: vi.fn(), put: vi.fn() },
}))

describe('analytics metric configuration API', () => {
  beforeEach(() => {
    vi.mocked(request.get).mockReset()
    vi.mocked(request.put).mockReset()
  })

  it('writes one governed metric through the project-scoped endpoint', () => {
    const payload = {
      displayName: { en: 'Completed actions' },
      metricType: 'EVENT_COUNT' as const,
      definition: { semanticEvent: 'product.completed' },
      description: 'Stable completion count',
      active: true,
    }

    upsertAnalyticsMetricDefinition('sample project', 'product.completed_count', payload)

    expect(request.put).toHaveBeenCalledWith(
      '/admin/projects/sample%20project/metrics/product.completed_count',
      payload,
    )
  })

  it('loads the project trusted schema policy without hard-coding a product version', () => {
    getTrustedSchemaPolicy('sample project')

    expect(request.get).toHaveBeenCalledWith(
      '/admin/projects/sample%20project/trusted-schema-policy',
    )
  })

  it('loads persisted analysis packs as the recovery source', () => {
    getAnalysisPacks('sample project')

    expect(request.get).toHaveBeenCalledWith(
      '/admin/projects/sample%20project/analysis-packs',
    )
  })

  it('keeps the client timeout above the backend interactive-query budget', () => {
    const params = { from: '2026-08-01T00:00:00Z', to: '2026-08-02T00:00:00Z' }

    getAnalyticsMetricResult('sample project', 'engagement.active_actors', params)

    expect(ANALYTICS_QUERY_TIMEOUT_MS).toBeGreaterThan(15_000)
    expect(request.get).toHaveBeenCalledWith(
      '/admin/projects/sample%20project/metric-results/engagement.active_actors',
      { params, timeout: ANALYTICS_QUERY_TIMEOUT_MS },
    )
  })
})
