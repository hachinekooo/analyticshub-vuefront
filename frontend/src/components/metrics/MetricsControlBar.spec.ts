import { beforeEach, describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import MetricsControlBar from './MetricsControlBar.vue'
import { dashboardSpacesForTemplate } from '@/features/dashboard/projectDashboardTemplate'
import { setLocale } from '@/i18n'

const mountBar = (space: 'overview' | 'details') => shallowMount(MetricsControlBar, {
  props: {
    space,
    spaces: dashboardSpacesForTemplate('app'),
    dateRange: null,
    granularity: 'day',
    userId: '',
    resolvedActorId: '',
    deviceId: '',
    refreshing: false,
    editing: false,
  },
  global: {
    stubs: {
      ElButton: true,
      ElIcon: true,
      ElForm: { template: '<form><slot /></form>' },
      ElFormItem: { props: ['label'], template: '<label>{{ label }}<slot /></label>' },
      ElDatePicker: true,
      ElSelect: true,
      ElOption: true,
      ElInput: true,
      Refresh: true,
      Setting: true,
    },
  },
})

describe('MetricsControlBar', () => {
  beforeEach(() => setLocale('zh'))

  it('places data-range and detail filters in one divided section', () => {
    const wrapper = mountBar('details')

    expect(wrapper.findAll('.filter-section')).toHaveLength(1)
    expect(wrapper.find('.filter-section').classes()).toContain('combined-filters')
    expect(wrapper.find('.filter-divider').exists()).toBe(true)
    expect(wrapper.findAll('.filter-group')).toHaveLength(2)
    expect(wrapper.text()).toContain('事件归一身份')
    expect(wrapper.text()).not.toContain('官网')
    expect(wrapper.text()).not.toContain('App')
  })

  it('emits the resolved actor entered for the event journey filter', () => {
    const wrapper = mountBar('details')
    const inputs = wrapper.findAllComponents({ name: 'ElInput' })

    inputs[1]?.vm.$emit('update:modelValue', '22222222-2222-4222-8222-222222222222')

    expect(wrapper.emitted('update:resolvedActorId')).toEqual([
      ['22222222-2222-4222-8222-222222222222'],
    ])
  })

  it('keeps the normal dashboard filter section compact without a divider', () => {
    const wrapper = mountBar('overview')

    expect(wrapper.findAll('.filter-section')).toHaveLength(1)
    expect(wrapper.find('.filter-divider').exists()).toBe(false)
    expect(wrapper.findAll('.filter-group')).toHaveLength(1)
  })

  it('offers layout editing in both overview and detailed-data workspaces', () => {
    expect(mountBar('overview').findAllComponents({ name: 'ElButton' })).toHaveLength(2)
    expect(mountBar('details').findAllComponents({ name: 'ElButton' })).toHaveLength(2)
  })
})
