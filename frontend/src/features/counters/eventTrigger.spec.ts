import { describe, expect, it } from 'vitest'
import {
  areCounterEventTriggersEqual,
  buildCounterEventTrigger,
  buildCounterEventTriggerPatch,
  createCounterEventTriggerDraft,
  type CounterEventTrigger,
} from './eventTrigger'

describe('counter event trigger editor model', () => {
  it('round-trips any_of clauses without collapsing same-event conditions', () => {
    const original: CounterEventTrigger = {
      any_of: [
        { semantic_key: 'core.action.completed' },
        { semantic_key: 'custom.content.shared', conditions: { source: 'api' } },
        { semantic_key: 'custom.content.shared', conditions: { source: 'import' } },
      ],
    }

    const draft = createCounterEventTriggerDraft(original)
    const result = buildCounterEventTrigger(draft)

    expect(draft.mode).toBe('anyOf')
    expect(draft.clauses).toHaveLength(3)
    expect(result).toEqual({ trigger: original })
    if (!('trigger' in result)) throw new Error('expected a valid trigger')
    expect(areCounterEventTriggersEqual(result.trigger, original)).toBe(true)
  })

  it('keeps semantic_keys with shared conditions editable', () => {
    const original: CounterEventTrigger = {
      semantic_keys: ['core.action.completed', 'custom.content.shared'],
      conditions: { status: 'success' },
    }

    const result = buildCounterEventTrigger(createCounterEventTriggerDraft(original))

    expect(result).toEqual({ trigger: original })
  })

  it('normalizes whitespace and duplicate semantic keys', () => {
    const draft = createCounterEventTriggerDraft(null)
    draft.semanticKeys = [' core.action.completed ', 'core.action.completed', 'custom.content.shared']

    expect(buildCounterEventTrigger(draft)).toEqual({
      trigger: { semantic_keys: ['core.action.completed', 'custom.content.shared'] },
    })
  })

  it('rejects a partially configured any_of clause instead of silently clearing it', () => {
    const draft = createCounterEventTriggerDraft(null)
    draft.mode = 'anyOf'
    draft.clauses = [{ semanticKey: '', conditionsText: '{"source":"api"}' }]

    expect(buildCounterEventTrigger(draft)).toEqual({
      error: 'clauseEventTypeRequired',
      clauseIndex: 0,
    })
  })

  it('rejects invalid clause conditions and exact duplicate clauses', () => {
    const invalid = createCounterEventTriggerDraft(null)
    invalid.mode = 'anyOf'
    invalid.clauses = [{ semanticKey: 'core.action.completed', conditionsText: '[]' }]
    expect(buildCounterEventTrigger(invalid)).toEqual({
      error: 'invalidClauseConditions',
      clauseIndex: 0,
    })

    const duplicate = createCounterEventTriggerDraft(null)
    duplicate.mode = 'anyOf'
    duplicate.clauses = [
      { semanticKey: 'core.action.completed', conditionsText: '{"source":"api","status":"ok"}' },
      { semanticKey: ' core.action.completed ', conditionsText: '{"status":"ok","source":"api"}' },
    ]
    expect(buildCounterEventTrigger(duplicate)).toEqual({
      error: 'duplicateClause',
      clauseIndex: 1,
    })
  })

  it('compares equivalent JSON regardless of object property order', () => {
    expect(areCounterEventTriggersEqual(
      { semantic_key: 'item_saved', conditions: { source: 'api', status: 'ok' } },
      { conditions: { status: 'ok', source: 'api' }, semantic_key: 'item_saved' },
    )).toBe(true)
  })

  it('emits no trigger patch when an any_of rule is opened and saved unchanged', () => {
    const original: CounterEventTrigger = {
      any_of: [
        { semantic_key: 'item_saved', conditions: { source: 'api' } },
        { semantic_key: 'item_saved', conditions: { source: 'import' } },
      ],
    }

    expect(buildCounterEventTriggerPatch(
      original,
      createCounterEventTriggerDraft(original),
    )).toEqual({ patch: {} })
  })

  it('uses explicit clear semantics only after all clauses are removed', () => {
    const original: CounterEventTrigger = {
      any_of: [{ semantic_key: 'item_saved' }],
    }
    const draft = createCounterEventTriggerDraft(original)
    draft.clauses = []

    expect(buildCounterEventTriggerPatch(original, draft)).toEqual({
      patch: { clearEventTrigger: true },
    })
  })
})
