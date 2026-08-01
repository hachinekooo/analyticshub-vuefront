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
        { event_type: 'item_completed' },
        { event_type: 'item_done_v2', conditions: { source: 'api' } },
        { event_type: 'item_done_v2', conditions: { source: 'import' } },
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

  it('keeps legacy event_types with shared conditions editable', () => {
    const original: CounterEventTrigger = {
      event_types: ['item_saved', 'item_completed'],
      conditions: { status: 'success' },
    }

    const result = buildCounterEventTrigger(createCounterEventTriggerDraft(original))

    expect(result).toEqual({ trigger: original })
  })

  it('normalizes whitespace and duplicate legacy event keys', () => {
    const draft = createCounterEventTriggerDraft(null)
    draft.eventTypes = [' item_saved ', 'item_saved', 'item_completed']

    expect(buildCounterEventTrigger(draft)).toEqual({
      trigger: { event_types: ['item_saved', 'item_completed'] },
    })
  })

  it('rejects a partially configured any_of clause instead of silently clearing it', () => {
    const draft = createCounterEventTriggerDraft(null)
    draft.mode = 'anyOf'
    draft.clauses = [{ eventType: '', conditionsText: '{"source":"api"}' }]

    expect(buildCounterEventTrigger(draft)).toEqual({
      error: 'clauseEventTypeRequired',
      clauseIndex: 0,
    })
  })

  it('rejects invalid clause conditions and exact duplicate clauses', () => {
    const invalid = createCounterEventTriggerDraft(null)
    invalid.mode = 'anyOf'
    invalid.clauses = [{ eventType: 'item_saved', conditionsText: '[]' }]
    expect(buildCounterEventTrigger(invalid)).toEqual({
      error: 'invalidClauseConditions',
      clauseIndex: 0,
    })

    const duplicate = createCounterEventTriggerDraft(null)
    duplicate.mode = 'anyOf'
    duplicate.clauses = [
      { eventType: 'item_saved', conditionsText: '{"source":"api","status":"ok"}' },
      { eventType: ' item_saved ', conditionsText: '{"status":"ok","source":"api"}' },
    ]
    expect(buildCounterEventTrigger(duplicate)).toEqual({
      error: 'duplicateClause',
      clauseIndex: 1,
    })
  })

  it('compares equivalent JSON regardless of object property order', () => {
    expect(areCounterEventTriggersEqual(
      { event_type: 'item_saved', conditions: { source: 'api', status: 'ok' } },
      { conditions: { status: 'ok', source: 'api' }, event_type: 'item_saved' },
    )).toBe(true)
  })

  it('emits no trigger patch when an any_of rule is opened and saved unchanged', () => {
    const original: CounterEventTrigger = {
      any_of: [
        { event_type: 'item_saved', conditions: { source: 'api' } },
        { event_type: 'item_saved', conditions: { source: 'import' } },
      ],
    }

    expect(buildCounterEventTriggerPatch(
      original,
      createCounterEventTriggerDraft(original),
    )).toEqual({ patch: {} })
  })

  it('uses explicit clear semantics only after all clauses are removed', () => {
    const original: CounterEventTrigger = {
      any_of: [{ event_type: 'item_saved' }],
    }
    const draft = createCounterEventTriggerDraft(original)
    draft.clauses = []

    expect(buildCounterEventTriggerPatch(original, draft)).toEqual({
      patch: { clearEventTrigger: true },
    })
  })
})
