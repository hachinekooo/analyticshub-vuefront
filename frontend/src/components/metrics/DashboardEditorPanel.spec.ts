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
    currentWidgets: [{ type: 'core.overview', label: '总览指标' }],
    availableWidgets: [{ type: 'core.retention', label: '留存分析' }],
    customWidgetCount: 0,
    saving: false,
  },
  global: {
    stubs: {
      ElButton: ButtonStub,
      ElIcon: SlotStub,
      ElTag: SlotStub,
      ElEmpty: true,
      Brush: true,
      Finished: true,
      Plus: true,
    },
  },
})

describe('DashboardEditorPanel', () => {
  beforeEach(() => setLocale('zh'))

  it('makes dashboard customization and extension registration visible', () => {
    const wrapper = mountPanel()

    expect(wrapper.text()).toContain('仪表盘编辑器')
    expect(wrapper.text()).toContain('总览指标')
    expect(wrapper.text()).toContain('当前构建已注册 0 个可信自定义组件')
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
