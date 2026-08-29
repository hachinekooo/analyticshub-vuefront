import { describe, expect, it } from 'vitest'
import {
  includesTrustedSchemaScope,
  trustedSchemaFilter,
  trustedSchemaScopeValues,
} from './trustedAnalyticsScope'

const policy = {
  projectId: 'sample',
  propertyKey: 'event_schema_version',
  trustedValues: ['3', '4'],
}

describe('trusted analytics scope', () => {
  it('builds the default filter from every trusted contract version', () => {
    expect(trustedSchemaFilter(policy)).toEqual({
      propertyKey: 'event_schema_version',
      operator: 'IN',
      values: ['3', '4'],
    })
  })

  it('treats a non-empty trusted subset as governed and rejects mixed or invalid filters', () => {
    const trustedSubset = JSON.stringify([{
      propertyKey: 'event_schema_version', operator: 'EQ', values: ['3'],
    }])
    expect(includesTrustedSchemaScope(trustedSubset, policy)).toBe(true)
    expect(trustedSchemaScopeValues(trustedSubset, policy)).toEqual(['3'])
    expect(includesTrustedSchemaScope(JSON.stringify([{
      propertyKey: 'event_schema_version', operator: 'IN', values: ['3', '2'],
    }]), policy)).toBe(false)
    expect(includesTrustedSchemaScope('not-json', policy)).toBe(false)
  })
})
