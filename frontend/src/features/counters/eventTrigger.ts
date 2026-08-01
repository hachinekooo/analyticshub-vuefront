export type CounterConditions = Record<string, unknown>

export type CounterEventTriggerClause = {
  event_type: string
  conditions?: CounterConditions
}

type LegacySingleEventTrigger = {
  event_type: string
  event_types?: never
  conditions?: CounterConditions
  any_of?: never
}

type LegacyMultipleEventTrigger = {
  event_type?: never
  event_types: string[]
  conditions?: CounterConditions
  any_of?: never
}

type AnyOfEventTrigger = {
  event_type?: never
  event_types?: never
  conditions?: never
  any_of: CounterEventTriggerClause[]
}

export type CounterEventTrigger =
  | LegacySingleEventTrigger
  | LegacyMultipleEventTrigger
  | AnyOfEventTrigger

export type CounterTriggerMode = 'shared' | 'anyOf'

export type CounterEventTriggerClauseDraft = {
  eventType: string
  conditionsText: string
}

export type CounterEventTriggerDraft = {
  mode: CounterTriggerMode
  eventTypes: string[]
  conditionsText: string
  clauses: CounterEventTriggerClauseDraft[]
}

export type CounterTriggerValidationCode =
  | 'eventTypeRequired'
  | 'invalidConditions'
  | 'clauseEventTypeRequired'
  | 'invalidClauseConditions'
  | 'duplicateClause'
  | 'tooManyEventTypes'
  | 'tooManyClauses'

export type CounterTriggerBuildResult =
  | { trigger?: CounterEventTrigger }
  | { error: CounterTriggerValidationCode; clauseIndex?: number }

export type CounterTriggerPatch = {
  eventTrigger?: CounterEventTrigger
  clearEventTrigger?: true
}

export type CounterTriggerPatchResult =
  | { patch: CounterTriggerPatch }
  | { error: CounterTriggerValidationCode; clauseIndex?: number }

const maxClauses = 100

const conditionsText = (conditions: CounterConditions | undefined) =>
  conditions ? JSON.stringify(conditions, null, 2) : ''

export const createCounterEventTriggerDraft = (
  trigger: CounterEventTrigger | null | undefined,
): CounterEventTriggerDraft => {
  if (trigger && 'any_of' in trigger && Array.isArray(trigger.any_of)) {
    return {
      mode: 'anyOf',
      eventTypes: [],
      conditionsText: '',
      clauses: trigger.any_of.map((clause) => ({
        eventType: clause.event_type,
        conditionsText: conditionsText(clause.conditions),
      })),
    }
  }

  const eventTypes = trigger && 'event_types' in trigger && Array.isArray(trigger.event_types)
    ? [...trigger.event_types]
    : trigger && 'event_type' in trigger && typeof trigger.event_type === 'string'
      ? [trigger.event_type]
      : []

  return {
    mode: 'shared',
    eventTypes,
    conditionsText: conditionsText(trigger?.conditions),
    clauses: [],
  }
}

const parseConditions = (text: string): CounterConditions | null | 'invalid' => {
  if (!text.trim()) return null
  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return 'invalid'
    return Object.keys(parsed).length === 0 ? null : parsed as CounterConditions
  } catch {
    return 'invalid'
  }
}

const canonicalizeJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalizeJson)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonicalizeJson(child)]),
  )
}

const canonicalJson = (value: unknown) => JSON.stringify(canonicalizeJson(value))

export const areCounterEventTriggersEqual = (
  left: CounterEventTrigger | null | undefined,
  right: CounterEventTrigger | null | undefined,
) => canonicalJson(left ?? null) === canonicalJson(right ?? null)

export const buildCounterEventTrigger = (
  draft: CounterEventTriggerDraft,
): CounterTriggerBuildResult => {
  if (draft.mode === 'shared') {
    const eventTypes = [...new Set(draft.eventTypes.map((item) => item.trim()).filter(Boolean))]
    if (eventTypes.length > maxClauses) return { error: 'tooManyEventTypes' }

    const conditions = parseConditions(draft.conditionsText)
    if (conditions === 'invalid') return { error: 'invalidConditions' }
    if (conditions && eventTypes.length === 0) return { error: 'eventTypeRequired' }
    if (eventTypes.length === 0) return {}

    const eventSelector = eventTypes.length === 1
      ? { event_type: eventTypes[0]! }
      : { event_types: eventTypes }
    return {
      trigger: {
        ...eventSelector,
        ...(conditions ? { conditions } : {}),
      } as CounterEventTrigger,
    }
  }

  if (draft.clauses.length > maxClauses) return { error: 'tooManyClauses' }
  if (draft.clauses.length === 0) return {}

  const clauses: CounterEventTriggerClause[] = []
  const seenClauses = new Set<string>()
  for (const [clauseIndex, clause] of draft.clauses.entries()) {
    const eventType = clause.eventType.trim()
    const hasConditionsText = Boolean(clause.conditionsText.trim())
    if (!eventType) {
      if (draft.clauses.length === 1 && !hasConditionsText) return {}
      return { error: 'clauseEventTypeRequired', clauseIndex }
    }

    const conditions = parseConditions(clause.conditionsText)
    if (conditions === 'invalid') return { error: 'invalidClauseConditions', clauseIndex }
    const normalizedClause: CounterEventTriggerClause = {
      event_type: eventType,
      ...(conditions ? { conditions } : {}),
    }
    const signature = canonicalJson(normalizedClause)
    if (seenClauses.has(signature)) return { error: 'duplicateClause', clauseIndex }
    seenClauses.add(signature)
    clauses.push(normalizedClause)
  }

  return { trigger: { any_of: clauses } }
}

/**
 * Converts editor state into the PATCH semantics used by the counter API.
 * An unchanged rule intentionally produces an empty patch; clearing is always
 * explicit, so metadata-only edits cannot erase a persisted any_of rule.
 */
export const buildCounterEventTriggerPatch = (
  original: CounterEventTrigger | null | undefined,
  draft: CounterEventTriggerDraft,
): CounterTriggerPatchResult => {
  const result = buildCounterEventTrigger(draft)
  if ('error' in result) return result
  if (result.trigger && !areCounterEventTriggersEqual(result.trigger, original)) {
    return { patch: { eventTrigger: result.trigger } }
  }
  if (original && !result.trigger) return { patch: { clearEventTrigger: true } }
  return { patch: {} }
}
