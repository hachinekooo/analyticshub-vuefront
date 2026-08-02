import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import DashboardEditorPanel from './DashboardEditorPanel.vue'
import { setLocale } from '@/i18n'

const SlotStub = defineComponent({ template: '<div><slot /></div>' })
const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})

const mountPanel = (visible = true) => mount(DashboardEditorPanel, {
  props: {
    visible,
    availableWidgets: [{ type: 'core.retention', label: '留存分析' }],
    saving: false,
  },
  global: {
    stubs: {
      ElButton: ButtonStub,
      ElIcon: SlotStub,
      Brush: true,
      Finished: true,
      Plus: true,
    },
  },
})

describe('DashboardEditorPanel', () => {
  beforeEach(() => setLocale('zh'))

  it('shows a compact editing workflow without draft or publishing states', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('调整数据大屏布局')
    expect(wrapper.text()).toContain('重置布局')
    expect(wrapper.text()).toContain('取消')
    expect(wrapper.text()).toContain('完成')
    expect(wrapper.text()).not.toMatch(/草稿|预览|发布/)
  })

  it('emits reset, cancel and complete as distinct edit decisions', async () => {
    const wrapper = mountPanel()
    const buttons = wrapper.findAll('.editor-actions button')

    await buttons[0]!.trigger('click')
    await buttons[1]!.trigger('click')
    await buttons[2]!.trigger('click')

    expect(wrapper.emitted('reset')).toHaveLength(1)
    expect(wrapper.emitted('cancel')).toHaveLength(1)
    expect(wrapper.emitted('complete')).toHaveLength(1)
  })

  it('emits the selected widget type from the component library', async () => {
    const wrapper = mountPanel()

    await wrapper.find('.widget-library button').trigger('click')

    expect(wrapper.emitted('add')).toEqual([['core.retention']])
  })

  it('does not render outside customization mode', () => {
    expect(mountPanel(false).find('.editor-panel').exists()).toBe(false)
  })
})
