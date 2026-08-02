import { describe, expect, it } from 'vitest'
import { shouldAttachStoredAdminToken } from './adminToken'

describe('admin token header policy', () => {
  it('uses storage only when a request has no explicit credential', () => {
    expect(shouldAttachStoredAdminToken('stored-token', undefined)).toBe(true)
  })

  it('never overwrites the token entered by the current login attempt', () => {
    expect(shouldAttachStoredAdminToken('stale-token', 'new-token')).toBe(false)
  })

  it('does not create an empty authentication header', () => {
    expect(shouldAttachStoredAdminToken(null, undefined)).toBe(false)
  })
})
