import { describe, expect, it } from 'vitest'
import { buildUserJourneyQuery, journeyWindowOption } from './userJourney'

describe('user journey window', () => {
  it('uses the selected event as the anchor and translates the two-hour window symmetrically', () => {
    expect(buildUserJourneyQuery({
      projectId: 'sample_project',
      anchorEventId: 'evt_anchor',
      window: 'twoHours',
    })).toEqual({
      projectId: 'sample_project',
      anchorEventId: 'evt_anchor',
      beforeMinutes: 60,
      afterMinutes: 60,
    })
  })

  it('keeps the longest preset within the backend seven-day boundary', () => {
    const window = journeyWindowOption('week')
    expect(window.beforeMinutes + window.afterMinutes).toBe(7 * 24 * 60)
  })
})
