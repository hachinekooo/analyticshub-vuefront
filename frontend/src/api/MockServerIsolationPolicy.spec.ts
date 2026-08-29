/// <reference types="node" />

import { spawn, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import source from '../../scripts/mock-server.mjs?raw'

const port = 43000 + (process.pid % 1000)
const origin = `http://127.0.0.1:${port}/analyticshub/api`
let mockProcess: ChildProcess

const request = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${origin}${path}`, init)
  return { response, payload: await response.json() }
}

beforeAll(async () => {
  mockProcess = spawn(process.execPath, [
    path.resolve(process.cwd(), 'scripts/mock-server.mjs'),
  ], {
    env: { ...process.env, ANALYTICSHUB_MOCK_PORT: String(port) },
    stdio: 'ignore',
  })
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      if ((await request('/admin/projects')).response.ok) return
    } catch {
      await new Promise(resolve => setTimeout(resolve, 20))
    }
  }
  throw new Error('Mock server did not become ready')
})

afterAll(() => mockProcess?.kill())

describe('mock server analytics contracts', () => {
  it('keeps event catalog and top-event facts project-scoped', async () => {
    const catalog = await request('/admin/projects/demo_marketing/event-catalog')
    const topEvents = await request('/admin/metrics/top-events?projectId=demo_marketing')

    expect(catalog.response.ok).toBe(true)
    expect(catalog.payload.data.items).toEqual([])
    expect(topEvents.response.ok).toBe(true)
    expect(topEvents.payload.data.items).toEqual([])
  })

  it('applies governed property filters and rejects invalid values', async () => {
    const advancedFilter = encodeURIComponent(JSON.stringify([
      { propertyKey: 'workflow_mode', operator: 'EQ', values: ['advanced'] },
    ]))
    const filtered = await request(`/admin/metrics/overview?projectId=demo_product&propertyFilters=${advancedFilter}`)
    expect(filtered.response.ok).toBe(true)
    expect(filtered.payload.data.eventsTotal).toBe(1)
    expect(filtered.payload.data.availableMetricKeys).toEqual([
      'system.active_devices',
      'system.active_actors',
      'system.event_occurrences',
      'system.top_active_app_version',
    ])

    const trends = await request('/admin/metrics/trends?projectId=demo_product')
    expect(trends.payload.data.availableMetricKeys).toEqual([
      'system.active_actors',
      'system.active_devices',
    ])

    const invalidFilter = encodeURIComponent(JSON.stringify([
      { propertyKey: 'event_schema_version', operator: 'EQ', values: ['2'] },
    ]))
    const rejected = await request(`/admin/metrics/top-events?projectId=demo_product&propertyFilters=${invalidFilter}`)
    expect(rejected.response.status).toBe(400)
    expect(rejected.payload.error.code).toBe('INVALID_ANALYTICS_PROPERTY_FILTER')

    const nativeTypeFilter = encodeURIComponent(JSON.stringify([
      { propertyKey: 'workflow_mode', operator: 'EQ', values: ['3'] },
    ]))
    const typeMismatch = await request(`/admin/metrics/overview?projectId=demo_product&propertyFilters=${nativeTypeFilter}`)
    expect(typeMismatch.payload.data.eventsTotal).toBe(0)

    const emptyWindow = await request('/admin/metrics/overview?projectId=demo_product&from=2099-01-01T00:00:00Z&to=2099-01-02T00:00:00Z')
    expect(emptyWindow.payload.data.eventsTotal).toBe(0)
  })

  it('returns the metric-type-specific result contract', async () => {
    const metric = await request('/admin/projects/demo_product/metric-results/engagement.active_actors')
    expect(metric.response.ok).toBe(true)
    expect(metric.payload.data.metricType).toBe('UNIQUE_ACTORS')
    expect(metric.payload.data.resultClassification).toBe('UNGOVERNED_DIAGNOSTIC')
    expect(metric.payload.data.diagnosticReason).toBeNull()
    expect(metric.payload.data.result).toEqual({ actors: 0 })
    expect(metric.payload.data.result).not.toHaveProperty('value')

    const eventCount = await request('/admin/projects/demo_product/metrics/content.count', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Recent content count' },
        metricType: 'EVENT_COUNT',
        definition: {
          semanticEvent: 'content.completed',
          schemaScope: 'CROSS_VERSION_VERIFIED',
          schemaScopeReason: 'Default-window contract fixture.',
        },
        description: null,
        active: true,
      }),
    })
    expect(eventCount.response.ok).toBe(true)
    const eventCountResult = await request('/admin/projects/demo_product/metric-results/content.count')
    expect(eventCountResult.payload.data.result).toEqual({ occurrences: 4 })
    expect(eventCountResult.payload.data.resultClassification).toBe('CROSS_VERSION_DIAGNOSTIC')
    expect(eventCountResult.payload.data.diagnosticReason).toBe('Default-window contract fixture.')

    const created = await request('/admin/projects/demo_product/metrics/conversion.content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Content conversion' },
        metricType: 'FUNNEL_CONVERSION',
        definition: {
          steps: ['content.completed', 'content.shared'],
          groupBy: 'workflow_mode',
          journeyKey: 'analysis_flow_id',
          schemaScope: 'CROSS_VERSION_VERIFIED',
          schemaScopeReason: 'Mock fixture intentionally verifies cross-version semantics.',
        },
        description: null,
        active: true,
      }),
    })
    expect(created.response.ok).toBe(true)
    const funnel = await request('/admin/projects/demo_product/metric-results/conversion.content')
    expect(funnel.payload.data.result).toEqual(expect.objectContaining({
      groupBy: 'workflow_mode',
      journeyKey: 'analysis_flow_id',
      countingUnit: 'journeys',
      attributionModel: 'first_touch_journey',
      groups: [
        {
          groupValue: 'advanced',
          steps: [
            { stepIndex: 1, eventType: 'content.completed', users: 1, conversionRate: 1, dropOffRate: 0 },
            { stepIndex: 2, eventType: 'content.shared', users: 1, conversionRate: 1, dropOffRate: 0 },
          ],
        },
        {
          groupValue: 'quick',
          steps: [
            { stepIndex: 1, eventType: 'content.completed', users: 2, conversionRate: 1, dropOffRate: 0 },
            { stepIndex: 2, eventType: 'content.shared', users: 2, conversionRate: 1, dropOffRate: 0 },
          ],
        },
      ],
    }))

    const duplicateSteps = await request('/admin/projects/demo_product/metrics/invalid.duplicate-steps', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Invalid duplicate steps' },
        metricType: 'FUNNEL_CONVERSION',
        definition: { steps: ['content.completed', ' content.completed '] },
        description: null,
        active: true,
      }),
    })
    expect(duplicateSteps.response.status).toBe(400)
    expect(duplicateSteps.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const blankGroupBy = await request('/admin/projects/demo_product/metrics/invalid.blank-group', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Invalid blank group' },
        metricType: 'FUNNEL_CONVERSION',
        definition: { steps: ['content.completed', 'content.shared'], groupBy: '' },
        description: null,
        active: true,
      }),
    })
    expect(blankGroupBy.response.status).toBe(400)
    expect(blankGroupBy.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const paddedGroupBy = await request('/admin/projects/demo_product/metrics/invalid.padded-group', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Invalid padded group' },
        metricType: 'FUNNEL_CONVERSION',
        definition: { steps: ['content.completed', 'content.shared'], groupBy: ' workflow_mode ' },
        description: null,
        active: true,
      }),
    })
    expect(paddedGroupBy.response.status).toBe(400)
    expect(paddedGroupBy.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const invalidInteractiveGroup = await request('/admin/analytics/funnel?projectId=demo_product&steps=content.completed,content.shared&groupBy=unknown_dimension')
    expect(invalidInteractiveGroup.response.status).toBe(400)
    expect(invalidInteractiveGroup.payload.error.code).toBe('INVALID_ANALYTICS_PROPERTY_FILTER')

    const retentionCreated = await request('/admin/projects/demo_product/metrics/retention.content', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Content retention' },
        metricType: 'RETENTION',
        definition: {
          cohortEvent: 'content.completed',
          returnEvent: 'content.shared',
          days: [0],
          schemaScope: 'CROSS_VERSION_VERIFIED',
          schemaScopeReason: 'Mock fixture intentionally verifies cross-version semantics.',
        },
        description: null,
        active: true,
      }),
    })
    expect(retentionCreated.response.ok).toBe(true)
    const retention = await request('/admin/projects/demo_product/metric-results/retention.content')
    expect(retention.payload.data.result).toEqual(expect.objectContaining({
      observationComplete: false,
      cohortUsers: 4,
      buckets: [{ day: 0, eligibleUsers: 1, retainedUsers: 1, retentionRate: 1 }],
    }))

    const invalidSemantic = await request('/admin/projects/demo_product/metrics/invalid.semantic', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Invalid semantic' },
        metricType: 'EVENT_COUNT',
        definition: { semanticEvent: 'missing.semantic' },
        description: null,
        active: true,
      }),
    })
    expect(invalidSemantic.response.status).toBe(400)
    expect(invalidSemantic.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const invalidFilter = await request('/admin/projects/demo_product/metrics/invalid.filter', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Invalid filter' },
        metricType: 'EVENT_COUNT',
        definition: {
          semanticEvent: 'content.completed',
          propertyFilters: [{ propertyKey: 'workflow_mode', operator: 'EQ', values: ['not-allowed'] }],
        },
        description: null,
        active: true,
      }),
    })
    expect(invalidFilter.response.status).toBe(400)
    expect(invalidFilter.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const emptyAliasSemantic = await request('/admin/projects/demo_product/semantics/content_created', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceKind: 'EVENT_TYPE',
        displayName: { en: 'Empty alias semantic' },
        category: 'contract_test',
        description: null,
        isActive: true,
        aliasMode: 'REPLACE',
        aliases: [],
      }),
    })
    expect(emptyAliasSemantic.response.ok).toBe(true)
    const emptyAliasMetric = await request('/admin/projects/demo_product/metrics/empty.alias', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Empty alias count' },
        metricType: 'EVENT_COUNT',
        definition: {
          semanticEvent: 'content_created',
          schemaScope: 'CROSS_VERSION_VERIFIED',
          schemaScopeReason: 'Zero-alias semantic behavior is schema-independent in this fixture.',
        },
        description: null,
        active: true,
      }),
    })
    expect(emptyAliasMetric.response.ok).toBe(true)
    const emptyAliasResult = await request('/admin/projects/demo_product/metric-results/empty.alias')
    expect(emptyAliasResult.payload.data.result).toEqual({ occurrences: 0 })
  })

  it('keeps same-version Pack retries idempotent without duplicating history', () => {
    expect(source).toContain('displayNameFingerprint')
    expect(source).toContain('body.packVersion === existingPack.packVersion')
    expect(source).toContain('updatedAt: existingPack.updatedAt')
  })

  it('enforces Pack ownership and retains removed definitions as inactive', async () => {
    const packPath = '/admin/projects/demo_product/analysis-packs/mock_governance'
    const propertyPath = '/admin/projects/demo_product/properties/governed_flow_id'
    const property = {
      propertyKey: 'governed_flow_id',
      displayName: { en: 'Governed flow ID' },
      dataType: 'STRING',
      description: null,
      allowedValues: [],
      filterable: true,
      groupable: false,
      journeyKey: true,
      sensitive: false,
      active: true,
    }
    const putJson = (body: unknown) => ({
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const imported = await request(packPath, putJson({
      packVersion: 1,
      displayName: { en: 'Mock governance' },
      manifest: { schemaVersion: 1, properties: [property], metrics: [] },
      confirmDeactivations: false,
    }))
    expect(imported.response.ok).toBe(true)

    const managedWrite = await request(propertyPath, putJson(property))
    expect(managedWrite.response.status).toBe(409)
    expect(managedWrite.payload.error.code).toBe('ANALYSIS_PACK_DEFINITION_MANAGED')

    const replaced = await request(packPath, putJson({
      packVersion: 2,
      displayName: { en: 'Mock governance' },
      manifest: { schemaVersion: 1, properties: [], metrics: [] },
      confirmDeactivations: true,
    }))
    expect(replaced.response.ok).toBe(true)

    const properties = await request('/admin/projects/demo_product/properties')
    expect(properties.payload.data.items).toContainEqual(expect.objectContaining({
      propertyKey: 'governed_flow_id',
      active: false,
    }))
  })

  it('rejects property keys outside the production contract', async () => {
    const rejected = await request('/admin/projects/demo_product/properties/bad%20key', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Invalid property' },
        dataType: 'STRING',
        description: null,
        allowedValues: null,
        filterable: true,
        groupable: false,
        journeyKey: false,
        sensitive: false,
        active: true,
      }),
    })
    expect(rejected.response.status).toBe(400)
    expect(rejected.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')
  })

  it('stores normalized allowed values like the production service', async () => {
    const fixtureProject = 'normalization_fixture'
    const directPath = `/admin/projects/${fixtureProject}/properties/normalized_direct`
    const direct = await request(directPath, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Normalized direct property' },
        dataType: 'STRING',
        description: null,
        allowedValues: [' 3 '],
        filterable: true,
        groupable: false,
        journeyKey: false,
        sensitive: false,
        active: true,
      }),
    })
    expect(direct.response.ok).toBe(true)
    expect(direct.payload.data.allowedValues).toEqual(['3'])

    const integer = await request(`/admin/projects/${fixtureProject}/properties/normalized_integer`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Normalized integer property' }, dataType: 'INTEGER', description: null,
        allowedValues: ['001'], filterable: true, groupable: false, journeyKey: false,
        sensitive: false, active: true,
      }),
    })
    expect(integer.payload.data.allowedValues).toEqual(['1'])

    const number = await request(`/admin/projects/${fixtureProject}/properties/normalized_number`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: { en: 'Normalized number property' }, dataType: 'NUMBER', description: null,
        allowedValues: ['1.00', '1e-3'], filterable: true, groupable: false, journeyKey: false,
        sensitive: false, active: true,
      }),
    })
    expect(number.payload.data.allowedValues).toEqual(['1', '0.001'])

    const pack = await request(`/admin/projects/${fixtureProject}/analysis-packs/normalized_pack`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packVersion: 1,
        displayName: { en: 'Normalized Pack' },
        manifest: {
          schemaVersion: 1,
          trustedSchemaPolicy: { propertyKey: 'normalized_pack_schema', trustedValues: ['3'] },
          properties: [{
            propertyKey: 'normalized_pack_schema',
            displayName: { en: 'Normalized Pack schema' },
            dataType: 'STRING',
            description: null,
            allowedValues: [' 3 '],
            filterable: true,
            groupable: false,
            journeyKey: false,
            sensitive: false,
            active: true,
          }],
          metrics: [],
        },
      }),
    })
    expect(pack.response.ok, JSON.stringify(pack.payload)).toBe(true)
    const properties = await request(`/admin/projects/${fixtureProject}/properties`)
    expect(properties.payload.data.items).toContainEqual(expect.objectContaining({
      propertyKey: 'normalized_pack_schema',
      allowedValues: ['3'],
    }))
  })

  it('rejects schema scope contracts that the production service rejects', async () => {
    const fixtureProject = 'schema_scope_fixture'
    const putJson = (body: unknown) => ({
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const semantic = await request(
      `/admin/projects/${fixtureProject}/semantics/app.opened`,
      putJson({
        sourceKind: 'EVENT_TYPE', displayName: { en: 'App opened' }, category: null,
        description: null, isActive: true, aliasMode: 'REPLACE', aliases: ['app_opened'],
      }),
    )
    expect(semantic.response.ok).toBe(true)
    const unauditedScope = await request(
      `/admin/projects/${fixtureProject}/metrics/unaudited.scope`,
      putJson({
        displayName: { en: 'Unaudited scope' }, metricType: 'EVENT_COUNT',
        definition: { semanticEvent: 'app.opened', schemaScope: 'CROSS_VERSION_VERIFIED' },
        description: null, active: true,
      }),
    )
    expect(unauditedScope.response.status).toBe(400)
    expect(unauditedScope.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')
    const pack = await request(
      `/admin/projects/${fixtureProject}/analysis-packs/schema_policy`,
      putJson({
        packVersion: 1,
        displayName: { en: 'Schema policy' },
        manifest: {
          schemaVersion: 1,
          trustedSchemaPolicy: { propertyKey: 'event_schema_version', trustedValues: ['3'] },
          properties: [{
            propertyKey: 'event_schema_version', displayName: { en: 'Event schema version' },
            dataType: 'STRING', description: null, allowedValues: ['3'], filterable: true,
            groupable: false, journeyKey: false, sensitive: false, active: true,
          }],
          metrics: [],
        },
      }),
    )
    expect(pack.response.ok).toBe(true)
    const baseMetric = {
      displayName: { en: 'Invalid scope metric' }, metricType: 'EVENT_COUNT',
      description: null, active: true,
    }
    const trustedFilter = [{
      propertyKey: 'event_schema_version', operator: 'EQ', values: ['3'],
    }]
    const invalidScope = await request(
      `/admin/projects/${fixtureProject}/metrics/invalid.scope`,
      putJson({
        ...baseMetric,
        definition: { semanticEvent: 'app.opened', propertyFilters: trustedFilter, schemaScope: 'anything' },
      }),
    )
    expect(invalidScope.response.status).toBe(400)
    expect(invalidScope.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const orphanedReason = await request(
      `/admin/projects/${fixtureProject}/metrics/invalid.reason`,
      putJson({
        ...baseMetric,
        definition: {
          semanticEvent: 'app.opened', propertyFilters: trustedFilter,
          schemaScopeReason: 'Reason without a scope',
        },
      }),
    )
    expect(orphanedReason.response.status).toBe(400)
    expect(orphanedReason.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')
  })

  it('preserves semantic and property dependencies like the production service', async () => {
    const fixtureProject = 'dependency_fixture'
    const putJson = (body: unknown) => ({
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const semanticPath = `/admin/projects/${fixtureProject}/semantics/content.completed`
    expect((await request(semanticPath, putJson({
      sourceKind: 'EVENT_TYPE', displayName: { en: 'Content completed' }, category: null,
      description: null, isActive: true, aliasMode: 'REPLACE', aliases: ['content_completed', 'content_finished'],
    }))).response.ok).toBe(true)
    const propertyPath = `/admin/projects/${fixtureProject}/properties/workflow_mode`
    const property = {
      displayName: { en: 'Workflow mode' }, dataType: 'STRING', description: null,
      allowedValues: ['quick', 'advanced'], filterable: true, groupable: true,
      journeyKey: false, sensitive: false, active: true,
    }
    expect((await request(propertyPath, putJson(property))).response.ok).toBe(true)
    expect((await request(
      `/admin/projects/${fixtureProject}/metrics/content.by_mode`,
      putJson({
        displayName: { en: 'Content by mode' }, metricType: 'EVENT_COUNT',
        definition: {
          semanticEvent: 'content.completed',
          propertyFilters: [{ propertyKey: 'workflow_mode', operator: 'EQ', values: ['quick'] }],
        },
        description: null, active: true,
      }),
    )).response.ok).toBe(true)
    expect((await request(
      `/admin/projects/${fixtureProject}/dashboards/content_flow`,
      putJson({
        displayName: { en: 'Content flow' }, description: null, schemaVersion: 1,
        definition: { widgets: [{ type: 'core.productFunnel', config: {
          steps: ['content.completed'], groupBy: 'workflow_mode',
        } }] },
        isDefault: false, isActive: true,
      }),
    )).response.ok).toBe(true)

    const reorderedAliases = await request(semanticPath, putJson({
      sourceKind: 'EVENT_TYPE', displayName: { en: 'Content completed' }, category: null,
      description: null, isActive: true, aliasMode: 'REPLACE', aliases: ['content_finished', 'content_completed'],
    }))
    expect(reorderedAliases.response.ok).toBe(true)

    const duplicateAliases = await request(semanticPath, putJson({
      sourceKind: 'EVENT_TYPE', displayName: { en: 'Content completed' }, category: null,
      description: null, isActive: true, aliasMode: 'REPLACE', aliases: ['content_completed', 'content_completed'],
    }))
    expect(duplicateAliases.response.status).toBe(400)
    expect(duplicateAliases.payload.error.code).toBe('INVALID_SEMANTIC_DEFINITION')

    const deletedSemantic = await request(semanticPath, { method: 'DELETE' })
    expect(deletedSemantic.response.status).toBe(409)
    expect(deletedSemantic.payload.error.code).toBe('SEMANTIC_DEFINITION_IN_USE')
    expect(deletedSemantic.payload.error.details).toEqual({
      metricKeys: ['content.by_mode'], dashboardKeys: ['content_flow'],
    })

    const changedAliases = await request(semanticPath, putJson({
      sourceKind: 'EVENT_TYPE', displayName: { en: 'Content completed' }, category: null,
      description: null, isActive: true, aliasMode: 'REPLACE', aliases: ['content_finished'],
    }))
    expect(changedAliases.response.status).toBe(409)
    expect(changedAliases.payload.error.code).toBe('SEMANTIC_DEFINITION_IN_USE')

    const disabledProperty = await request(propertyPath, putJson({ ...property, active: false }))
    expect(disabledProperty.response.status).toBe(409)
    expect(disabledProperty.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')
    expect(disabledProperty.payload.error.details).toEqual({
      metricKeys: ['content.by_mode'], dashboardKeys: ['content_flow'],
    })
  })

  it('rolls back external property updates that would invalidate a Pack trusted policy', async () => {
    const fixtureProject = 'external_policy_fixture'
    const putJson = (body: unknown) => ({
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const propertyPath = `/admin/projects/${fixtureProject}/properties/event_schema_version`
    const property = {
      displayName: { en: 'Event schema version' }, dataType: 'STRING', description: null,
      allowedValues: ['3'], filterable: true, groupable: false, journeyKey: false,
      sensitive: false, active: true,
    }
    expect((await request(propertyPath, putJson(property))).response.ok).toBe(true)
    const pack = await request(
      `/admin/projects/${fixtureProject}/analysis-packs/external_policy`,
      putJson({
        packVersion: 1, displayName: { en: 'External policy' },
        manifest: {
          schemaVersion: 1,
          trustedSchemaPolicy: { propertyKey: 'event_schema_version', trustedValues: ['3'] },
          properties: [{
            propertyKey: 'pack_marker', displayName: { en: 'Pack marker' }, dataType: 'STRING',
            description: null, allowedValues: null, filterable: false, groupable: false,
            journeyKey: false, sensitive: false, active: true,
          }],
          metrics: [],
        },
      }),
    )
    expect(pack.response.ok).toBe(true)

    const rejected = await request(propertyPath, putJson({ ...property, allowedValues: ['4'] }))
    expect(rejected.response.status).toBe(409)
    expect(rejected.payload.error.code).toBe('ANALYSIS_PACK_TRUSTED_SCHEMA_CONFLICT')
    const properties = await request(`/admin/projects/${fixtureProject}/properties`)
    expect(properties.payload.data.items).toContainEqual(expect.objectContaining({
      propertyKey: 'event_schema_version', allowedValues: ['3'],
    }))
  })

  it('rejects Pack manifests without the supported schema boundary', async () => {
    const rejected = await request('/admin/projects/demo_product/analysis-packs/missing_schema', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packVersion: 1,
        displayName: { en: 'Missing schema' },
        manifest: { properties: [{ propertyKey: 'sample' }], metrics: [] },
      }),
    })
    expect(rejected.response.status).toBe(400)
    expect(rejected.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')
  })

  it('rejects invalid Analysis Pack envelope fields like the production API', async () => {
    const putJson = (body: unknown) => ({
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    const manifest = { schemaVersion: 1, properties: [], metrics: [] }
    const invalidVersion = await request(
      '/admin/projects/demo_product/analysis-packs/invalid_version',
      putJson({ packVersion: 0, displayName: { en: 'Invalid version' }, manifest }),
    )
    expect(invalidVersion.response.status).toBe(400)
    expect(invalidVersion.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const invalidDisplayName = await request(
      '/admin/projects/demo_product/analysis-packs/invalid_name',
      putJson({ packVersion: 1, displayName: { 'not a locale': 'Invalid name' }, manifest }),
    )
    expect(invalidDisplayName.response.status).toBe(400)
    expect(invalidDisplayName.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')
  })

  it('computes data quality from raw facts inside the selected range', async () => {
    const ungovernedQuality = await request('/admin/metrics/data-quality?projectId=demo_product')
    expect(Date.parse(ungovernedQuality.payload.data.to) - Date.parse(ungovernedQuality.payload.data.from))
      .toBeCloseTo(7 * 24 * 60 * 60 * 1000, -3)
    expect(ungovernedQuality.payload.data.trustedSchemaPolicyConfigured).toBe(false)
    expect(ungovernedQuality.payload.data.schemaVersionPropertyKey).toBeNull()
    expect(ungovernedQuality.payload.data.schemaVersions).toEqual({})
    expect(ungovernedQuality.payload.data.schemaVersionDistributionTruncated).toBe(false)

    const invalidPolicy = await request('/admin/projects/demo_product/analysis-packs/invalid_policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packVersion: 1,
        displayName: { en: 'Invalid policy' },
        manifest: {
          schemaVersion: 1,
          trustedSchemaPolicy: { propertyKey: 'numeric_schema', trustedValues: ['3'] },
          properties: [{
            propertyKey: 'numeric_schema',
            displayName: { en: 'Numeric schema' },
            dataType: 'NUMBER',
            allowedValues: ['3'],
            filterable: true,
            groupable: false,
            journeyKey: false,
            sensitive: false,
            active: true,
          }],
          metrics: [],
        },
      }),
    })
    expect(invalidPolicy.response.status).toBe(400)
    expect(invalidPolicy.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const policyPack = await request('/admin/projects/demo_product/analysis-packs/quality_policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packVersion: 1,
        displayName: { en: 'Quality policy' },
        manifest: {
          schemaVersion: 1,
          trustedSchemaPolicy: { propertyKey: 'event_schema_version', trustedValues: [' 3 '] },
          properties: [{
            propertyKey: 'event_schema_version',
            displayName: { en: 'Event schema version' },
            dataType: 'STRING',
            description: null,
            allowedValues: ['3'],
            filterable: true,
            groupable: false,
            journeyKey: false,
            sensitive: false,
            active: true,
          }],
          metrics: [],
        },
      }),
    })
    expect(policyPack.response.ok).toBe(true)

    const normalizedPolicy = await request('/admin/projects/demo_product/trusted-schema-policy')
    expect(normalizedPolicy.payload.data).toEqual({
      projectId: 'demo_product',
      propertyKey: 'event_schema_version',
      trustedValues: ['3'],
    })

    const quality = await request('/admin/metrics/data-quality?projectId=demo_product')
    expect(quality.payload.data.trustedSchemaPolicyConfigured).toBe(true)
    expect(quality.payload.data.schemaVersionDistributionTruncated).toBe(false)
    expect(quality.payload.data.schemaVersions).toEqual({ '2': 1, '3': 8 })
    expect(quality.payload.data.issues).toContainEqual(expect.objectContaining({ code: 'untrusted_schema_value', count: 1 }))
    expect(quality.payload.data.issues).toContainEqual(expect.objectContaining({ code: 'property_value_outside_allowlist', count: 1 }))
    expect(quality.payload.data.issues).not.toContainEqual(expect.objectContaining({ code: 'oversized_properties' }))

    const conflictingDefinition = await request('/admin/projects/demo_product/analysis-packs/conflicting_definition', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packVersion: 1,
        displayName: { en: 'Conflicting definition' },
        manifest: {
          schemaVersion: 1,
          properties: [{
            propertyKey: 'event_schema_version',
            displayName: { en: 'Duplicate schema version' },
            dataType: 'STRING',
            allowedValues: ['3'],
            filterable: true,
            groupable: false,
            journeyKey: false,
            sensitive: false,
            active: true,
          }],
          metrics: [],
        },
      }),
    })
    expect(conflictingDefinition.response.status).toBe(400)
    expect(conflictingDefinition.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const secondPolicy = await request('/admin/projects/demo_product/analysis-packs/second_policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packVersion: 1,
        displayName: { en: 'Second policy' },
        manifest: {
          schemaVersion: 1,
          trustedSchemaPolicy: { propertyKey: 'secondary_schema', trustedValues: ['stable'] },
          properties: [{
            propertyKey: 'secondary_schema',
            displayName: { en: 'Secondary schema' },
            dataType: 'STRING',
            allowedValues: ['stable'],
            filterable: true,
            groupable: false,
            journeyKey: false,
            sensitive: false,
            active: true,
          }],
          metrics: [],
        },
      }),
    })
    expect(secondPolicy.response.status).toBe(400)
    expect(secondPolicy.payload.error.code).toBe('INVALID_ANALYSIS_CONFIGURATION')

    const removedPolicy = await request('/admin/projects/demo_product/analysis-packs/quality_policy', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packVersion: 2,
        displayName: { en: 'Quality policy' },
        manifest: {
          schemaVersion: 1,
          properties: [{
            propertyKey: 'event_schema_version',
            displayName: { en: 'Event schema version' },
            dataType: 'STRING',
            description: null,
            allowedValues: ['3'],
            filterable: true,
            groupable: false,
            journeyKey: false,
            sensitive: false,
            active: true,
          }],
          metrics: [],
        },
        confirmDeactivations: true,
      }),
    })
    expect(removedPolicy.response.ok).toBe(true)

    const trustedPolicy = await request('/admin/projects/demo_product/trusted-schema-policy')
    expect(trustedPolicy.payload.data).toBeNull()

    const emptyRange = await request('/admin/metrics/data-quality?projectId=demo_product&from=2099-01-01T00:00:00Z&to=2099-01-02T00:00:00Z')
    expect(emptyRange.payload.data.totalEvents).toBe(0)
    expect(emptyRange.payload.data.schemaVersions).toEqual({})
  })
})
