import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import GovernedMetricWidget from './GovernedMetricWidget.vue'
import { getAnalyticsMetricResult } from '@/api/semantic'
import { setLocale } from '@/i18n'

vi.mock('@/api/semantic', async importOriginal => {
  const actual = await importOriginal<typeof import('@/api/semantic')>()
  return { ...actual, getAnalyticsMetricResult: vi.fn() }
})

const response = (metricType: string, result: Record<string, unknown>) => ({
  data: {
    data: {
      projectId: 'demo', metricKey: 'demo.metric', metricType,
      from: '2026-08-01T00:00:00Z', to: '2026-08-31T23:59:59Z',
      resultClassification: 'TRUSTED_SCHEMA', diagnosticReason: null, result,
    },
  },
})

const mountWidget = () => mount(GovernedMetricWidget, {
  props: {
    projectId: 'demo', metricKey: 'demo.metric', dateRange: null, refreshToken: 0,
    definition: {
      projectId: 'demo', metricKey: 'demo.metric', metricType: 'PROPERTY_BREAKDOWN',
      displayName: { 'zh-CN': '操作偏好' }, definition: {}, description: '直接回答用户更喜欢哪种操作',
      active: true, createdAt: '', updatedAt: '',
    },
    semanticDefinitions: [{
      projectId: 'demo', sourceKind: 'EVENT_TYPE', semanticKey: 'purchase_succeeded', origin: 'CUSTOM',
      displayName: { 'zh-CN': '完成购买' }, category: 'purchase', description: null,
      isActive: true, aliases: ['purchase_succeeded'], createdAt: '', updatedAt: '',
    }],
  },
  global: {
    directives: {
      loading: {
        mounted: (element, binding) => { element.dataset.loading = String(binding.value) },
        updated: (element, binding) => { element.dataset.loading = String(binding.value) },
      },
    },
    stubs: {
      ElTag: { template: '<span><slot /></span>' },
      ElAlert: true,
      ElEmpty: true,
      ElProgress: { props: ['percentage'], template: '<i :data-percentage="percentage" />' },
    },
  },
})

describe('GovernedMetricWidget', () => {
  beforeEach(() => {
    setLocale('zh')
    vi.mocked(getAnalyticsMetricResult).mockReset()
  })
  afterEach(() => vi.restoreAllMocks())

  it('presents business labels and shares for a property breakdown', async () => {
    vi.mocked(getAnalyticsMetricResult).mockResolvedValue(response('PROPERTY_BREAKDOWN', {
      rows: [{ value: 'skip', displayName: { 'zh-CN': '直接跳过' }, missing: false, measure: 3, share: 0.75 }],
    }) as never)

    const wrapper = mountWidget()
    await flushPromises()

    expect(wrapper.text()).toContain('操作偏好')
    expect(wrapper.text()).toContain('直接跳过')
    expect(wrapper.text()).toContain('75%')
    expect(wrapper.get('[data-percentage="75"]').attributes('data-percentage')).toBe('75')
  })

  it('renders governed funnel steps instead of falling back to an arbitrary number', async () => {
    vi.mocked(getAnalyticsMetricResult).mockResolvedValue(response('FUNNEL_CONVERSION', {
      groups: [{
        groupValue: 'all',
        steps: [
          { stepIndex: 1, eventType: 'paywall_presented', users: 10, conversionRate: 1, dropOffRate: 0 },
          { stepIndex: 2, eventType: 'purchase_succeeded', users: 3, conversionRate: 0.3, dropOffRate: 0.7 },
        ],
      }],
    }) as never)

    const wrapper = mountWidget()
    await flushPromises()

    expect(wrapper.text()).toContain('全部用户')
    expect(wrapper.text()).toContain('完成购买')
    expect(wrapper.text()).not.toContain('purchase_succeeded')
    expect(wrapper.text()).toContain('30%')
  })

  it('clears stale results and loading when the widget becomes invalid during a request', async () => {
    let resolveRequest: ((value: ReturnType<typeof response>) => void) | undefined
    vi.mocked(getAnalyticsMetricResult).mockImplementation(() => new Promise(resolve => {
      resolveRequest = resolve as typeof resolveRequest
    }) as never)
    const wrapper = mountWidget()
    await wrapper.setProps({ metricKey: '' })
    await flushPromises()

    expect(wrapper.find('.scalar-result').exists()).toBe(false)
    expect(wrapper.attributes('data-loading')).toBe('false')

    resolveRequest?.(response('EVENT_COUNT', { occurrences: 99 }))
    await flushPromises()
    expect(wrapper.text()).not.toContain('99')
  })

  it('renders retention buckets with cohort and eligible counts', async () => {
    vi.mocked(getAnalyticsMetricResult).mockResolvedValue(response('RETENTION', {
      cohortUsers: 8,
      buckets: [{ day: 7, eligibleUsers: 6, retainedUsers: 3, retentionRate: 0.5 }],
    }) as never)

    const wrapper = mountWidget()
    await flushPromises()

    expect(wrapper.text()).toContain('同期用户数')
    expect(wrapper.text()).toContain('D7')
    expect(wrapper.text()).toContain('50%')
    expect(wrapper.text()).toContain('3 / 6')
  })
})
