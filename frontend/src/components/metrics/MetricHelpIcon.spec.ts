import { describe, expect, it } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import MetricHelpIcon from './MetricHelpIcon.vue'

describe('MetricHelpIcon', () => {
  it('exposes the complete explanation to keyboard and assistive-technology users', () => {
    const wrapper = shallowMount(MetricHelpIcon, {
      props: { content: 'Explains what this metric means.' },
      global: {
        stubs: {
          ElTooltip: { template: '<div><slot /></div>' },
          ElIcon: { template: '<span v-bind="$attrs"><slot /></span>' },
          InfoFilled: true,
        },
      },
    })

    const icon = wrapper.find('.metric-help-icon')
    expect(icon.attributes('aria-label')).toBe('Explains what this metric means.')
    expect(icon.attributes('tabindex')).toBe('0')
  })
})
