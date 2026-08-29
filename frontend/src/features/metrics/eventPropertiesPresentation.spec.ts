import { describe, expect, it } from 'vitest'
import { presentEventProperties } from './eventPropertiesPresentation'

describe('presentEventProperties', () => {
  it('keeps the table summary compact and exposes complete formatted JSON', () => {
    const value = {
      entry_point: 'theme_panel',
      style_id: 'premium_frame_01',
      nested: { enabled: true, steps: [1, 2, 3] },
    }

    const presentation = presentEventProperties(value)

    expect(presentation.hasValue).toBe(true)
    expect(presentation.summary).toBe(JSON.stringify(value))
    expect(presentation.formatted).toBe(JSON.stringify(value, null, 2))
    expect(presentation.formatted).toContain('\n  "entry_point"')
  })

  it('truncates only the summary while retaining the full value in the detail view', () => {
    const value = { content: 'x'.repeat(240) }

    const presentation = presentEventProperties(value)

    expect(presentation.summary).toHaveLength(160)
    expect(presentation.summary.endsWith('…')).toBe(true)
    expect(presentation.formatted).toContain('x'.repeat(240))
  })

  it('uses an empty-state mark for missing or non-serializable values', () => {
    expect(presentEventProperties(null)).toEqual({
      summary: '—',
      formatted: '—',
      hasValue: false,
    })

    expect(presentEventProperties({ value: 1n })).toEqual({
      summary: '—',
      formatted: '—',
      hasValue: false,
    })
  })
})
