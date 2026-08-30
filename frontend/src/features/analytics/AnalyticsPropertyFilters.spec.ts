import { defineComponent, nextTick } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AnalyticsPropertyFilters from './AnalyticsPropertyFilters.vue'
import { getAnalyticsPropertyDefinitions } from '@/api/semantic'
import { setLocale } from '@/i18n'

vi.mock('@/api/semantic', () => ({ getAnalyticsPropertyDefinitions: vi.fn() }))

const SlotStub = defineComponent({ template: '<div><slot /></div>' })
const ButtonStub = defineComponent({
  emits: ['click'],
  template: '<button type="button" @click="$emit(\'click\')"><slot /></button>',
})
const OptionStub = defineComponent({
  props: ['label'],
  template: '<span>{{ label }}</span>',
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

const response = (projectId: string, propertyKey: string) => ({
  data: {
    data: {
      projectId,
      items: [{
        projectId,
        propertyKey,
        displayName: { en: propertyKey },
        dataType: 'STRING' as const,
        description: null,
        allowedValues: null,
        filterable: true,
        groupable: false,
        journeyKey: false,
        sensitive: false,
        active: true,
        createdAt: '',
        updatedAt: '',
      }],
    },
  },
})

describe('AnalyticsPropertyFilters', () => {
  beforeEach(() => {
    setLocale('zh')
    vi.mocked(getAnalyticsPropertyDefinitions).mockReset()
  })

  it('drops stale definitions when a slower previous-project request completes last', async () => {
    const projectA = deferred<ReturnType<typeof response>>()
    const projectB = deferred<ReturnType<typeof response>>()
    vi.mocked(getAnalyticsPropertyDefinitions)
      .mockReturnValueOnce(projectA.promise as never)
      .mockReturnValueOnce(projectB.promise as never)

    const wrapper = mount(AnalyticsPropertyFilters, {
      props: { projectId: 'project_a', modelValue: [] },
      global: {
        stubs: {
          ElButton: ButtonStub,
          ElSelect: SlotStub,
          ElOption: OptionStub,
          ElInput: true,
        },
      },
    })
    await wrapper.setProps({ projectId: 'project_b', modelValue: [] })
    projectB.resolve(response('project_b', 'schema_version'))
    await flushPromises()
    await nextTick()
    await wrapper.find('.filter-heading button').trigger('click')
    await nextTick()
    expect(wrapper.text()).toContain('schema_version')
    projectA.resolve(response('project_a', 'legacy_channel'))
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).not.toContain('legacy_channel')
    expect(vi.mocked(getAnalyticsPropertyDefinitions).mock.calls).toEqual([
      ['project_a'],
      ['project_b'],
    ])
  })

  it('refuses to commit an EQ filter until its value is complete', async () => {
    vi.mocked(getAnalyticsPropertyDefinitions).mockResolvedValue(response('project_a', 'event_schema_version') as never)
    const wrapper = mount(AnalyticsPropertyFilters, {
      props: {
        projectId: 'project_a',
        modelValue: [{ propertyKey: 'event_schema_version', operator: 'EQ', values: [] }],
      },
      global: {
        stubs: {
          ElButton: ButtonStub,
          ElSelect: SlotStub,
          ElOption: OptionStub,
          ElInput: true,
        },
      },
    })
    await flushPromises()

    const exposed = wrapper.vm as unknown as { commit: () => boolean }
    expect(exposed.commit()).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it.each([
    { operator: 'EQ' as const, values: ['3', '4'] },
    { operator: 'IN' as const, values: Array.from({ length: 21 }, (_, index) => String(index + 1)) },
  ])('refuses filter cardinality rejected by the backend: $operator', async ({ operator, values }) => {
    vi.mocked(getAnalyticsPropertyDefinitions).mockResolvedValue(response('project_a', 'event_schema_version') as never)
    const wrapper = mount(AnalyticsPropertyFilters, {
      props: {
        projectId: 'project_a',
        modelValue: [{ propertyKey: 'event_schema_version', operator, values }],
      },
      global: {
        stubs: {
          ElButton: ButtonStub,
          ElSelect: SlotStub,
          ElOption: OptionStub,
          ElInput: true,
        },
      },
    })
    await flushPromises()

    const exposed = wrapper.vm as unknown as { commit: () => boolean }
    expect(exposed.commit()).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('preserves commas inside a single governed string value', async () => {
    vi.mocked(getAnalyticsPropertyDefinitions).mockResolvedValue(response('project_a', 'campaign') as never)
    const wrapper = mount(AnalyticsPropertyFilters, {
      props: {
        projectId: 'project_a',
        modelValue: [{ propertyKey: 'campaign', operator: 'EQ', values: ['A,B'] }],
      },
      global: {
        stubs: {
          ElButton: ButtonStub,
          ElSelect: SlotStub,
          ElOption: OptionStub,
          ElInput: true,
        },
      },
    })
    await flushPromises()

    const exposed = wrapper.vm as unknown as { commit: () => boolean }
    expect(exposed.commit()).toBe(true)
    const emissions = wrapper.emitted('update:modelValue') || []
    expect(emissions[emissions.length - 1]?.[0]).toEqual([
      { propertyKey: 'campaign', operator: 'EQ', values: ['A,B'] },
    ])
  })

  it('allows the twelfth filter row and rejects the thirteenth', async () => {
    vi.mocked(getAnalyticsPropertyDefinitions).mockResolvedValue(response('project_a', 'event_schema_version') as never)
    const modelValue = Array.from({ length: 11 }, (_, index) => ({
      propertyKey: `property_${index}`,
      operator: 'EXISTS' as const,
      values: [],
    }))
    const wrapper = mount(AnalyticsPropertyFilters, {
      props: { projectId: 'project_a', modelValue },
      global: {
        stubs: {
          ElButton: ButtonStub,
          ElSelect: SlotStub,
          ElOption: OptionStub,
          ElInput: true,
        },
      },
    })
    await flushPromises()

    const addButton = wrapper.find('.filter-heading button')
    await addButton.trigger('click')
    expect(wrapper.findAll('.filter-row')).toHaveLength(12)

    await addButton.trigger('click')
    expect(wrapper.findAll('.filter-row')).toHaveLength(12)
  })
})
