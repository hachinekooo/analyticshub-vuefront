import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import CounterDisplayWidget from './CounterDisplayWidget.vue'
import { setLocale } from '@/i18n'

const { getCounters } = vi.hoisted(() => ({ getCounters: vi.fn() }))

vi.mock('@/api/metrics', () => ({ getCounters }))

describe('CounterDisplayWidget', () => {
  beforeEach(() => {
    setLocale('zh')
    getCounters.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              key: 'letters_completed',
              value: 1370,
              displayName: { 'zh-CN': '累计完成信件' },
              unit: { 'zh-CN': '封' },
            },
            {
              key: 'shares_completed',
              value: 88,
              displayName: { 'zh-CN': '累计完成分享' },
              unit: { 'zh-CN': '次' },
            },
          ],
        },
      },
    })
  })

  it('renders counter values without management actions', async () => {
    const wrapper = mount(CounterDisplayWidget, {
      props: {
        projectId: 'demo_app',
        title: '累计统计',
        refreshToken: 0,
      },
      global: {
        directives: { loading: () => undefined },
        stubs: { ElEmpty: true, ElAlert: { props: ['title'], template: '<div>{{ title }}</div>' } },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('累计完成信件')
    expect(wrapper.text()).toContain('1370')
    expect(wrapper.text()).toContain('封')
    expect(wrapper.text()).toContain('截至当前累计值')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('新建累计统计')
  })

  it('uses the configured key order and reports stale dashboard references', async () => {
    const wrapper = mount(CounterDisplayWidget, {
      props: {
        projectId: 'demo_app',
        title: '累计统计',
        configuredKeys: ['shares_completed', 'missing_counter', 'letters_completed'],
        refreshToken: 0,
      },
      global: {
        directives: { loading: () => undefined },
        stubs: { ElEmpty: true, ElAlert: { props: ['title'], template: '<div>{{ title }}</div>' } },
      },
    })
    await flushPromises()

    const cards = wrapper.findAll('.counter-card')
    expect(cards.map(card => card.text())).toEqual([
      expect.stringContaining('累计完成分享'),
      expect.stringContaining('累计完成信件'),
    ])
    expect(wrapper.text()).toContain('missing_counter')
  })
})
