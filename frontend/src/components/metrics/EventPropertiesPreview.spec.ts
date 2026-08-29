import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { ElIcon, ElPopover } from 'element-plus'
import EventPropertiesPreview from './EventPropertiesPreview.vue'
import { setLocale } from '@/i18n'

describe('EventPropertiesPreview', () => {
  beforeEach(() => setLocale('zh'))
  afterEach(() => { document.body.innerHTML = '' })

  it('keeps the row compact and reveals complete formatted JSON on hover', async () => {
    const wrapper = mount(EventPropertiesPreview, {
      attachTo: document.body,
      props: {
        value: {
          entry_point: 'theme_panel',
          nested: { enabled: true },
        },
      },
      global: {
        components: { ElPopover, ElIcon },
      },
    })

    const reference = wrapper.get('.event-properties-reference')
    expect(reference.text()).toContain('"entry_point":"theme_panel"')

    await reference.trigger('mouseenter')
    await new Promise(resolve => setTimeout(resolve, 250))
    await nextTick()

    const detail = document.body.querySelector('.event-properties-detail')
    expect(detail?.textContent).toContain('完整 JSON')
    expect(detail?.querySelector('pre')?.textContent).toContain('\n  "entry_point": "theme_panel"')

    wrapper.unmount()
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

  it('also exposes the complete value from keyboard focus', async () => {
    const wrapper = mount(EventPropertiesPreview, {
      attachTo: document.body,
      props: { value: { input: 'keyboard' } },
      global: {
        components: { ElPopover, ElIcon },
      },
    })

    await wrapper.get('.event-properties-reference').trigger('focus')
    await nextTick()

    expect(document.body.querySelector('.event-properties-detail')?.textContent).toContain('"input": "keyboard"')
    wrapper.unmount()
  })
})
