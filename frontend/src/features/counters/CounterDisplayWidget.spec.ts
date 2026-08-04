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
          items: [{
            key: 'letters_completed',
            value: 1370,
            displayName: { 'zh-CN': '累计完成信件' },
            unit: { 'zh-CN': '封' },
          }],
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
        stubs: { ElEmpty: true },
      },
    })
    await flushPromises()

    expect(wrapper.text()).toContain('累计完成信件')
    expect(wrapper.text()).toContain('1370')
    expect(wrapper.text()).toContain('封')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('新建累计统计')
  })
})
