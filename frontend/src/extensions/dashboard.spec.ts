import { describe, expect, it, vi } from 'vitest'
import {
  cloneDashboardExtensionConfig,
  normalizeDashboardExtensionConfig,
} from './dashboard'

describe('dashboard extension JSON config', () => {
  it('returns a detached JSON object for valid config', () => {
    const source = { threshold: 80, labels: ['new', 'active'], nested: { enabled: true } }

    const cloned = cloneDashboardExtensionConfig(source)

    expect(cloned).toEqual(source)
    expect(cloned).not.toBe(source)
    expect(cloned?.labels).not.toBe(source.labels)
    source.nested.enabled = false
    expect(cloned?.nested).toEqual({ enabled: true })
  })

  it.each([
    ['an array root', []],
    ['a Date instance', { value: new Date('2026-01-01T00:00:00Z') }],
    ['a function', { value: () => true }],
    ['NaN', { value: Number.NaN }],
    ['Infinity', { value: Number.POSITIVE_INFINITY }],
  ])('rejects %s because the persisted contract is JSON-only', (_, value) => {
    expect(cloneDashboardExtensionConfig(value)).toBeNull()
  })

  it('rejects cycles, excessive nesting and oversized UTF-8 payloads', () => {
    const cyclic: Record<string, unknown> = {}
    cyclic.self = cyclic

    let deeplyNested: Record<string, unknown> = {}
    for (let depth = 0; depth < 52; depth += 1) {
      deeplyNested = { child: deeplyNested }
    }

    expect(cloneDashboardExtensionConfig(cyclic)).toBeNull()
    expect(cloneDashboardExtensionConfig(deeplyNested)).toBeNull()
    expect(cloneDashboardExtensionConfig({ value: '汉'.repeat(90_000) })).toBeNull()
  })

  it('validates a clone and fails closed when downstream validation throws', () => {
    const source = { threshold: 80 }
    const validateConfig = vi.fn((config) => config.threshold === 80)

    const normalized = normalizeDashboardExtensionConfig({ validateConfig }, source)

    expect(normalized).toEqual(source)
    expect(validateConfig).toHaveBeenCalledOnce()
    expect(validateConfig.mock.calls[0]?.[0]).not.toBe(source)
    expect(normalizeDashboardExtensionConfig({ validateConfig: () => false }, source)).toBeNull()
    expect(normalizeDashboardExtensionConfig({ validateConfig: () => { throw new Error('bad validator') } }, source)).toBeNull()
  })
})
