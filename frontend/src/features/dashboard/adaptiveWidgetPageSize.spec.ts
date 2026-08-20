import { describe, expect, it } from 'vitest'
import { adaptiveWidgetPageSize, withoutLegacyFixedPageSize } from './adaptiveWidgetPageSize'

describe('adaptiveWidgetPageSize', () => {
  it.each([
    ['core.events', 12],
    ['core.devices', 14],
    ['core.sessions', 10],
    ['core.traffic', 14],
  ])('uses ten rows at the default %s height', (type, height) => {
    expect(adaptiveWidgetPageSize(type, height)).toBe(10)
  })

  it.each([
    ['core.events', 24, 25],
    ['core.devices', 28, 27],
    ['core.sessions', 20, 22],
    ['core.traffic', 28, 27],
  ])('uses the space released after fixed UI in an enlarged %s widget', (type, height, expected) => {
    expect(adaptiveWidgetPageSize(type, height)).toBe(expected)
  })

  it('fills a tall event widget without optimistic overflow', () => {
    expect(adaptiveWidgetPageSize('core.events', 35)).toBe(38)
    expect(adaptiveWidgetPageSize('core.events', 38)).toBe(42)
  })

  it('uses exact row capacity with bounded request sizes', () => {
    expect(adaptiveWidgetPageSize('core.events', 8)).toBe(5)
    expect(adaptiveWidgetPageSize('core.events', 18)).toBe(17)
    expect(adaptiveWidgetPageSize('core.events', 999)).toBe(100)
    expect(adaptiveWidgetPageSize('core.overview', 12)).toBeNull()
  })

  it('removes only the legacy fixed page size from table widget config', () => {
    expect(withoutLegacyFixedPageSize('core.events', { pageSize: 50, eventType: 'open' }))
      .toEqual({ eventType: 'open' })
    expect(withoutLegacyFixedPageSize('core.sessions', { pageSize: 20 })).toBeUndefined()
    expect(withoutLegacyFixedPageSize('core.topEvents', { pageSize: 20 })).toEqual({ pageSize: 20 })
  })
})
