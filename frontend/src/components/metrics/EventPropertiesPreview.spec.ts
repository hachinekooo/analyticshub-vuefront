import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ElButton, ElCollapse, ElCollapseItem, ElIcon, ElPopover } from 'element-plus'
import EventPropertiesPreview from './EventPropertiesPreview.vue'
import { setLocale } from '@/i18n'

describe('EventPropertiesPreview', () => {
  beforeEach(() => setLocale('zh'))
  afterEach(() => { document.body.innerHTML = '' })

  it('keeps the row compact and presents governed properties before raw JSON', async () => {
    const wrapper = mount(EventPropertiesPreview, {
      attachTo: document.body,
      props: {
        value: {
          entry_point: 'theme_panel',
          nested: { enabled: true },
        },
        definitions: [{
          projectId: 'demo', propertyKey: 'entry_point', displayName: { 'zh-CN': '入口位置' },
          dataType: 'STRING', description: null, allowedValues: null, filterable: true,
          groupable: true, journeyKey: false, sensitive: false, active: true,
          createdAt: '', updatedAt: '',
        }],
      },
      global: {
        components: { ElPopover, ElIcon, ElButton, ElCollapse, ElCollapseItem },
      },
    })

    const reference = wrapper.get('.event-properties-reference')
    expect(reference.text()).toContain('查看 2 项属性')

    await reference.trigger('click')
    await nextTick()

    const detail = document.body.querySelector('.event-properties-detail')
    expect(detail?.textContent).toContain('入口位置')
    expect(detail?.textContent).toContain('entry_point')
    expect(detail?.textContent).toContain('theme_panel')
    expect(detail?.textContent).toContain('原始 JSON（诊断）')
    expect(detail?.querySelector('pre')?.textContent).toContain('\n  "entry_point": "theme_panel"')

    wrapper.unmount()
  })

  it('does not repeat a raw key when no business label is configured', () => {
    const wrapper = mount(EventPropertiesPreview, {
      props: { value: { platform: 'iOS' }, inline: true },
      global: { components: { ElCollapse, ElCollapseItem } },
    })

    expect(wrapper.get('.property-row').text()).toBe('platformiOS')
    expect(wrapper.find('.property-row code').exists()).toBe(false)
  })

  it('shows a quiet empty state without creating a popover', () => {
    const wrapper = mount(EventPropertiesPreview, {
      props: { value: null },
      global: {
        components: { ElPopover, ElIcon },
      },
    })

    expect(wrapper.text()).toBe('—')
    expect(wrapper.findComponent(ElPopover).exists()).toBe(false)
  })

  it('also exposes the semantic detail from keyboard activation', async () => {
    const wrapper = mount(EventPropertiesPreview, {
      attachTo: document.body,
      props: { value: { input: 'keyboard' } },
      global: {
        components: { ElPopover, ElIcon, ElButton, ElCollapse, ElCollapseItem },
      },
    })

    await wrapper.get('.event-properties-reference').trigger('click')
    await nextTick()

    expect(document.body.querySelector('.event-properties-detail')?.textContent).toContain('"input": "keyboard"')
    wrapper.unmount()
  })
})
