import type { CounterHistoryMode, CounterUpsertPayload } from '@/api/metrics'

export type CounterSavePolicyInput = {
  isEditing: boolean
  hasEventRule: boolean
  ruleChanged: boolean
  value: number
  originalValue: number
  historyMode: CounterHistoryMode
  originalHistoryMode: CounterHistoryMode
  rebuildOffset: number
  originalRebuildOffset: number
  lastRebuiltAt: string | null
}

type CounterPolicyPatch = Pick<CounterUpsertPayload, 'value' | 'historyMode' | 'rebuildOffset'>

export type CounterSavePolicy = {
  patch: CounterPolicyPatch
  shouldRebuild: boolean
}

/**
 * Keeps the save flow deterministic: automatic counters persist their counting
 * policy and rebuild only when the effective total may have changed.
 */
export const resolveCounterSavePolicy = (input: CounterSavePolicyInput): CounterSavePolicy => {
  const patch: CounterPolicyPatch = {}
  const policyChanged = input.historyMode !== input.originalHistoryMode
    || input.rebuildOffset !== input.originalRebuildOffset

  if (input.hasEventRule) {
    if (!input.isEditing || input.rebuildOffset !== input.originalRebuildOffset) {
      patch.rebuildOffset = input.rebuildOffset
    }
    if (!input.isEditing || input.historyMode !== input.originalHistoryMode) {
      patch.historyMode = input.historyMode
    }
    if (!input.isEditing) patch.value = input.rebuildOffset
  } else if (!input.isEditing || input.value !== input.originalValue) {
    patch.value = input.value
  }

  return {
    patch,
    shouldRebuild: input.hasEventRule
      && (!input.isEditing || input.ruleChanged || policyChanged || !input.lastRebuiltAt),
  }
}
