import { defineComponent, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import LanguageToggle from './LanguageToggle.vue'
import { setLocale } from '@/i18n'

const DropdownStub = defineComponent({
  name: 'ElDropdown',
  emits: ['command'],
  template: '<div><slot /><slot name="dropdown" /></div>',
})
const SlotStub = defineComponent({ template: '<div><slot /></div>' })

describe('LanguageToggle', () => {
  beforeEach(() => {
    localStorage.clear()
    setLocale('en')
  })

  it('updates the visible locale through the dropdown contract', async () => {
    const wrapper = mount(LanguageToggle, {
      global: {
        stubs: {
          ElDropdown: DropdownStub,
          ElButton: SlotStub,
          ElIcon: SlotStub,
          ElDropdownMenu: SlotStub,
          ElDropdownItem: SlotStub,
          Switch: true,
        },
      },
    })

    expect(wrapper.text()).toContain('EN')

    wrapper.findComponent(DropdownStub).vm.$emit('command', 'zh')
    await nextTick()

    expect(wrapper.text()).toContain('中文')
    expect(localStorage.getItem('locale')).toBe('zh')
  })

  it('ignores unsupported command values', async () => {
    const wrapper = mount(LanguageToggle, {
      global: {
        stubs: {
          ElDropdown: DropdownStub,
          ElButton: SlotStub,
          ElIcon: SlotStub,
          ElDropdownMenu: SlotStub,
          ElDropdownItem: SlotStub,
          Switch: true,
        },
      },
    })

    wrapper.findComponent(DropdownStub).vm.$emit('command', 'fr')
    await nextTick()

    expect(wrapper.text()).toContain('EN')
    expect(localStorage.getItem('locale')).toBe('en')
  })
})
