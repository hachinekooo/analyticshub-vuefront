import { beforeEach, describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import SemanticEventLabel from './SemanticEventLabel.vue'
import { setLocale } from '@/i18n'

describe('SemanticEventLabel', () => {
  beforeEach(() => setLocale('zh'))

  it('shows the localized business name and keeps the semantic key in progressive help', () => {
    const wrapper = shallowMount(SemanticEventLabel, {
      props: {
        eventKey: 'core.activation.completed',
        displayName: { 'zh-CN': '首次启动完成', en: 'Activation completed' },
        description: '用户完成产品定义的首次关键激活动作。',
        knownBusinessName: true,
      },
    })

    expect(wrapper.text()).toContain('首次启动完成')
    expect(wrapper.text()).not.toContain('core.activation.completed')
    expect(wrapper.findComponent({ name: 'MetricHelpIcon' }).props('content'))
      .toContain('首次关键激活动作')
    expect(wrapper.findComponent({ name: 'MetricHelpIcon' }).props('content'))
      .toContain('core.activation.completed')
  })

  it('turns an unmapped raw key into readable text and explains how to improve it', () => {
    const wrapper = shallowMount(SemanticEventLabel, {
      props: {
        eventKey: 'template_applied',
        knownBusinessName: false,
      },
    })

    expect(wrapper.text()).toContain('template applied')
    expect(wrapper.findComponent({ name: 'MetricHelpIcon' }).props('content'))
      .toContain('尚未配置业务名称')
  })

  it('can render a clean table label without repeating the help control', () => {
    const wrapper = shallowMount(SemanticEventLabel, {
      props: {
        eventKey: 'content_saved',
        displayName: { 'zh-CN': '内容已保存' },
        showHelp: false,
      },
    })

    expect(wrapper.text()).toContain('内容已保存')
    expect(wrapper.findComponent({ name: 'MetricHelpIcon' }).exists()).toBe(false)
  })
})
