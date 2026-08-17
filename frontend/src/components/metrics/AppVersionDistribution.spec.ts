import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import AppVersionDistribution from './AppVersionDistribution.vue'
import { setLocale } from '@/i18n'
import type { AppVersionDistribution as AppVersionDistributionData } from '@/api/metrics'

const distribution = {
  projectId: 'app-prod',
  rangeStart: '2026-08-01T00:00:00Z',
  rangeEnd: '2026-08-17T00:00:00Z',
  measurement: 'latest_occurred_event_per_device' as const,
  activeDevices: 5,
  versionKnownDevices: 4,
  coverageRate: 0.8,
  items: [
    { appVersion: '1.1.6', buildNumber: '116', activeDevices: 3, share: 0.6, lastObservedAt: '2026-08-16T00:00:00Z' },
    { appVersion: 'unknown', buildNumber: 'unknown', activeDevices: 1, share: 0.2, lastObservedAt: '2026-08-15T00:00:00Z' },
  ],
}

const mountDistribution = (
  value: AppVersionDistributionData | null = distribution,
  failed = false,
) => mount(AppVersionDistribution, {
  props: { distribution: value, failed },
  global: {
    stubs: {
      ElTooltip: { template: '<div><slot /></div>' },
      ElIcon: { template: '<span><slot /></span>' },
      ElEmpty: { props: ['description'], template: '<div class="empty">{{ description }}</div>' },
      ElAlert: { props: ['title'], template: '<div class="alert">{{ title }}</div>' },
      InfoFilled: true,
    },
  },
})

describe('AppVersionDistribution', () => {
  beforeEach(() => setLocale('zh'))

  it('explains device-level coverage and renders known and unknown versions', () => {
    const wrapper = mountDistribution()

    expect(wrapper.text()).toContain('活跃设备 5 台，版本识别率 80%')
    expect(wrapper.text()).toContain('v1.1.6')
    expect(wrapper.text()).toContain('116')
    expect(wrapper.text()).toContain('未知版本')
    expect(wrapper.text()).toContain('60%')
  })

  it('shows a clear empty state when the range has no active devices', () => {
    const wrapper = mountDistribution({ ...distribution, activeDevices: 0, versionKnownDevices: 0, coverageRate: 0, items: [] })

    expect(wrapper.find('.empty').text()).toBe('所选时间范围内暂无活跃设备版本数据')
  })

  it('distinguishes a request failure from a valid empty range', () => {
    const wrapper = mountDistribution(null, true)

    expect(wrapper.find('.alert').text()).toBe('活跃版本加载失败，请稍后重试')
    expect(wrapper.find('.empty').exists()).toBe(false)
  })
})
