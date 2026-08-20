import { describe, expect, it } from 'vitest'
import { uniqueSemanticEvents } from './semanticEventPresentation'

describe('uniqueSemanticEvents', () => {
  it('keeps the first presentation for each event key in page order', () => {
    const first = { eventKey: 'letter_saved', description: '保存信件' }
    const second = { eventKey: 'paywall_opened', description: '打开付费墙' }

    expect(uniqueSemanticEvents([first, first, second])).toEqual([first, second])
  })
})
