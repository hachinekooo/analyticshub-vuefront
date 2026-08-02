import { describe, expect, it } from 'vitest'
import { resolveCounterSavePolicy } from './counterPolicy'

const defaults = {
  isEditing: true,
  hasEventRule: true,
  ruleChanged: false,
  value: 20,
  originalValue: 20,
  historyMode: 'INCLUDE_EXISTING' as const,
  originalHistoryMode: 'INCLUDE_EXISTING' as const,
  rebuildOffset: 0,
  originalRebuildOffset: 0,
  lastRebuiltAt: '2026-08-01T10:00:00Z',
}

describe('counter save policy', () => {
  it('initializes a new automatic counter with its durable history policy', () => {
    expect(resolveCounterSavePolicy({
      ...defaults,
      isEditing: false,
      historyMode: 'START_FROM_NOW',
      rebuildOffset: 12,
    })).toEqual({
      patch: {
        value: 12,
        historyMode: 'START_FROM_NOW',
        rebuildOffset: 12,
      },
      shouldRebuild: true,
    })
  })

  it('does not rebuild an automatic counter after metadata-only edits', () => {
    expect(resolveCounterSavePolicy(defaults)).toEqual({
      patch: {},
      shouldRebuild: false,
    })
  })

  it('rebuilds when the history scope or adjustment changes', () => {
    expect(resolveCounterSavePolicy({
      ...defaults,
      historyMode: 'START_FROM_NOW',
      rebuildOffset: -3,
    })).toEqual({
      patch: {
        historyMode: 'START_FROM_NOW',
        rebuildOffset: -3,
      },
      shouldRebuild: true,
    })
  })

  it('keeps manual counters independent from history policy', () => {
    expect(resolveCounterSavePolicy({
      ...defaults,
      hasEventRule: false,
      value: 25,
    })).toEqual({
      patch: { value: 25 },
      shouldRebuild: false,
    })
  })
})
