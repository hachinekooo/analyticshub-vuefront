import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import OrderedSelectionEditor from './OrderedSelectionEditor.vue'

describe('OrderedSelectionEditor', () => {
  it('moves selected values without changing their identity', async () => {
    const wrapper = mount(OrderedSelectionEditor, {
      props: {
        modelValue: ['a', 'b'],
        options: [
          { key: 'a', label: 'A' },
          { key: 'b', label: 'B' },
        ],
        placeholder: 'Select',
        emptyText: 'Empty',
        moveUpLabel: 'Move up',
        moveDownLabel: 'Move down',
      },
      global: {
        stubs: {
          ElSelect: { template: '<div><slot /></div>' },
          ElOption: { template: '<div><slot /></div>' },
          ElButton: { template: '<button :disabled="$attrs.disabled"><slot /></button>' },
        },
      },
    })

    await wrapper.findAll('button')[2]!.trigger('click')
    const updates = wrapper.emitted('update:modelValue') ?? []
    expect(updates[updates.length - 1]).toEqual([['b', 'a']])
  })

  it('marks a retained unavailable selection instead of showing a bare key', () => {
    const wrapper = mount(OrderedSelectionEditor, {
      props: {
        modelValue: ['removed_counter'],
        options: [{
          key: 'removed_counter',
          label: 'removed_counter',
          description: 'This counter no longer exists.',
          disabled: true,
          disabledReason: 'Unavailable',
        }],
        placeholder: 'Select',
        emptyText: 'Empty',
        moveUpLabel: 'Move up',
        moveDownLabel: 'Move down',
      },
      global: {
        stubs: {
          ElSelect: { template: '<div><slot /></div>' },
          ElOption: { template: '<div><slot /></div>' },
          ElButton: { template: '<button><slot /></button>' },
        },
      },
    })

    expect(wrapper.text()).toContain('Unavailable')
    expect(wrapper.text()).toContain('This counter no longer exists.')
    expect(wrapper.find('article').classes()).toContain('is-unavailable')
  })
})
