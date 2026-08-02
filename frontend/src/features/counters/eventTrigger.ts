export type CounterConditions = Record<string, unknown>

export type CounterEventTriggerClause = {
  semantic_key: string
  conditions?: CounterConditions
}

type SingleSemanticTrigger = {
  semantic_key: string
  semantic_keys?: never
  conditions?: CounterConditions
  any_of?: never
}

type MultipleSemanticTrigger = {
  semantic_key?: never
  semantic_keys: string[]
  conditions?: CounterConditions
  any_of?: never
}

type AnyOfEventTrigger = {
  semantic_key?: never
  semantic_keys?: never
  conditions?: never
  any_of: CounterEventTriggerClause[]
}

export type CounterEventTrigger =
  | SingleSemanticTrigger
  | MultipleSemanticTrigger
  | AnyOfEventTrigger

export type CounterTriggerMode = 'shared' | 'anyOf'

export type CounterEventTriggerClauseDraft = {
  semanticKey: string
  conditionsText: string
}

export type CounterEventTriggerDraft = {
  mode: CounterTriggerMode
  semanticKeys: string[]
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
      semanticKeys: [],
      conditionsText: '',
      clauses: trigger.any_of.map((clause) => ({
        semanticKey: clause.semantic_key,
        conditionsText: conditionsText(clause.conditions),
      })),
    }
  }

  const semanticKeys = trigger && 'semantic_keys' in trigger && Array.isArray(trigger.semantic_keys)
    ? [...trigger.semantic_keys]
    : trigger && 'semantic_key' in trigger && typeof trigger.semantic_key === 'string'
      ? [trigger.semantic_key]
      : []

  return {
    mode: 'shared',
    semanticKeys,
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
    const semanticKeys = [...new Set(draft.semanticKeys.map((item) => item.trim()).filter(Boolean))]
    if (semanticKeys.length > maxClauses) return { error: 'tooManyEventTypes' }

    const conditions = parseConditions(draft.conditionsText)
    if (conditions === 'invalid') return { error: 'invalidConditions' }
    if (conditions && semanticKeys.length === 0) return { error: 'eventTypeRequired' }
    if (semanticKeys.length === 0) return {}

    const eventSelector = semanticKeys.length === 1
      ? { semantic_key: semanticKeys[0]! }
      : { semantic_keys: semanticKeys }
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
    const semanticKey = clause.semanticKey.trim()
    const hasConditionsText = Boolean(clause.conditionsText.trim())
    if (!semanticKey) {
      if (draft.clauses.length === 1 && !hasConditionsText) return {}
      return { error: 'clauseEventTypeRequired', clauseIndex }
    }

    const conditions = parseConditions(clause.conditionsText)
    if (conditions === 'invalid') return { error: 'invalidClauseConditions', clauseIndex }
    const normalizedClause: CounterEventTriggerClause = {
      semantic_key: semanticKey,
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
