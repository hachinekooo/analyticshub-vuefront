import { describe, expect, it } from 'vitest'
import { buildEventRecordQuery } from './eventRecordQuery'

describe('event record query', () => {
  it('forwards the resolved actor only to the event journey query', () => {
    expect(buildEventRecordQuery({
      projectId: 'demo_app',
      page: 2,
      pageSize: 20,
      eventType: '',
      userId: '',
      resolvedActorId: '22222222-2222-4222-8222-222222222222',
      deviceId: '',
      from: '2026-08-01T00:00:00Z',
      to: '2026-08-22T00:00:00Z',
    })).toEqual({
      projectId: 'demo_app',
      page: 2,
      pageSize: 20,
      resolvedActorId: '22222222-2222-4222-8222-222222222222',
      from: '2026-08-01T00:00:00Z',
      to: '2026-08-22T00:00:00Z',
    })
  })
})
