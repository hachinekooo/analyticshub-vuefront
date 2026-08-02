import { defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import ProjectFormDialog from './ProjectFormDialog.vue'
import { setLocale } from '@/i18n'
import type { Project } from '@/api/admin'

const SlotStub = defineComponent({ template: '<div><slot /></div>' })
const DialogStub = defineComponent({
  props: ['modelValue'],
  template: '<div v-if="modelValue"><slot /><slot name="footer" /></div>',
})
const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})

const project: Project = {
  id: 7,
  projectId: 'sample_app',
  projectName: 'Sample App',
  analysisTemplate: 'app',
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: 'sample',
  dbSchema: 'analytics',
  dbUser: 'sample_user',
  dbPassword: '',
  tablePrefix: 'analytics_',
  isActive: true,
}

const mountDialog = () => mount(ProjectFormDialog, {
  props: { modelValue: true, project, saving: false },
  global: {
    stubs: {
      ElDialog: DialogStub,
      ElButton: ButtonStub,
      ElForm: SlotStub,
      ElFormItem: SlotStub,
      ElRow: SlotStub,
      ElCol: SlotStub,
      ElInput: true,
      ElInputNumber: true,
      ElSwitch: true,
    },
  },
})

const clickNext = (wrapper: ReturnType<typeof mountDialog>) =>
  wrapper.find('.wizard-footer button:last-child').trigger('click')

describe('ProjectFormDialog', () => {
  beforeEach(() => setLocale('zh'))

  it('presents a short three-step project setup flow', async () => {
    const wrapper = mountDialog()

    expect(wrapper.text()).toContain('基础信息')
    await clickNext(wrapper)
    expect(wrapper.text()).toContain('分析模板')
    await clickNext(wrapper)
    expect(wrapper.text()).toContain('数据库连接与确认')
  })

  it('submits the stable analysis template with the project contract', async () => {
    const wrapper = mountDialog()

    await clickNext(wrapper)
    await clickNext(wrapper)
    await clickNext(wrapper)

    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({
      projectId: 'sample_app',
      analysisTemplate: 'app',
      dbSchema: 'analytics',
    })
  })
})
