import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EventJourney, EventRecord } from '@/api/metrics'

const { getEventJourney, getEventProperties } = vi.hoisted(() => ({
  getEventJourney: vi.fn(),
  getEventProperties: vi.fn(),
}))

vi.mock('@/api/metrics', () => ({
  getEventJourney,
  getEventProperties,
}))

import { useUserJourney } from './useUserJourney'

const anchor: EventRecord = {
  eventId: 'evt-anchor',
  eventType: 'content_created',
  eventTimestamp: 1,
  createdAt: '2026-08-23T00:00:00Z',
  deviceId: '11111111-1111-4111-8111-111111111111',
  userId: null,
  resolvedActorId: null,
  identityScope: 'anonymous',
  actorLinked: false,
  sessionId: null,
  properties: null,
}

const journey: EventJourney = {
  projectId: 'sample_project',
  anchorEventId: anchor.eventId,
  subjectType: 'device',
  resolvedActorId: null,
  rangeStart: '2026-08-22T23:00:00Z',
  rangeEnd: '2026-08-23T01:00:00Z',
  total: 1,
  truncated: false,
  items: [{ ...anchor, propertiesBytes: 20, propertiesLoadable: true, propertiesDeferred: true }],
}

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((resolver) => { resolve = resolver })
  return { promise, resolve }
}

describe('useUserJourney', () => {
  beforeEach(() => {
    getEventJourney.mockReset()
    getEventProperties.mockReset()
  })

  it('keeps one anchor lifecycle and loads its default two-hour window', async () => {
    getEventJourney.mockResolvedValue({ data: { data: journey } })
    const state = useUserJourney({ projectId: () => 'sample_project', onLoadFailure: vi.fn() })

    state.open(anchor)
    await vi.waitFor(() => expect(state.loading.value).toBe(false))

    expect(getEventJourney).toHaveBeenCalledWith({
      projectId: 'sample_project',
      anchorEventId: anchor.eventId,
      beforeMinutes: 60,
      afterMinutes: 60,
    })
    expect(state.journey.value).toEqual(journey)
  })

  it('discards a journey response after the drawer closes', async () => {
    const pending = deferred<{ data: { data: EventJourney } }>()
    getEventJourney.mockReturnValue(pending.promise)
    const state = useUserJourney({ projectId: () => 'sample_project', onLoadFailure: vi.fn() })

    state.open(anchor)
    state.setVisible(false)
    pending.resolve({ data: { data: journey } })
    await pending.promise
    await Promise.resolve()

    expect(state.visible.value).toBe(false)
    expect(state.journey.value).toBeNull()
  })

  it('loads deferred properties only into the current journey', async () => {
    getEventJourney.mockResolvedValue({ data: { data: journey } })
    getEventProperties.mockResolvedValue({ data: { data: { properties: { entry_point: 'compose' } } } })
    const state = useUserJourney({ projectId: () => 'sample_project', onLoadFailure: vi.fn() })
    state.open(anchor)
    await vi.waitFor(() => expect(state.journey.value).not.toBeNull())

    await state.loadProperties(anchor.eventId)

    expect(state.journey.value?.items[0]?.properties).toEqual({ entry_point: 'compose' })
    expect(state.journey.value?.items[0]?.propertiesDeferred).toBe(false)
    expect(state.propertiesLoadingEventIds.value).toEqual([])
  })
})
