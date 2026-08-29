import { describe, expect, it } from 'vitest'
import source from './SemanticDictionary.vue?raw'

describe('SemanticDictionary dependency recovery', () => {
  it('explains how to recover when active metrics still depend on a meaning', () => {
    expect(source).toContain('SEMANTIC_DEFINITION_IN_USE')
    expect(source).toContain("t('semantics.errors.inUse')")
    expect(source).toContain('semanticErrorMessage(error')
  })
})
