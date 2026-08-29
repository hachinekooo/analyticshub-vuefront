import type { AnalyticsPropertyFilter } from '@/api/metrics'
import type { TrustedSchemaPolicy } from '@/api/semantic'

export const trustedSchemaFilter = (policy: TrustedSchemaPolicy): AnalyticsPropertyFilter => ({
  propertyKey: policy.propertyKey,
  operator: policy.trustedValues.length === 1 ? 'EQ' : 'IN',
  values: [...policy.trustedValues],
})

export const trustedSchemaScopeValues = (
  serializedFilters: string,
  policy: TrustedSchemaPolicy | null,
): string[] | null => {
  if (!policy || !serializedFilters) return null
  try {
    const filters = JSON.parse(serializedFilters) as AnalyticsPropertyFilter[]
    const scope = filters.find(filter => filter.propertyKey === policy.propertyKey
      && ['EQ', 'IN'].includes(filter.operator)
      && filter.values.length > 0
      && filter.values.every(value => policy.trustedValues.includes(value)))
    return scope ? [...scope.values] : null
  } catch {
    return null
  }
}

export const includesTrustedSchemaScope = (
  serializedFilters: string,
  policy: TrustedSchemaPolicy | null,
) => trustedSchemaScopeValues(serializedFilters, policy) !== null
