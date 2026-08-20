import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ElButton, ElIcon, ElPopover } from 'element-plus'
import EventLegendPopover from './EventLegendPopover.vue'
import SemanticEventLabel from './SemanticEventLabel.vue'
import { setLocale } from '@/i18n'

describe('EventLegendPopover', () => {
  beforeEach(() => setLocale('zh'))
  afterEach(() => { document.body.innerHTML = '' })

  it('deduplicates the current page and keeps row-level help icons out of the guide', async () => {
    const wrapper = mount(EventLegendPopover, {
      attachTo: document.body,
      props: {
        events: [
          { eventKey: 'letter_saved', displayName: { 'zh-CN': '信件已保存' }, description: '完成信件保存。' },
          { eventKey: 'letter_saved', displayName: { 'zh-CN': '信件已保存' }, description: '完成信件保存。' },
          { eventKey: 'paywall_opened', displayName: { 'zh-CN': '付费墙打开' }, description: '用户看到付费方案。' },
        ],
      },
      global: {
        components: {
          ElPopover,
          ElButton,
          ElIcon,
        },
      },
    })

    expect(wrapper.text()).toContain('本页事件说明')
    await wrapper.find('button').trigger('click')
    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(document.body.querySelectorAll('.event-legend-item')).toHaveLength(2)
    expect(document.body.textContent).toContain('letter_saved')
    expect(document.body.textContent).toContain('paywall_opened')
    expect(wrapper.findAllComponents(SemanticEventLabel).every(
      label => label.props('showHelp') === false,
    )).toBe(true)
    wrapper.unmount()
  })
})
