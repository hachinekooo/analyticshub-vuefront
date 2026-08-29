import http from 'node:http'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const host = '127.0.0.1'
const port = Number(process.env.ANALYTICSHUB_MOCK_PORT || 4173)
const distRoot = fileURLToPath(new URL('../dist', import.meta.url))
const now = Date.now()
const iso = (offsetMs = 0) => new Date(now + offsetMs).toISOString()
const timestamp = (offsetMs = 0) => now + offsetMs
const maxEventPropertiesBytes = 32 * 1024

const projects = [
  {
    id: 1,
    projectId: 'demo_product',
    projectName: 'Demo Product',
    analysisTemplate: 'app',
    dbHost: 'postgres',
    dbPort: 5432,
    dbName: 'demo_product',
    dbSchema: 'analytics',
    dbUser: 'analytics_reader',
    tablePrefix: 'analytics_',
    isActive: true,
  },
  {
    id: 2,
    projectId: 'demo_marketing',
    projectName: 'Demo Marketing Site',
    analysisTemplate: 'website',
    dbHost: 'postgres',
    dbPort: 5432,
    dbName: 'demo_marketing',
    dbSchema: 'analytics',
    dbUser: 'analytics_reader',
    tablePrefix: 'analytics_',
    isActive: true,
  },
]

const eventRows = [
  ['evt-1001', 'content_created', 'user-001', 'device-ios-001', 'session-001', -5 * 60000, {
    workflow_mode: 'advanced',
    entry_point: 'theme_panel',
    content_style: {
      template_id: 'classic',
      selected_resources: ['premium_theme_01', 'transition_soft_light'],
    },
    trial_context: { grant_type: 'usage_count', remaining_before_save: 2 },
    analysis_flow_id: 'flow-1',
  }],
  ['evt-1002', 'content_shared', 'user-001', 'device-ios-001', 'session-001', -4 * 60000, { channel: 'image', analysis_flow_id: 'flow-1' }],
  ['evt-1003', 'subscription_viewed', 'user-002', 'device-ios-002', 'session-002', -50 * 60000, { placement: 'settings' }],
  ['evt-1004', 'content_completed_v2', 'user-003', 'device-ios-003', 'session-003', -2 * 3600000, { source: 'quick_action', payload_note: 'x'.repeat(25_000) }],
  ['evt-1005', 'app_opened', null, 'device-ios-004', 'session-004', -3 * 3600000, { coldStart: true }],
  ['evt-1006', 'content_created', 'user-004', 'device-ios-005', 'session-005', -2 * 86400000, { source: 'same_millisecond_fixture', workflow_mode: 'quick', analysis_flow_id: 'flow-2' }],
  ['evt-1007', 'content_shared', 'user-004', 'device-ios-005', 'session-005', -2 * 86400000, { source: 'same_millisecond_fixture', analysis_flow_id: 'flow-2' }],
  ['evt-1008', 'content_created', 'anonymous-user-005', 'device-ios-006', 'session-006', -30 * 60000, { workflow_mode: 'quick', analysis_flow_id: 'flow-3' }],
  ['evt-1009', 'content_shared', 'cloud-user-005', 'device-ios-006', 'session-006', -29 * 60000, { analysis_flow_id: 'flow-3' }],
  ['evt-1010', 'content_created', 'user-006', 'device-ios-007', 'session-007', -10 * 86400000, { workflow_mode: 'quick', analysis_flow_id: 'old-flow' }],
].map(([eventId, eventType, userId, deviceId, sessionId, offset, properties], index) => ({
  id: index + 1, eventId, eventType, userId, deviceId, sessionId,
  eventTimestamp: timestamp(offset),
  createdAt: iso(offset),
  properties: {
    event_schema_version: eventId === 'evt-1005' ? '2' : '3',
    app_version: eventId === 'evt-1005' ? '1.1.1' : '1.1.2',
    build_number: eventId === 'evt-1005' ? '111' : '112',
    distribution_environment: 'preview',
    backend_environment: 'development',
    ...(eventId === 'evt-1005' ? { workflow_mode: 3 } : {}),
    ...properties,
  },
}))
const eventRowsByProject = new Map([
  ['demo_product', eventRows],
  ['demo_marketing', []],
])
const eventRowsFor = (projectId) => eventRowsByProject.get(projectId) || []
const canonicalActorAliases = new Map([['anonymous-user-005', 'cloud-user-005']])
const canonicalActorFor = row => {
  const rawActor = row.userId || row.deviceId
  return rawActor ? (canonicalActorAliases.get(rawActor) || rawActor) : null
}

const trafficRows = {
  page_view: [
    ['pv-001', '/', 'direct', 'web-device-01', 'web-user-01', -3 * 60000],
    ['pv-002', '/features', '/', 'web-device-02', null, -12 * 60000],
    ['pv-003', '/pricing', 'https://search.example', 'web-device-03', 'web-user-03', -24 * 60000],
    ['pv-004', '/download', '/pricing', 'web-device-01', 'web-user-01', -31 * 60000],
    ['pv-005', '/docs/getting-started', '/features', 'web-device-04', null, -45 * 60000],
  ],
  screen_view: [
    ['sv-001', 'Home', null, 'device-ios-001', 'user-001', -2 * 60000],
    ['sv-002', 'Composer', 'Home', 'device-ios-001', 'user-001', -5 * 60000],
    ['sv-003', 'Archive', 'Home', 'device-ios-003', 'user-003', -21 * 60000],
    ['sv-004', 'Settings', 'Home', 'device-ios-002', 'user-002', -49 * 60000],
  ],
}

const devices = [
  ['device-ios-001', 'user-001', 'iPhone 17 Pro', '26.1', '1.0.1', false],
  ['device-ios-002', 'user-002', 'iPhone 16', '26.0', '1.0.1', false],
  ['device-ios-003', 'user-003', 'iPad Pro', '26.1', '1.0.0', false],
  ['device-ios-004', null, 'iPhone 15', '18.6', '1.0.0', true],
].map(([deviceId, userId, deviceModel, osVersion, appVersion, isBanned], index) => ({
  deviceId, userId, deviceModel, osVersion, appVersion, isBanned,
  apiKey: `mock-key-${index + 1}`,
  banReason: isBanned ? 'Demo risk review' : null,
  createdAt: iso(-(index + 4) * 86400000),
  lastActiveAt: iso(-index * 3600000),
}))

const sessions = devices.slice(0, 4).map((device, index) => ({
  sessionId: `session-00${index + 1}`,
  deviceId: device.deviceId,
  userId: device.userId,
  sessionStartTime: iso(-(index + 1) * 3600000),
  sessionDurationMs: [286000, 94000, 412000, 65000][index],
  deviceModel: device.deviceModel,
  osVersion: device.osVersion,
  appVersion: device.appVersion,
  buildNumber: '101',
  screenCount: [8, 4, 11, 3][index],
  eventCount: [13, 7, 18, 4][index],
  createdAt: iso(-(index + 1) * 3600000),
}))

const semanticState = new Map(projects.map((project) => [project.projectId, [
  {
    projectId: project.projectId,
    sourceKind: 'EVENT_TYPE',
    semanticKey: 'content.completed',
    displayName: { 'zh-CN': '内容完成', en: 'Content completed' },
    category: 'content',
    description: 'All event keys representing completed content.',
    isActive: true,
    aliases: ['content_created', 'content_completed_v2'],
    createdAt: iso(-10 * 86400000),
    updatedAt: iso(-3600000),
  },
  {
    projectId: project.projectId,
    sourceKind: 'EVENT_TYPE',
    semanticKey: 'content.shared',
    displayName: { 'zh-CN': '内容分享', en: 'Content shared' },
    category: 'content',
    description: 'Content export or share completed.',
    isActive: true,
    aliases: ['content_shared'],
    createdAt: iso(-9 * 86400000),
    updatedAt: iso(-7200000),
  },
  {
    projectId: project.projectId,
    sourceKind: 'EVENT_TYPE',
    semanticKey: 'app.opened',
    displayName: { 'zh-CN': '应用打开', en: 'App opened' },
    category: 'engagement',
    description: 'Application foreground entry.',
    isActive: true,
    aliases: ['app_opened'],
    createdAt: iso(-8 * 86400000),
    updatedAt: iso(-3600000),
  },
]]))

const analyticsProperties = new Map(projects.map((project) => [project.projectId, [{
  projectId: project.projectId,
  propertyKey: 'event_schema_version',
  displayName: { 'zh-CN': '事件协议版本', en: 'Event schema version' },
  dataType: 'STRING',
  description: 'Stable event contract version used by governed metrics.',
  allowedValues: ['3'],
  filterable: true,
  groupable: false,
  journeyKey: false,
  sensitive: false,
  active: true,
  createdAt: iso(-7 * 86400000),
  updatedAt: iso(-3600000),
}, {
  projectId: project.projectId,
  propertyKey: 'workflow_mode',
  displayName: { 'zh-CN': '工作模式', en: 'Workflow mode' },
  dataType: 'STRING',
  description: 'Generic demo dimension used to verify governed filtering.',
  allowedValues: ['advanced', 'quick', '3'],
  filterable: true,
  groupable: true,
  journeyKey: false,
  sensitive: false,
  active: true,
  createdAt: iso(-7 * 86400000),
  updatedAt: iso(-3600000),
}, {
  projectId: project.projectId,
  propertyKey: 'analysis_flow_id',
  displayName: { 'zh-CN': '分析旅程 ID', en: 'Analysis journey ID' },
  dataType: 'STRING',
  description: 'Generic journey identifier used to verify funnel linkage.',
  allowedValues: null,
  filterable: false,
  groupable: false,
  journeyKey: true,
  sensitive: false,
  active: true,
  createdAt: iso(-7 * 86400000),
  updatedAt: iso(-3600000),
}]]))

const analyticsMetrics = new Map(projects.map((project) => [project.projectId, [{
  projectId: project.projectId,
  metricKey: 'engagement.active_actors',
  displayName: { 'zh-CN': '活跃使用者', en: 'Active actors' },
  metricType: 'UNIQUE_ACTORS',
  definition: {
    semanticEvent: 'app.opened',
    propertyFilters: [{ propertyKey: 'event_schema_version', operator: 'EQ', values: ['3'] }],
  },
  description: 'Unique actors observed on the governed event contract.',
  active: true,
  createdAt: iso(-7 * 86400000),
  updatedAt: iso(-3600000),
}]]))
const analysisPacks = new Map(projects.map((project) => [project.projectId, new Map()]))

const normalizeMockTrustedPolicy = policy => policy == null ? null : ({
  propertyKey: policy.propertyKey,
  trustedValues: policy.trustedValues.map(value => value.trim()),
})

const trustedPolicyFor = (projectId, excludedPackKey = null) => [...(analysisPacks.get(projectId)?.entries() || [])]
  .filter(([packKey]) => packKey !== excludedPackKey)
  .map(([, pack]) => normalizeMockTrustedPolicy(pack.manifest?.trustedSchemaPolicy))
  .find(Boolean) || null

const metricMatchesTrustedPolicy = (metric, policy) => {
  if (!metric?.active || !policy) return true
  if (metric.definition?.schemaScope === 'CROSS_VERSION_VERIFIED'
      && String(metric.definition?.schemaScopeReason || '').trim().length >= 10) return true
  return (metric.definition?.propertyFilters || []).some(filter =>
    filter.propertyKey === policy.propertyKey
      && ['EQ', 'IN'].includes(filter.operator)
      && Array.isArray(filter.values)
      && filter.values.length > 0
      && filter.values.every(value => policy.trustedValues.includes(String(value).trim())))
}

const activeSemanticDependencies = (projectId, semanticKey) => {
  const metricKeys = (analyticsMetrics.get(projectId) || [])
    .filter(metric => metric.active)
    .filter(metric => {
      const definition = metric.definition || {}
      return definition.semanticEvent === semanticKey
        || definition.cohortEvent === semanticKey
        || definition.returnEvent === semanticKey
        || (Array.isArray(definition.steps) && definition.steps.includes(semanticKey))
    })
    .map(metric => metric.metricKey)
  const dashboardKeys = (dashboards.get(projectId) || [])
    .filter(dashboard => dashboard.isActive)
    .filter(dashboard => (dashboard.definition?.widgets || []).some(widget => {
      const config = widget.config || {}
      return (widget.type === 'core.productFunnel'
          && Array.isArray(config.steps) && config.steps.includes(semanticKey))
        || (widget.type === 'core.retention'
          && (config.cohortEvent === semanticKey || config.returnEvent === semanticKey))
    }))
    .map(dashboard => dashboard.dashboardKey)
  return { metricKeys, dashboardKeys }
}

const propertyDependencyConflict = (projectId, propertyKey, existing, next) => {
  if (!existing) return null
  const disabling = existing.active && !next.active
  const changesType = existing.dataType !== next.dataType
  const narrowsAllowedValues = Array.isArray(next.allowedValues)
    && (!Array.isArray(existing.allowedValues)
      || existing.allowedValues.some(value => !next.allowedValues.includes(value)))
  const checkFilter = disabling || (existing.filterable && !next.filterable) || changesType || narrowsAllowedValues
  const checkGroup = disabling || (existing.groupable && !next.groupable) || changesType
  const checkJourney = disabling || (existing.journeyKey && !next.journeyKey) || changesType
  if (!checkFilter && !checkGroup && !checkJourney) return null

  const metricKeys = (analyticsMetrics.get(projectId) || [])
    .filter(metric => metric.active)
    .filter(metric => {
      const definition = metric.definition || {}
      return (checkFilter && (definition.propertyFilters || []).some(filter => filter.propertyKey === propertyKey))
        || (checkGroup && definition.groupBy === propertyKey)
        || (checkJourney && definition.journeyKey === propertyKey)
    })
    .map(metric => metric.metricKey)
  const dashboardKeys = (dashboards.get(projectId) || [])
    .filter(dashboard => dashboard.isActive)
    .filter(dashboard => (dashboard.definition?.widgets || []).some(widget => {
      if (widget.type !== 'core.productFunnel') return false
      const config = widget.config || {}
      return (checkGroup && config.groupBy === propertyKey)
        || (checkJourney && config.journeyKey === propertyKey)
    }))
    .map(dashboard => dashboard.dashboardKey)
  return metricKeys.length || dashboardKeys.length ? { metricKeys, dashboardKeys } : null
}

const counters = new Map(projects.map((project) => [project.projectId, [
  {
    key: 'content_completed_total',
    value: 12846,
    displayName: { 'zh-CN': '累计完成内容', en: 'Content completed' },
    unit: { 'zh-CN': '项', en: 'items' },
    eventTrigger: { event_types: ['content_created', 'content_completed_v2'] },
    isPublic: true,
    description: 'Demo cumulative business milestone.',
    updatedAt: iso(-1800000),
    lastRebuiltAt: iso(-86400000),
    lastRebuildEventCount: 12820,
  },
  {
    key: 'shares_total',
    value: 3921,
    displayName: { 'zh-CN': '累计分享', en: 'Total shares' },
    unit: { 'zh-CN': '次', en: 'shares' },
    eventTrigger: { event_type: 'content_shared' },
    isPublic: false,
    description: 'Demo sharing counter.',
    updatedAt: iso(-3600000),
    lastRebuiltAt: null,
    lastRebuildEventCount: null,
  },
]]))

const privacyRequests = [
  {
    requestId: 'PRIV-20260802-001', projectId: 'demo_product', userId: 'user-002', deviceId: 'device-ios-002',
    requestType: 'EXPORT', processor: 'ANALYTICSHUB', status: 'SUBMITTED', contactEmail: 'customer@example.com',
    requestedAt: iso(-3 * 3600000), processedAt: null, closedAt: null, operator: null, version: 1,
    source: 'ios_app', requesterNote: 'Please provide a copy of my account data.', operatorNote: null,
    resultPayload: null, metadata: { appVersion: '1.0.1', locale: 'zh-CN' }, updatedAt: iso(-3 * 3600000),
  },
  {
    requestId: 'PRIV-20260801-004', projectId: 'demo_product', userId: 'user-004', deviceId: 'device-ios-004',
    requestType: 'DELETE', processor: 'ANALYTICSHUB', status: 'IN_PROGRESS', contactEmail: 'privacy@example.com',
    requestedAt: iso(-26 * 3600000), processedAt: iso(-20 * 3600000), closedAt: null, operator: 'demo-agent', version: 2,
    source: 'support', requesterNote: 'Delete personal identifiers.', operatorNote: 'Identity verified; pending anonymization.',
    resultPayload: null, metadata: { ticketChannel: 'email' }, updatedAt: iso(-20 * 3600000),
  },
  {
    requestId: 'PRIV-20260730-002', projectId: 'demo_product', userId: 'user-008', deviceId: 'device-ios-008',
    requestType: 'EXPORT', processor: 'ANALYTICSHUB', status: 'COMPLETED', contactEmail: 'done@example.com',
    requestedAt: iso(-72 * 3600000), processedAt: iso(-70 * 3600000), closedAt: iso(-70 * 3600000), operator: 'demo-agent', version: 3,
    source: 'ios_app', requesterNote: null, operatorNote: 'Export generated and delivered.',
    resultPayload: { records: 42, delivered: true }, metadata: { appVersion: '1.0.0' }, updatedAt: iso(-70 * 3600000),
  },
]

const activities = new Map(privacyRequests.map((request, index) => [request.requestId, [
  { activityId: `act-${index}-1`, activityType: 'SUBMITTED', fromStatus: null, toStatus: 'SUBMITTED', actor: request.userId, details: null, createdAt: request.requestedAt },
  ...(request.status !== 'SUBMITTED' ? [{ activityId: `act-${index}-2`, activityType: 'STATUS_CHANGED', fromStatus: 'SUBMITTED', toStatus: request.status, actor: request.operator, details: { note: request.operatorNote }, createdAt: request.processedAt }] : []),
]]))

const dashboards = new Map()
const requestLog = []
const api = (data) => ({ success: true, data, error: null, timestamp: new Date().toISOString() })
const paged = (projectId, items, pageSize = 50) => ({
  projectId, rangeStart: iso(-7 * 86400000), rangeEnd: iso(), page: 1, pageSize, total: items.length, items,
})

const readJson = async (request) => {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null
}

const sendJson = (response, body, status = 200) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  response.end(JSON.stringify(body))
}

const projectFromPath = (endpoint) => {
  const match = endpoint.match(/^\/admin\/projects\/([^/]+)/)
  return match ? decodeURIComponent(match[1]) : ''
}

const catalogFor = (projectId) => {
  const definitions = semanticState.get(projectId) || []
  const factsByType = new Map()
  for (const event of eventRowsFor(projectId)) {
    const current = factsByType.get(event.eventType)
    factsByType.set(event.eventType, {
      eventCount: (current?.eventCount || 0) + 1,
      firstSeenAt: current
        ? new Date(Math.min(Date.parse(current.firstSeenAt), event.eventTimestamp)).toISOString()
        : new Date(event.eventTimestamp).toISOString(),
      lastSeenAt: current
        ? new Date(Math.max(Date.parse(current.lastSeenAt), event.eventTimestamp)).toISOString()
        : new Date(event.eventTimestamp).toISOString(),
    })
  }
  return [...factsByType].map(([rawKey, facts]) => {
    const definition = definitions.find((item) => item.isActive && item.aliases.includes(rawKey))
    return {
      rawKey,
      semanticKey: definition?.semanticKey || null,
      mapped: Boolean(definition),
      displayName: definition?.displayName || null,
      category: definition?.category || null,
      description: definition?.description || null,
      eventCount: facts.eventCount,
      firstSeenAt: facts.firstSeenAt,
      lastSeenAt: facts.lastSeenAt,
    }
  })
}

const packOwnerFor = (projectId, collection, keyField, definitionKey) => {
  const packs = analysisPacks.get(projectId) || new Map()
  for (const [packKey, pack] of packs) {
    if ((pack.manifest?.[collection] || []).some(item => item[keyField] === definitionKey)) {
      return packKey
    }
  }
  return null
}

const sendManagedDefinitionError = (response, definitionKey, packKey) => sendJson(response, {
  success: false,
  data: null,
  error: {
    code: 'ANALYSIS_PACK_DEFINITION_MANAGED',
    message: `${definitionKey} is managed by Analysis Pack ${packKey}`,
  },
  timestamp: iso(),
}, 409)

const filterError = (message) => ({
  code: 'INVALID_ANALYTICS_PROPERTY_FILTER',
  message,
})

const normalizeFilterValue = (value, dataType) => {
  const source = String(value)
  if (source.length > 200) throw new Error('Property value exceeds 200 characters')
  const normalized = source.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, '')
  if (!normalized) throw new Error('Property value is empty')
  if (dataType === 'BOOLEAN') {
    if (!['true', 'false'].includes(normalized.toLowerCase())) throw new Error('Invalid boolean value')
    return normalized.toLowerCase()
  }
  if (dataType === 'INTEGER') {
    if (!/^[+-]?\d+$/.test(normalized)) throw new Error('Invalid integer value')
    const integer = BigInt(normalized)
    if (integer < -9223372036854775808n || integer > 9223372036854775807n) {
      throw new Error('Integer value exceeds 64-bit range')
    }
    return integer.toString()
  }
  if (dataType === 'NUMBER') {
    const match = normalized.match(/^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/)
    if (!match) throw new Error('Invalid number value')
    const fraction = match[3] ?? match[4] ?? ''
    const integer = match[2] ?? ''
    let coefficient = BigInt(`${match[1] || ''}${integer}${fraction}`)
    let scale = fraction.length - Number(match[5] || 0)
    if (!Number.isSafeInteger(scale)) throw new Error('Number scale is too large')
    if (coefficient === 0n) return '0'
    while (coefficient % 10n === 0n) {
      coefficient /= 10n
      scale -= 1
    }
    const negative = coefficient < 0n
    const digits = (negative ? -coefficient : coefficient).toString()
    const sign = negative ? '-' : ''
    if (scale <= 0) return `${sign}${digits}${'0'.repeat(-scale)}`
    if (digits.length <= scale) return `${sign}0.${'0'.repeat(scale - digits.length)}${digits}`
    return `${sign}${digits.slice(0, -scale)}.${digits.slice(-scale)}`
  }
  return normalized
}

const propertyMatchesType = (value, dataType) => {
  if (dataType === 'STRING') return typeof value === 'string'
  if (dataType === 'BOOLEAN') return typeof value === 'boolean'
  if (dataType === 'INTEGER') return typeof value === 'number' && Number.isInteger(value)
  return typeof value === 'number' && Number.isFinite(value)
}

const metricRange = (url, defaultDays = 7) => ({
  rangeStart: url.searchParams.get('from') || iso(-defaultDays * 86400000),
  rangeEnd: url.searchParams.get('to') || iso(),
})

const filteredEventRowsFor = (projectId, url, defaultDays = 7) => {
  const range = metricRange(url, defaultDays)
  const start = Date.parse(range.rangeStart)
  const end = Date.parse(range.rangeEnd)
  const scopedRows = eventRowsFor(projectId).filter(row => row.eventTimestamp >= start && row.eventTimestamp < end)
  const encoded = url.searchParams.get('propertyFilters')
  if (!encoded?.trim()) return { rows: scopedRows, error: null }
  if (Buffer.byteLength(encoded, 'utf8') > 8192) return { rows: [], error: filterError('propertyFilters exceeds 8KB') }
  let filters
  try {
    filters = JSON.parse(encoded)
  } catch {
    return { rows: [], error: filterError('propertyFilters must be a JSON array') }
  }
  if (!Array.isArray(filters) || filters.length > 8) {
    return { rows: [], error: filterError('propertyFilters must contain at most 8 items') }
  }
  const definitions = analyticsProperties.get(projectId) || []
  const seenKeys = new Set()
  const normalizedFilters = []
  for (const filter of filters) {
    if (!filter || typeof filter.propertyKey !== 'string' || !['EQ', 'IN', 'EXISTS'].includes(filter.operator)) {
      return { rows: [], error: filterError('propertyFilters contains an incomplete item') }
    }
    if (seenKeys.has(filter.propertyKey)) return { rows: [], error: filterError('A property cannot be filtered twice') }
    seenKeys.add(filter.propertyKey)
    const definition = definitions.find(item => item.propertyKey === filter.propertyKey)
    if (!definition?.active || !definition.filterable || definition.sensitive) {
      return { rows: [], error: filterError(`Property is not filterable: ${filter.propertyKey}`) }
    }
    const rawValues = Array.isArray(filter.values) ? filter.values : []
    if ((filter.operator === 'EXISTS' && rawValues.length > 0)
        || (filter.operator === 'EQ' && rawValues.length !== 1)
        || (filter.operator === 'IN' && (rawValues.length === 0 || rawValues.length > 20))) {
      return { rows: [], error: filterError(`Invalid values for ${filter.operator}`) }
    }
    let values
    try {
      values = rawValues.map(value => normalizeFilterValue(value, definition.dataType))
    } catch (error) {
      return { rows: [], error: filterError(error.message) }
    }
    if (new Set(values).size !== values.length) return { rows: [], error: filterError('Filter values must be unique') }
    if (definition.allowedValues?.length && values.some(value => !definition.allowedValues.includes(value))) {
      return { rows: [], error: filterError(`Value is outside the allowed domain: ${filter.propertyKey}`) }
    }
    normalizedFilters.push({ ...filter, values, dataType: definition.dataType })
  }
  const rows = scopedRows.filter(event => normalizedFilters.every(filter => {
    if (!Object.hasOwn(event.properties || {}, filter.propertyKey)) return false
    if (filter.operator === 'EXISTS') return true
    if (!propertyMatchesType(event.properties[filter.propertyKey], filter.dataType)) return false
    let actual
    try {
      actual = normalizeFilterValue(event.properties[filter.propertyKey], filter.dataType)
    } catch {
      return false
    }
    return filter.values.includes(actual)
  }))
  return { rows, error: null }
}

const requireFilteredEventRows = (response, projectId, url, defaultDays = 7) => {
  const result = filteredEventRowsFor(projectId, url, defaultDays)
  if (!result.error) return result.rows
  sendJson(response, { success: false, data: null, error: result.error, timestamp: iso() }, 400)
  return null
}

const groupedCounts = (rows, keySelector) => {
  const counts = new Map()
  for (const row of rows) {
    const key = keySelector(row)
    if (key != null) counts.set(key, (counts.get(key) || 0) + 1)
  }
  return counts
}

const aliasesForSemantic = (projectId, semanticKey) => {
  const definition = (semanticState.get(projectId) || []).find(item => item.isActive && item.semanticKey === semanticKey)
  return definition?.aliases || []
}

const availableBusinessMetricKeys = projectId => ['core.account.created', 'core.account.recreated']
  .filter(semanticKey => aliasesForSemantic(projectId, semanticKey).length > 0)

const availableOverviewMetricKeys = projectId => [
  'system.active_devices',
  'system.active_actors',
  'system.event_occurrences',
  'system.top_active_app_version',
  ...availableBusinessMetricKeys(projectId),
]

const availableTrendMetricKeys = projectId => [
  'system.active_actors',
  'system.active_devices',
  ...availableBusinessMetricKeys(projectId),
]

const validateMockFunnelCapabilities = (projectId, groupBy, journeyKey) => {
  groupBy = typeof groupBy === 'string' ? groupBy.trim() : groupBy
  journeyKey = typeof journeyKey === 'string' ? journeyKey.trim() : journeyKey
  const definitions = analyticsProperties.get(projectId) || []
  if (definitions.length === 0) return null
  if (groupBy) {
    const definition = definitions.find(item => item.propertyKey === groupBy)
    if (!definition?.active || definition.sensitive || !definition.groupable) {
      return `Property is not enabled for grouping: ${groupBy}`
    }
  }
  if (journeyKey) {
    const definition = definitions.find(item => item.propertyKey === journeyKey)
    if (!definition?.active || definition.sensitive || !definition.journeyKey || definition.dataType !== 'STRING') {
      return `Property is not enabled for journey linkage: ${journeyKey}`
    }
  }
  return null
}

const buildFunnelResult = (projectId, rows, steps, range, groupBy = null, journeyKey = null) => {
  steps = steps.map(step => step.trim())
  groupBy = typeof groupBy === 'string' ? groupBy.trim() : groupBy
  journeyKey = typeof journeyKey === 'string' ? journeyKey.trim() : journeyKey
  const stepAliases = steps.map(step => new Set(aliasesForSemantic(projectId, step)))
  const positionOf = row => ({ timestamp: row.eventTimestamp, id: row.id })
  const comparePosition = (left, right) => left.timestamp - right.timestamp || left.id - right.id
  const groupDefinition = (analyticsProperties.get(projectId) || [])
    .find(item => item.propertyKey === groupBy && item.active && item.groupable && !item.sensitive)
  const groupValueFor = (row) => {
    if (!groupBy) return 'all'
    if (!Object.hasOwn(row.properties || {}, groupBy)) return '(none)'
    const rawValue = row.properties[groupBy]
    if (!groupDefinition) return typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue)
    if (!propertyMatchesType(rawValue, groupDefinition.dataType)) return null
    try { return normalizeFilterValue(rawValue, groupDefinition.dataType) } catch { return null }
  }
  const subjectFor = (row, actor) => {
    if (!journeyKey) return actor
    const value = row.properties?.[journeyKey]
    return typeof value === 'string' && value.trim() ? `${actor}\0${value}` : null
  }
  const attributedGroups = new Map()
  const timelinesByGroup = new Map()
  const semanticRows = rows
    .flatMap((row) => {
      const stepIndex = stepAliases.findIndex(aliases => aliases.has(row.eventType))
      const actor = canonicalActorFor(row)
      return stepIndex < 0 || !actor ? [] : [{ row, actor, semanticEvent: steps[stepIndex] }]
    })
    .sort((left, right) => comparePosition(positionOf(left.row), positionOf(right.row)))
  for (const item of semanticRows) {
    const subject = subjectFor(item.row, item.actor)
    if (!subject) continue
    if (item.semanticEvent === steps[0]) {
      if (attributedGroups.has(subject)) continue
      const groupValue = groupValueFor(item.row)
      if (groupValue == null) continue
      attributedGroups.set(subject, groupValue)
      if (!timelinesByGroup.has(groupValue)) timelinesByGroup.set(groupValue, new Map())
      timelinesByGroup.get(groupValue).set(subject, new Map([[item.semanticEvent, [positionOf(item.row)]]]))
      continue
    }
    const groupValue = attributedGroups.get(subject)
    if (groupValue == null) continue
    const timeline = timelinesByGroup.get(groupValue).get(subject)
    timeline.set(item.semanticEvent, [...(timeline.get(item.semanticEvent) || []), positionOf(item.row)])
  }
  const roundRate = value => Math.round(value * 10_000) / 10_000
  const calculateSteps = (timelines) => {
    let reachedSubjects = new Set(timelines.keys())
    let previousPositions = new Map()
    let firstStepUsers = 0
    let previousStepUsers = 0
    return steps.map((eventType, index) => {
      const currentReached = new Set()
      const currentPositions = new Map()
      for (const subject of reachedSubjects) {
        const after = index === 0 ? null : previousPositions.get(subject)
        if (index > 0 && !after) continue
        const match = (timelines.get(subject).get(eventType) || [])
          .find(position => after == null || comparePosition(position, after) > 0)
        if (match) {
          currentReached.add(subject)
          currentPositions.set(subject, match)
        }
      }
      const users = currentReached.size
      if (index === 0) firstStepUsers = users
      const conversionRate = firstStepUsers ? users / firstStepUsers : 0
      const dropOffRate = index === 0 || !previousStepUsers ? 0 : 1 - users / previousStepUsers
      reachedSubjects = currentReached
      previousPositions = currentPositions
      previousStepUsers = users
      return { stepIndex: index + 1, eventType, users, conversionRate: roundRate(conversionRate), dropOffRate: roundRate(dropOffRate) }
    })
  }
  return {
    projectId,
    ...range,
    steps,
    groupBy: groupBy || '',
    journeyKey: journeyKey || '',
    countingUnit: journeyKey ? 'journeys' : 'actors',
    attributionModel: journeyKey ? 'first_touch_journey' : 'first_touch_actor',
    groups: [...timelinesByGroup.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([groupValue, timelines]) => ({ groupValue, steps: calculateSteps(timelines) })),
  }
}

const retentionWindow = (url, days, defaultDays = 30) => {
  const range = metricRange(url, defaultDays)
  const maxDay = days.length ? Math.max(...days) : 30
  const requestedObservationEndMs = Date.parse(range.rangeEnd) + (maxDay + 1) * 86400000
  const observationEndMs = Math.min(requestedObservationEndMs, now)
  const queryUrl = new URL(url)
  queryUrl.searchParams.set('from', range.rangeStart)
  queryUrl.searchParams.set('to', new Date(observationEndMs).toISOString())
  return { range, queryUrl, observationEndMs, requestedObservationEndMs }
}

const buildRetentionResult = (
  projectId,
  rows,
  cohortEvent,
  returnEvent,
  days,
  range,
  observationEndMs,
  requestedObservationEndMs,
) => {
  const cohortAliases = new Set(aliasesForSemantic(projectId, cohortEvent))
  const returnAliases = new Set(aliasesForSemantic(projectId, returnEvent))
  const rangeStartMs = Date.parse(range.rangeStart)
  const rangeEndMs = Date.parse(range.rangeEnd)
  const comparePosition = (left, right) => left.timestamp - right.timestamp || left.id - right.id
  const cohortPositions = new Map()
  const returnPositions = new Map()
  for (const row of rows) {
    const actor = canonicalActorFor(row)
    if (!actor) continue
    if (cohortAliases.has(row.eventType) && row.eventTimestamp >= rangeStartMs && row.eventTimestamp < rangeEndMs) {
      const existing = cohortPositions.get(actor)
      const position = { timestamp: row.eventTimestamp, id: row.id }
      if (existing == null || comparePosition(position, existing) < 0) cohortPositions.set(actor, position)
    }
    if (returnAliases.has(row.eventType)) {
      returnPositions.set(actor, [
        ...(returnPositions.get(actor) || []),
        { timestamp: row.eventTimestamp, id: row.id },
      ].sort(comparePosition))
    }
  }
  const buckets = days.map(day => {
    let eligibleUsers = 0
    let retainedUsers = 0
    for (const [actor, cohortPosition] of cohortPositions) {
      const cohortDate = new Date(cohortPosition.timestamp)
      const bucketStart = Date.UTC(
        cohortDate.getUTCFullYear(),
        cohortDate.getUTCMonth(),
        cohortDate.getUTCDate() + day,
      )
      const bucketEnd = bucketStart + 86400000
      if (observationEndMs < bucketEnd) continue
      eligibleUsers += 1
      if ((returnPositions.get(actor) || []).some(position => comparePosition(position, cohortPosition) > 0
          && position.timestamp >= bucketStart && position.timestamp < bucketEnd)) {
        retainedUsers += 1
      }
    }
    return { day, eligibleUsers, retainedUsers, retentionRate: eligibleUsers ? retainedUsers / eligibleUsers : 0 }
  })
  return {
    projectId,
    ...range,
    observationEnd: new Date(observationEndMs).toISOString(),
    requestedObservationEnd: new Date(requestedObservationEndMs).toISOString(),
    observationComplete: observationEndMs >= requestedObservationEndMs,
    cohortEvent,
    returnEvent,
    cohortUsers: cohortPositions.size,
    buckets,
  }
}

const allowedPackFields = {
  manifest: new Set(['schemaVersion', 'trustedSchemaPolicy', 'properties', 'metrics']),
  trustedSchemaPolicy: new Set(['propertyKey', 'trustedValues']),
  property: new Set(['propertyKey', 'displayName', 'dataType', 'description', 'allowedValues', 'filterable', 'groupable', 'journeyKey', 'sensitive', 'active']),
  metric: new Set(['metricKey', 'displayName', 'metricType', 'definition', 'description', 'active']),
}

const unknownFields = (value, allowed) => Object.keys(value || {}).filter(key => !allowed.has(key))

const hasDisplayName = (value) => value && typeof value === 'object' && !Array.isArray(value)
  && Object.keys(value).length > 0
  && Object.values(value).every(name => typeof name === 'string' && name.trim().length > 0 && name.length <= 200)

const hasPackDisplayName = value => hasDisplayName(value)
  && Object.keys(value).length <= 16
  && Object.keys(value).every(locale => /^(?:default|[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*)$/.test(locale))

const validateMockPropertyDefinition = (property, propertyKey = property?.propertyKey) => {
  if (typeof propertyKey !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/.test(propertyKey)) {
    return 'Property key is invalid'
  }
  if (!hasDisplayName(property?.displayName)
      || !['STRING', 'BOOLEAN', 'INTEGER', 'NUMBER'].includes(property?.dataType)
      || !['filterable', 'groupable', 'journeyKey', 'sensitive', 'active'].every(field => typeof property[field] === 'boolean')) {
    return 'Property definition is incomplete'
  }
  if (property.description != null && (typeof property.description !== 'string' || property.description.length > 1000)) {
    return 'Property description is invalid'
  }
  if (property.sensitive && (property.filterable || property.groupable || property.journeyKey)) {
    return 'Sensitive properties cannot be filterable, groupable, or journey keys'
  }
  if (property.journeyKey && property.dataType !== 'STRING') return 'journeyKey requires a STRING property'
  if (property.allowedValues != null) {
    if (!Array.isArray(property.allowedValues) || property.allowedValues.length > 100) return 'allowedValues is invalid'
    let normalized
    try { normalized = property.allowedValues.map(value => normalizeFilterValue(value, property.dataType)) } catch { return 'allowedValues contains an invalid value' }
    if (new Set(normalized).size !== normalized.length) return 'allowedValues contains duplicates after normalization'
  }
  return null
}

const normalizeMockPropertyDefinition = (property) => ({
  ...property,
  allowedValues: property.allowedValues == null
    ? null
    : property.allowedValues.map(value => normalizeFilterValue(value, property.dataType)),
})

const validateMockTrustedPolicy = (policy, definitions) => {
  if (!policy) return null
  const definition = definitions.find(item => item.propertyKey === policy.propertyKey)
  if (!definition?.active || definition.sensitive || !definition.filterable
      || definition.dataType !== 'STRING' || !Array.isArray(definition.allowedValues)) {
    return 'trustedSchemaPolicy must reference an active, non-sensitive, filterable STRING property'
  }
  if (policy.trustedValues.some(value => !definition.allowedValues.includes(value))) {
    return 'trustedSchemaPolicy values must belong to the property allowedValues'
  }
  return null
}

const validateMockMetricDefinition = (projectId, metric, definitions, policy) => {
  if (!hasDisplayName(metric?.displayName)
      || !['EVENT_COUNT', 'UNIQUE_ACTORS', 'FUNNEL_CONVERSION', 'RETENTION'].includes(metric?.metricType)
      || !metric.definition || typeof metric.definition !== 'object' || Array.isArray(metric.definition)
      || typeof metric.active !== 'boolean') return 'Metric definition is incomplete'
  const allowedDefinitionFields = {
    EVENT_COUNT: new Set(['semanticEvent', 'propertyFilters', 'schemaScope', 'schemaScopeReason']),
    UNIQUE_ACTORS: new Set(['semanticEvent', 'propertyFilters', 'schemaScope', 'schemaScopeReason']),
    FUNNEL_CONVERSION: new Set(['steps', 'groupBy', 'journeyKey', 'propertyFilters', 'schemaScope', 'schemaScopeReason']),
    RETENTION: new Set(['cohortEvent', 'returnEvent', 'days', 'propertyFilters', 'schemaScope', 'schemaScopeReason']),
  }
  const extra = unknownFields(metric.definition, allowedDefinitionFields[metric.metricType])
  if (extra.length) return `Metric definition contains unsupported fields: ${extra.join(', ')}`
  const semantics = semanticState.get(projectId) || []
  const semanticExists = key => typeof key === 'string' && semantics.some(item => item.isActive && item.semanticKey === key)
  if (['EVENT_COUNT', 'UNIQUE_ACTORS'].includes(metric.metricType) && !semanticExists(metric.definition.semanticEvent)) {
    return 'Metric semanticEvent is not active'
  }
  if (metric.metricType === 'FUNNEL_CONVERSION') {
    for (const field of ['groupBy', 'journeyKey']) {
      const value = metric.definition[field]
      if (value != null && (typeof value !== 'string' || !value.trim() || value !== value.trim() || value.length > 80)) {
        return `Funnel ${field} is invalid`
      }
    }
    if (!Array.isArray(metric.definition.steps) || metric.definition.steps.length < 2 || metric.definition.steps.length > 12
        || new Set(metric.definition.steps.map(step => typeof step === 'string' ? step.trim() : step)).size !== metric.definition.steps.length
        || metric.definition.steps.some(step => typeof step !== 'string' || !semanticExists(step.trim()))) return 'Funnel steps are invalid'
    if (metric.definition.groupBy) {
      const groupBy = metric.definition.groupBy.trim()
      const groupDefinition = definitions.find(item => item.propertyKey === groupBy)
      if (!groupDefinition?.active || groupDefinition.sensitive || !groupDefinition.groupable) return 'Funnel groupBy is not enabled'
    }
    if (metric.definition.journeyKey) {
      const journeyKey = metric.definition.journeyKey.trim()
      const journeyDefinition = definitions.find(item => item.propertyKey === journeyKey)
      if (!journeyDefinition?.active || journeyDefinition.sensitive || !journeyDefinition.journeyKey) return 'Funnel journeyKey is not enabled'
    }
  }
  if (metric.metricType === 'RETENTION') {
    if (!semanticExists(metric.definition.cohortEvent) || !semanticExists(metric.definition.returnEvent)) return 'Retention events are invalid'
    if (metric.definition.days != null && (!Array.isArray(metric.definition.days) || metric.definition.days.length > 91
        || new Set(metric.definition.days).size !== metric.definition.days.length
        || metric.definition.days.some(day => !Number.isInteger(day) || day < 0 || day > 90))) return 'Retention days are invalid'
  }
  const filters = metric.definition.propertyFilters || []
  if (!Array.isArray(filters) || filters.length > 8) return 'Metric propertyFilters is invalid'
  const filterKeys = new Set()
  for (const filter of filters) {
    const definition = definitions.find(item => item.propertyKey === filter?.propertyKey)
    if (!definition?.active || definition.sensitive || !definition.filterable
        || !['EQ', 'IN', 'EXISTS'].includes(filter?.operator)) return 'Metric propertyFilters uses an unavailable property'
    if (filterKeys.has(filter.propertyKey)) return 'Metric propertyFilters repeats a property'
    filterKeys.add(filter.propertyKey)
    const values = Array.isArray(filter.values) ? filter.values : []
    if ((filter.operator === 'EXISTS' && values.length > 0)
        || (filter.operator === 'EQ' && values.length !== 1)
        || (filter.operator === 'IN' && (values.length === 0 || values.length > 20))) {
      return `Metric propertyFilters has invalid values for ${filter.operator}`
    }
    let normalized
    try { normalized = values.map(value => normalizeFilterValue(value, definition.dataType)) } catch { return 'Metric propertyFilters contains an invalid value' }
    if (new Set(normalized).size !== normalized.length) return 'Metric propertyFilters contains duplicate values'
    if (definition.allowedValues?.length && normalized.some(value => !definition.allowedValues.includes(value))) {
      return 'Metric propertyFilters contains a value outside allowedValues'
    }
  }
  if (metric.active) {
    const scope = metric.definition.schemaScope
    const reason = metric.definition.schemaScopeReason
    if (scope != null) {
      if (scope !== 'CROSS_VERSION_VERIFIED') return 'Metric schemaScope is unsupported'
      if (typeof reason !== 'string' || reason.trim().length < 10 || reason.length > 500) {
        return 'Cross-version metric requires a schemaScopeReason of 10 to 500 characters'
      }
    } else if (Object.hasOwn(metric.definition, 'schemaScopeReason')) {
      return 'Metric schemaScopeReason requires schemaScope'
    }
  }
  if (!metricMatchesTrustedPolicy(metric, policy)) return 'Metric does not match the trusted schema policy'
  return null
}

const validateMockPackManifest = (manifest) => {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) return 'manifest must be an object'
  const rootUnknown = unknownFields(manifest, allowedPackFields.manifest)
  if (rootUnknown.length) return `manifest contains unsupported fields: ${rootUnknown.join(', ')}`
  if (manifest.schemaVersion !== 1) return 'Only Analysis Pack schemaVersion=1 is supported'
  if (manifest.trustedSchemaPolicy != null) {
    const policyUnknown = unknownFields(manifest.trustedSchemaPolicy, allowedPackFields.trustedSchemaPolicy)
    if (policyUnknown.length) return `trustedSchemaPolicy contains unsupported fields: ${policyUnknown.join(', ')}`
    if (!manifest.trustedSchemaPolicy.propertyKey
        || !Array.isArray(manifest.trustedSchemaPolicy.trustedValues)
        || manifest.trustedSchemaPolicy.trustedValues.length === 0
        || manifest.trustedSchemaPolicy.trustedValues.length > 20
        || manifest.trustedSchemaPolicy.trustedValues.some(value => typeof value !== 'string' || !value.trim())) {
      return 'trustedSchemaPolicy requires propertyKey and trustedValues'
    }
    const normalizedTrustedValues = manifest.trustedSchemaPolicy.trustedValues.map(value => value.trim())
    if (new Set(normalizedTrustedValues).size !== normalizedTrustedValues.length) return 'trustedSchemaPolicy contains duplicate values'
  }
  const properties = manifest.properties == null ? [] : manifest.properties
  const metrics = manifest.metrics == null ? [] : manifest.metrics
  if (!Array.isArray(properties) || properties.length > 200) return 'properties must be an array with at most 200 items'
  if (!Array.isArray(metrics) || metrics.length > 200) return 'metrics must be an array with at most 200 items'
  const propertyKeys = new Set()
  for (const property of properties) {
    const extra = unknownFields(property, allowedPackFields.property)
    if (extra.length) return `properties[] contains unsupported fields: ${extra.join(', ')}`
    if (!property?.propertyKey || propertyKeys.has(property.propertyKey)) return 'properties[] contains a missing or duplicate propertyKey'
    const definitionError = validateMockPropertyDefinition(property)
    if (definitionError) return definitionError
    propertyKeys.add(property.propertyKey)
  }
  const metricKeys = new Set()
  for (const metric of metrics) {
    const extra = unknownFields(metric, allowedPackFields.metric)
    if (extra.length) return `metrics[] contains unsupported fields: ${extra.join(', ')}`
    if (!metric?.metricKey || metricKeys.has(metric.metricKey)) return 'metrics[] contains a missing or duplicate metricKey'
    if (!metric.definition || typeof metric.definition !== 'object' || Array.isArray(metric.definition)) return 'metrics[].definition must be an object'
    metricKeys.add(metric.metricKey)
  }
  return null
}

const qualityRowsFor = (projectId, url) => {
  const start = Date.parse(url.searchParams.get('from') || iso(-7 * 86400000))
  const end = Date.parse(url.searchParams.get('to') || iso())
  return eventRowsFor(projectId).filter(row => row.eventTimestamp >= start && row.eventTimestamp < end)
}

const appendQualityIssue = (issues, code, severity, count, description) => {
  if (count > 0) issues.push({ code, severity, count, description })
}

const trafficRecord = ([metricId, pagePath, referrer, deviceId, userId, offset], metricType) => ({
  metricId, metricType, pagePath, referrer, deviceId, userId,
  sessionId: `${metricType}-session-${metricId}`,
  metricTimestamp: timestamp(offset), createdAt: iso(offset), metadata: { demo: true },
})

const handleApi = async (request, response, url) => {
  const endpoint = url.pathname.replace('/analyticshub/api', '')
  const method = request.method || 'GET'
  const projectId = url.searchParams.get('projectId') || projectFromPath(endpoint) || 'demo_product'
  requestLog.push({ method, endpoint, query: Object.fromEntries(url.searchParams), at: iso() })

  if (endpoint === '/v1/auth/admin-token/verify' && method === 'POST') return sendJson(response, api({ valid: true }))
  if (endpoint === '/admin/projects' && method === 'GET') return sendJson(response, api(projects))
  if (endpoint === '/admin/projects' && method === 'POST') {
    const body = await readJson(request)
    const record = { ...body, id: Math.max(0, ...projects.map((item) => Number(item.id))) + 1 }
    projects.push(record)
    semanticState.set(record.projectId, [])
    analyticsProperties.set(record.projectId, [])
    analyticsMetrics.set(record.projectId, [])
    analysisPacks.set(record.projectId, new Map())
    counters.set(record.projectId, [])
    return sendJson(response, api(record))
  }
  const projectMatch = endpoint.match(/^\/admin\/projects\/([^/]+)$/)
  if (projectMatch && method === 'PUT') {
    const id = decodeURIComponent(projectMatch[1])
    const index = projects.findIndex((item) => String(item.id) === id)
    if (index < 0) return sendJson(response, { ...api(null), success: false, error: { message: 'Project not found' } }, 404)
    projects[index] = { ...projects[index], ...await readJson(request), id }
    return sendJson(response, api(projects[index]))
  }
  if (projectMatch && method === 'DELETE') {
    const id = decodeURIComponent(projectMatch[1])
    const index = projects.findIndex((item) => String(item.id) === id)
    if (index >= 0) projects.splice(index, 1)
    return sendJson(response, api(null))
  }
  if (/^\/admin\/projects\/[^/]+\/health$/.test(endpoint)) {
    return sendJson(response, api({
      connected: true,
      tables: { devices: true, events: true, sessions: true, traffic_metrics: true, counters: true, privacy_requests: true },
      allTablesExist: true, schemaCurrent: true, migrationHistoryValid: true,
      schemaVersion: '9', pendingMigrations: 0, historyTable: 'analytics_schema_history', errorCode: null, error: null,
    }))
  }
  if (/^\/admin\/projects\/[^/]+\/init$/.test(endpoint) && method === 'POST') {
    return sendJson(response, api({ success: true, message: 'Mock project schema initialized', executedMigrations: 0 }))
  }

  const dashboardListMatch = endpoint.match(/^\/admin\/projects\/([^/]+)\/dashboards$/)
  if (dashboardListMatch && method === 'GET') return sendJson(response, api(dashboards.get(projectId) || []))
  const dashboardWriteMatch = endpoint.match(/^\/admin\/projects\/([^/]+)\/dashboards\/([^/]+)$/)
  if (dashboardWriteMatch && method === 'PUT') {
    const body = await readJson(request)
    const dashboardKey = decodeURIComponent(dashboardWriteMatch[2])
    const list = dashboards.get(projectId) || []
    const existing = list.find((item) => item.dashboardKey === dashboardKey)
    const record = {
      projectId, dashboardKey, displayName: body.displayName, description: body.description || null,
      schemaVersion: body.schemaVersion, definition: body.definition, revision: (existing?.revision || 0) + 1,
      isDefault: body.isDefault, isActive: body.isActive,
      createdAt: existing?.createdAt || iso(), updatedAt: iso(),
    }
    dashboards.set(projectId, [...list.filter((item) => item.dashboardKey !== dashboardKey), record])
    return sendJson(response, api(record))
  }

  if (/^\/admin\/projects\/[^/]+\/event-catalog$/.test(endpoint)) {
    return sendJson(response, api({ projectId, sourceKind: 'EVENT_TYPE', items: catalogFor(projectId) }))
  }
  if (/^\/admin\/projects\/[^/]+\/semantics$/.test(endpoint) && method === 'GET') {
    return sendJson(response, api({ projectId, sourceKind: 'EVENT_TYPE', items: semanticState.get(projectId) || [] }))
  }
  const semanticMatch = endpoint.match(/^\/admin\/projects\/[^/]+\/semantics\/([^/]+)$/)
  if (semanticMatch && method === 'PUT') {
    const semanticKey = decodeURIComponent(semanticMatch[1])
    const body = await readJson(request)
    const list = semanticState.get(projectId) || []
    const existing = list.find((item) => item.semanticKey === semanticKey)
    const nextAliases = body.aliasMode === 'PRESERVE' ? (existing?.aliases || []) : (body.aliases || [])
    if (!Array.isArray(nextAliases) || nextAliases.length > 500
        || nextAliases.some(alias => typeof alias !== 'string' || !alias.trim() || alias.length > 100)
        || new Set(nextAliases).size !== nextAliases.length) {
      return sendJson(response, { success: false, data: null, error: {
        code: 'INVALID_SEMANTIC_DEFINITION',
        message: 'Semantic aliases are invalid or duplicated',
      }, timestamp: iso() }, 400)
    }
    const existingAliasSet = new Set(existing?.aliases || [])
    const nextAliasSet = new Set(nextAliases)
    const changesAliases = existing && (existingAliasSet.size !== nextAliasSet.size
      || [...existingAliasSet].some(alias => !nextAliasSet.has(alias)))
    if (existing && ((existing.isActive && !body.isActive) || changesAliases)) {
      const dependencies = activeSemanticDependencies(projectId, semanticKey)
      if (dependencies.metricKeys.length || dependencies.dashboardKeys.length) {
        return sendJson(response, { success: false, data: null, error: {
          code: 'SEMANTIC_DEFINITION_IN_USE',
          message: `Semantic ${semanticKey} is used by active analytics definitions`,
          details: dependencies,
        }, timestamp: iso() }, 409)
      }
    }
    const record = {
      projectId, sourceKind: body.sourceKind, semanticKey, displayName: body.displayName,
      category: body.category || null, description: body.description || null, isActive: body.isActive,
      aliases: nextAliases,
      createdAt: existing?.createdAt || iso(), updatedAt: iso(),
    }
    semanticState.set(projectId, [...list.filter((item) => item.semanticKey !== semanticKey), record])
    return sendJson(response, api(record))
  }
  if (semanticMatch && method === 'DELETE') {
    const semanticKey = decodeURIComponent(semanticMatch[1])
    const dependencies = activeSemanticDependencies(projectId, semanticKey)
    if (dependencies.metricKeys.length || dependencies.dashboardKeys.length) {
      return sendJson(response, { success: false, data: null, error: {
        code: 'SEMANTIC_DEFINITION_IN_USE',
        message: `Semantic ${semanticKey} is used by active analytics definitions`,
        details: dependencies,
      }, timestamp: iso() }, 409)
    }
    semanticState.set(projectId, (semanticState.get(projectId) || []).filter((item) => item.semanticKey !== semanticKey))
    return sendJson(response, api({ projectId, semanticKey, message: 'Deleted in mock environment' }))
  }

  if (/^\/admin\/projects\/[^/]+\/properties$/.test(endpoint) && method === 'GET') {
    return sendJson(response, api({ projectId, items: analyticsProperties.get(projectId) || [] }))
  }
  const propertyMatch = endpoint.match(/^\/admin\/projects\/[^/]+\/properties\/([^/]+)$/)
  if (propertyMatch && method === 'PUT') {
    const propertyKey = decodeURIComponent(propertyMatch[1])
    const ownerPackKey = packOwnerFor(projectId, 'properties', 'propertyKey', propertyKey)
    if (ownerPackKey) return sendManagedDefinitionError(response, propertyKey, ownerPackKey)
    const body = await readJson(request)
    const definitionError = validateMockPropertyDefinition(body, propertyKey)
    if (definitionError) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: definitionError }, timestamp: iso() }, 400)
    }
    const list = analyticsProperties.get(projectId) || []
    const existing = list.find(item => item.propertyKey === propertyKey)
    const record = {
      ...normalizeMockPropertyDefinition(body),
      projectId,
      propertyKey,
      createdAt: existing?.createdAt || iso(),
      updatedAt: iso(),
    }
    const dependencyConflict = propertyDependencyConflict(projectId, propertyKey, existing, record)
    if (dependencyConflict) {
      return sendJson(response, { success: false, data: null, error: {
        code: 'INVALID_ANALYSIS_CONFIGURATION',
        message: `Property ${propertyKey} is used by active analytics definitions`,
        details: dependencyConflict,
      }, timestamp: iso() }, 409)
    }
    const trustedPolicy = trustedPolicyFor(projectId)
    if (trustedPolicy?.propertyKey === propertyKey
        && validateMockTrustedPolicy(trustedPolicy, [
          ...list.filter(item => item.propertyKey !== propertyKey),
          record,
        ])) {
      return sendJson(response, { success: false, data: null, error: {
        code: 'ANALYSIS_PACK_TRUSTED_SCHEMA_CONFLICT',
        message: `Property ${propertyKey} would invalidate the active Analysis Pack trusted schema policy`,
      }, timestamp: iso() }, 409)
    }
    analyticsProperties.set(projectId, [...list.filter(item => item.propertyKey !== propertyKey), record])
    return sendJson(response, api(record))
  }
  if (/^\/admin\/projects\/[^/]+\/metrics$/.test(endpoint) && method === 'GET') {
    return sendJson(response, api(analyticsMetrics.get(projectId) || []))
  }
  if (/^\/admin\/projects\/[^/]+\/analysis-packs$/.test(endpoint) && method === 'GET') {
    const packs = analysisPacks.get(projectId) || new Map()
    return sendJson(response, api([...packs.entries()].map(([packKey, pack]) => ({
      projectId,
      packKey,
      packVersion: pack.packVersion,
      displayName: pack.displayName,
      manifest: pack.manifest,
      checksumSha256: pack.checksumSha256,
      active: true,
      createdAt: pack.createdAt,
      updatedAt: pack.updatedAt,
      versions: pack.versions || [],
    }))))
  }
  if (/^\/admin\/projects\/[^/]+\/trusted-schema-policy$/.test(endpoint) && method === 'GET') {
    const policy = trustedPolicyFor(projectId)
    return sendJson(response, api(policy
      ? { projectId, propertyKey: policy.propertyKey, trustedValues: policy.trustedValues }
      : null))
  }
  const metricMatch = endpoint.match(/^\/admin\/projects\/[^/]+\/metrics\/([^/]+)$/)
  if (metricMatch && method === 'PUT') {
    const metricKey = decodeURIComponent(metricMatch[1])
    const ownerPackKey = packOwnerFor(projectId, 'metrics', 'metricKey', metricKey)
    if (ownerPackKey) return sendManagedDefinitionError(response, metricKey, ownerPackKey)
    const body = await readJson(request)
    const definitionError = validateMockMetricDefinition(
      projectId,
      body,
      analyticsProperties.get(projectId) || [],
      trustedPolicyFor(projectId),
    )
    if (definitionError) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: definitionError }, timestamp: iso() }, 400)
    }
    const list = analyticsMetrics.get(projectId) || []
    const existing = list.find(item => item.metricKey === metricKey)
    const record = { ...body, projectId, metricKey, createdAt: existing?.createdAt || iso(), updatedAt: iso() }
    analyticsMetrics.set(projectId, [...list.filter(item => item.metricKey !== metricKey), record])
    return sendJson(response, api(record))
  }
  const metricResultMatch = endpoint.match(/^\/admin\/projects\/[^/]+\/metric-results\/([^/]+)$/)
  if (metricResultMatch && method === 'GET') {
    const metricKey = decodeURIComponent(metricResultMatch[1])
    const metric = (analyticsMetrics.get(projectId) || []).find(item => item.metricKey === metricKey)
    if (!metric) return sendJson(response, { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Mock metric not found' }, timestamp: iso() }, 404)
    const metricUrl = new URL(url)
    if (metric.definition?.propertyFilters) {
      metricUrl.searchParams.set('propertyFilters', JSON.stringify(metric.definition.propertyFilters))
    }
    const range = metricRange(metricUrl, 7)
    const metricDays = metric.definition.days || [1, 7, 30]
    const retention = metric.metricType === 'RETENTION'
      ? retentionWindow(metricUrl, metricDays, 7)
      : null
    const rows = requireFilteredEventRows(response, projectId, retention?.queryUrl || metricUrl, 7)
    if (!rows) return
    let result
    if (metric.metricType === 'EVENT_COUNT' || metric.metricType === 'UNIQUE_ACTORS') {
      const aliases = new Set(aliasesForSemantic(projectId, metric.definition.semanticEvent))
      const matching = rows.filter(row => aliases.has(row.eventType))
      result = metric.metricType === 'EVENT_COUNT'
        ? { occurrences: matching.length }
        : { actors: new Set(matching.map(canonicalActorFor).filter(Boolean)).size }
    } else if (metric.metricType === 'FUNNEL_CONVERSION') {
      const capabilityError = validateMockFunnelCapabilities(
        projectId,
        metric.definition.groupBy || null,
        metric.definition.journeyKey || null,
      )
      if (capabilityError) {
        return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYTICS_PROPERTY_FILTER', message: capabilityError }, timestamp: iso() }, 400)
      }
      result = buildFunnelResult(
        projectId,
        rows,
        metric.definition.steps || [],
        range,
        metric.definition.groupBy?.trim() || null,
        metric.definition.journeyKey?.trim() || null,
      )
    } else {
      result = buildRetentionResult(
        projectId,
        rows,
        metric.definition.cohortEvent,
        metric.definition.returnEvent,
        metricDays,
        range,
        retention.observationEndMs,
        retention.requestedObservationEndMs,
      )
    }
    const crossVersionDiagnostic = metric.definition?.schemaScope === 'CROSS_VERSION_VERIFIED'
    const trustedSchemaConfigured = Boolean(trustedPolicyFor(projectId))
    return sendJson(response, api({
      projectId,
      metricKey,
      metricType: metric.metricType,
      from: range.rangeStart,
      to: range.rangeEnd,
      resultClassification: crossVersionDiagnostic
        ? 'CROSS_VERSION_DIAGNOSTIC'
        : trustedSchemaConfigured ? 'TRUSTED_SCHEMA' : 'UNGOVERNED_DIAGNOSTIC',
      diagnosticReason: crossVersionDiagnostic ? metric.definition.schemaScopeReason : null,
      result,
    }))
  }
  const packMatch = endpoint.match(/^\/admin\/projects\/[^/]+\/analysis-packs\/([^/]+)$/)
  if (packMatch && method === 'PUT') {
    const body = await readJson(request)
    const packKey = decodeURIComponent(packMatch[1])
    if (!Number.isInteger(body?.packVersion) || body.packVersion < 1 || !hasPackDisplayName(body?.displayName)) {
      return sendJson(response, { success: false, data: null, error: {
        code: 'INVALID_ANALYSIS_CONFIGURATION',
        message: 'Analysis Pack version or display name is invalid',
      }, timestamp: iso() }, 400)
    }
    const manifestError = validateMockPackManifest(body?.manifest)
    if (manifestError) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: manifestError }, timestamp: iso() }, 400)
    }
    const checksumSha256 = createHash('sha256').update(JSON.stringify(body.manifest)).digest('hex')
    const packs = analysisPacks.get(projectId) || new Map()
    const existingPack = packs.get(packKey)
    if (existingPack && body.packVersion < existingPack.packVersion) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: 'Mock Pack version cannot move backward' }, timestamp: iso() }, 409)
    }
    if (existingPack && body.packVersion === existingPack.packVersion && checksumSha256 !== existingPack.checksumSha256) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: 'Mock Pack content changed without a version increment' }, timestamp: iso() }, 409)
    }
    const displayNameFingerprint = (value) => JSON.stringify(Object.entries(value || {}).sort(([left], [right]) => left.localeCompare(right)))
    if (existingPack && body.packVersion === existingPack.packVersion
        && displayNameFingerprint(body.displayName) !== displayNameFingerprint(existingPack.displayName)) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: 'Mock Pack display name changed without a version increment' }, timestamp: iso() }, 409)
    }
    if (existingPack && body.packVersion === existingPack.packVersion) {
      return sendJson(response, api({
        projectId,
        packKey,
        packVersion: existingPack.packVersion,
        displayName: existingPack.displayName,
        checksumSha256: existingPack.checksumSha256,
        active: true,
        propertyDefinitionsApplied: existingPack.manifest?.properties?.length || 0,
        metricDefinitionsApplied: existingPack.manifest?.metrics?.length || 0,
        updatedAt: existingPack.updatedAt,
      }))
    }
    const properties = Array.isArray(body.manifest?.properties) ? body.manifest.properties : []
    const metrics = Array.isArray(body.manifest?.metrics) ? body.manifest.metrics : []
    if (!existingPack && properties.length === 0 && metrics.length === 0) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: 'A new Pack must contain a property or metric' }, timestamp: iso() }, 409)
    }
    const priorProperties = new Set(existingPack?.manifest?.properties?.map(item => item.propertyKey) || [])
    const priorMetrics = new Set(existingPack?.manifest?.metrics?.map(item => item.metricKey) || [])
    const nextProperties = new Set(properties.map(item => item.propertyKey))
    const nextMetrics = new Set(metrics.map(item => item.metricKey))
    for (const [otherPackKey, otherPack] of packs) {
      if (otherPackKey === packKey) continue
      const otherProperties = new Set(otherPack.manifest?.properties?.map(item => item.propertyKey) || [])
      const otherMetrics = new Set(otherPack.manifest?.metrics?.map(item => item.metricKey) || [])
      const propertyOverlap = [...nextProperties].filter(key => otherProperties.has(key))
      const metricOverlap = [...nextMetrics].filter(key => otherMetrics.has(key))
      if (propertyOverlap.length || metricOverlap.length) {
        return sendJson(response, { success: false, data: null, error: {
          code: 'INVALID_ANALYSIS_CONFIGURATION',
          message: `Analysis Pack conflicts with ${otherPackKey}; property=${propertyOverlap.join(',')}, metric=${metricOverlap.join(',')}`,
        }, timestamp: iso() }, 400)
      }
      if (body.manifest.trustedSchemaPolicy && otherPack.manifest?.trustedSchemaPolicy) {
        return sendJson(response, { success: false, data: null, error: {
          code: 'INVALID_ANALYSIS_CONFIGURATION',
          message: 'Only one active Analysis Pack may declare trustedSchemaPolicy',
        }, timestamp: iso() }, 400)
      }
    }
    const removedPropertyKeys = [...priorProperties].filter(key => !nextProperties.has(key))
    const removedMetricKeys = [...priorMetrics].filter(key => !nextMetrics.has(key))
    const removesTrustedSchemaPolicy = Boolean(existingPack?.manifest?.trustedSchemaPolicy && !body.manifest?.trustedSchemaPolicy)
    const removesDefinition = removedPropertyKeys.length > 0
      || removedMetricKeys.length > 0
      || removesTrustedSchemaPolicy
    if (removesDefinition && !body.confirmDeactivations) {
      return sendJson(response, { success: false, data: null, error: {
        code: 'ANALYSIS_PACK_DEACTIVATION_CONFIRMATION_REQUIRED',
        message: 'Confirm authoritative snapshot replacement',
        details: { removedPropertyKeys, removedMetricKeys, removesTrustedSchemaPolicy },
      }, timestamp: iso() }, 409)
    }
    const existingProperties = analyticsProperties.get(projectId) || []
    const existingMetrics = analyticsMetrics.get(projectId) || []
    const retainedProperties = existingProperties.filter(item => !priorProperties.has(item.propertyKey) && !nextProperties.has(item.propertyKey))
    const retainedMetrics = existingMetrics.filter(item => !priorMetrics.has(item.metricKey) && !nextMetrics.has(item.metricKey))
    const deactivatedProperties = existingProperties
      .filter(item => removedPropertyKeys.includes(item.propertyKey))
      .map(item => ({ ...item, active: false, updatedAt: iso() }))
    const deactivatedMetrics = existingMetrics
      .filter(item => removedMetricKeys.includes(item.metricKey))
      .map(item => ({ ...item, active: false, updatedAt: iso() }))
    const appliedProperties = properties.map(item => ({
      ...normalizeMockPropertyDefinition(item),
      projectId,
      createdAt: existingProperties.find(existing => existing.propertyKey === item.propertyKey)?.createdAt || iso(),
      updatedAt: iso(),
    }))
    const effectiveProperties = [...retainedProperties, ...deactivatedProperties, ...appliedProperties]
    const policy = normalizeMockTrustedPolicy(body.manifest?.trustedSchemaPolicy) || trustedPolicyFor(projectId, packKey)
    const policyError = validateMockTrustedPolicy(policy, effectiveProperties)
    if (policyError) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: policyError }, timestamp: iso() }, 400)
    }
    for (const metric of metrics) {
      const metricError = validateMockMetricDefinition(projectId, metric, effectiveProperties, policy)
      if (metricError) {
        return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: metricError }, timestamp: iso() }, 400)
      }
    }
    const appliedMetrics = metrics.map(item => ({
      ...item,
      projectId,
      createdAt: existingMetrics.find(existing => existing.metricKey === item.metricKey)?.createdAt || iso(),
      updatedAt: iso(),
    }))
    const effectiveMetrics = [...retainedMetrics, ...deactivatedMetrics, ...appliedMetrics]
    if (policy && effectiveMetrics.some(metric => metric.active && !metricMatchesTrustedPolicy(metric, policy))) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYSIS_CONFIGURATION', message: 'An active metric does not match the trusted schema policy' }, timestamp: iso() }, 400)
    }
    analyticsProperties.set(projectId, [
      ...retainedProperties,
      ...deactivatedProperties,
      ...appliedProperties,
    ])
    analyticsMetrics.set(projectId, [
      ...retainedMetrics,
      ...deactivatedMetrics,
      ...appliedMetrics,
    ])
    const appliedAt = iso()
    packs.set(packKey, {
      packVersion: body.packVersion,
      displayName: body.displayName,
      checksumSha256,
      manifest: body.manifest,
      createdAt: existingPack?.createdAt || iso(),
      updatedAt: appliedAt,
      versions: [{
        packVersion: body.packVersion,
        displayName: body.displayName,
        manifest: body.manifest,
        checksumSha256,
        operation: existingPack ? 'UPDATE' : 'IMPORT',
        appliedAt,
      }, ...(existingPack?.versions || [])],
    })
    analysisPacks.set(projectId, packs)
    return sendJson(response, api({
      projectId,
      packKey,
      packVersion: body.packVersion,
      displayName: body.displayName,
      checksumSha256,
      active: true,
      propertyDefinitionsApplied: properties.length,
      metricDefinitionsApplied: metrics.length,
      updatedAt: iso(),
    }))
  }

  if (endpoint === '/admin/metrics/overview') {
    const rows = requireFilteredEventRows(response, projectId, url)
    if (!rows) return
    const range = metricRange(url)
    const sessionCount = new Set(rows.map(item => item.sessionId).filter(Boolean)).size
    return sendJson(response, api({
      projectId, ...range, devicesInventoryTotal: devices.length,
      devicesActive: new Set(rows.map(item => item.deviceId).filter(Boolean)).size,
      usersActive: new Set(rows.map(item => item.userId).filter(Boolean)).size,
      cloudAccountsCreated: 0, cloudAccountsRecreated: 0,
      sessionsTotal: sessionCount, eventsTotal: rows.length,
      avgSessionDurationMs: 0,
      avgEventsPerSession: sessionCount ? rows.length / sessionCount : 0,
      availableMetricKeys: availableOverviewMetricKeys(projectId),
    }))
  }
  if (endpoint === '/admin/metrics/data-quality') {
    const projectEventRows = qualityRowsFor(projectId, url)
    const totalEvents = projectEventRows.length
    const trustedPolicy = trustedPolicyFor(projectId)
    const governedProperties = (analyticsProperties.get(projectId) || []).filter(item => item.active && !item.sensitive
      && (item.filterable || item.groupable || item.journeyKey || item.allowedValues?.length))
    const inspectedProperties = governedProperties.slice(0, 50)
    const allSchemaVersions = {}
    if (trustedPolicy) {
      for (const row of projectEventRows) {
        const raw = row.properties?.[trustedPolicy.propertyKey]
        const value = raw == null || String(raw).trim() === '' ? '(missing)' : String(raw).trim()
        allSchemaVersions[value] = (allSchemaVersions[value] || 0) + 1
      }
    }
    const schemaVersionEntries = Object.entries(allSchemaVersions)
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    const schemaVersions = Object.fromEntries(schemaVersionEntries.slice(0, 200))
    const propertyCoverage = inspectedProperties.map(definition => {
      let presentEvents = 0
      let typeMismatchEvents = 0
      let disallowedValueEvents = 0
      for (const row of projectEventRows) {
        if (!Object.hasOwn(row.properties || {}, definition.propertyKey)) continue
        presentEvents += 1
        const value = row.properties[definition.propertyKey]
        if (!propertyMatchesType(value, definition.dataType)) {
          typeMismatchEvents += 1
          continue
        }
        if (definition.allowedValues?.length) {
          let normalized
          try { normalized = normalizeFilterValue(value, definition.dataType) } catch { normalized = null }
          if (normalized == null || !definition.allowedValues.includes(normalized)) disallowedValueEvents += 1
        }
      }
      return { propertyKey: definition.propertyKey, presentEvents, typeMismatchEvents, disallowedValueEvents }
    })
    const issues = []
    if (trustedPolicy) {
      appendQualityIssue(issues, 'missing_schema_version', 'warning', allSchemaVersions['(missing)'] || 0, 'Events are missing the trusted schema property')
      const untrusted = Object.entries(allSchemaVersions).filter(([value]) => value !== '(missing)' && !trustedPolicy.trustedValues.includes(value))
        .reduce((total, [, count]) => total + count, 0)
      appendQualityIssue(issues, 'untrusted_schema_value', 'warning', untrusted, 'Schema values are outside the trusted baseline')
      appendQualityIssue(issues, 'schema_version_distribution_truncated', 'warning', schemaVersionEntries.length - 200, 'Schema version distribution is truncated')
    }
    const oversized = projectEventRows.filter(row => Buffer.byteLength(JSON.stringify(row.properties || {}), 'utf8') > maxEventPropertiesBytes).length
    const future = projectEventRows.filter(row => row.eventTimestamp > Date.parse(row.createdAt) + 24 * 3600000).length
    const stale = projectEventRows.filter(row => row.eventTimestamp < Date.parse(row.createdAt) - 366 * 86400000).length
    appendQualityIssue(issues, 'oversized_properties', 'warning', oversized, 'Event properties exceed the current collection budget')
    appendQualityIssue(issues, 'future_event_timestamp', 'error', future, 'Event time is over 24 hours ahead of receipt time')
    appendQualityIssue(issues, 'stale_event_timestamp', 'warning', stale, 'Event time is over 366 days behind receipt time')
    appendQualityIssue(issues, 'property_type_mismatch', 'error', propertyCoverage.reduce((total, item) => total + item.typeMismatchEvents, 0), 'Governed property types are inconsistent')
    appendQualityIssue(issues, 'property_value_outside_allowlist', 'error', propertyCoverage.reduce((total, item) => total + item.disallowedValueEvents, 0), 'Governed property values are outside the allowlist')
    appendQualityIssue(issues, 'property_coverage_truncated', 'warning', governedProperties.length - inspectedProperties.length, 'Governed property coverage is truncated')
    return sendJson(response, api({
      projectId,
      from: url.searchParams.get('from') || iso(-7 * 86400000),
      to: url.searchParams.get('to') || iso(),
      totalEvents,
      trustedSchemaPolicyConfigured: Boolean(trustedPolicy),
      schemaVersionPropertyKey: trustedPolicy?.propertyKey || null,
      schemaVersions,
      schemaVersionDistributionTruncated: schemaVersionEntries.length > 200,
      issues,
      propertyCoverage,
      propertyCoverageTotal: governedProperties.length,
      propertyCoverageTruncated: governedProperties.length > inspectedProperties.length,
    }))
  }
  if (endpoint === '/admin/metrics/trends') {
    const rows = requireFilteredEventRows(response, projectId, url)
    if (!rows) return
    const byDay = new Map()
    for (const row of rows) {
      const day = new Date(row.eventTimestamp).toISOString().slice(0, 10)
      const bucket = byDay.get(day) || { rows: [], devices: new Set(), users: new Set(), sessions: new Set() }
      bucket.rows.push(row)
      if (row.deviceId) bucket.devices.add(row.deviceId)
      if (row.userId) bucket.users.add(row.userId)
      if (row.sessionId) bucket.sessions.add(row.sessionId)
      byDay.set(day, bucket)
    }
    const points = [...byDay.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([time, bucket]) => ({
      time, events: bucket.rows.length, activeDevices: bucket.devices.size, activeUsers: bucket.users.size,
      cloudAccountsCreated: 0, cloudAccountsRecreated: 0, sessions: bucket.sessions.size,
    }))
    return sendJson(response, api({
      projectId,
      granularity: url.searchParams.get('granularity') || 'day',
      ...metricRange(url),
      points,
      availableMetricKeys: availableTrendMetricKeys(projectId),
    }))
  }
  if (endpoint === '/admin/metrics/app-versions') {
    const rows = requireFilteredEventRows(response, projectId, url)
    if (!rows) return
    const latestByDevice = new Map()
    for (const row of rows) {
      if (!row.deviceId || !row.properties?.app_version) continue
      const existing = latestByDevice.get(row.deviceId)
      if (!existing || row.eventTimestamp > existing.eventTimestamp) latestByDevice.set(row.deviceId, row)
    }
    const counts = groupedCounts([...latestByDevice.values()], row => `${row.properties.app_version}\u0000${row.properties.build_number || ''}`)
    const activeDevices = new Set(rows.map(row => row.deviceId).filter(Boolean)).size
    const versionKnownDevices = latestByDevice.size
    const items = [...counts.entries()].map(([key, count]) => {
      const [appVersion, buildNumber] = key.split('\u0000')
      const observed = [...latestByDevice.values()].filter(row => row.properties.app_version === appVersion && String(row.properties.build_number || '') === buildNumber)
      return { appVersion, buildNumber, activeDevices: count, share: versionKnownDevices ? count / versionKnownDevices : 0, lastObservedAt: new Date(Math.max(...observed.map(row => row.eventTimestamp))).toISOString() }
    })
    return sendJson(response, api({ projectId, ...metricRange(url), measurement: 'latest_occurred_event_per_device', activeDevices, versionKnownDevices, coverageRate: activeDevices ? versionKnownDevices / activeDevices : 0, items }))
  }
  if (endpoint === '/admin/metrics/top-events') {
    const rows = requireFilteredEventRows(response, projectId, url)
    if (!rows) return
    const aggregation = url.searchParams.get('aggregation') || 'raw'
    const definitions = semanticState.get(projectId) || []
    const counts = groupedCounts(rows, row => {
      if (aggregation !== 'semantic') return row.eventType
      return definitions.find(item => item.isActive && item.aliases.includes(row.eventType))?.semanticKey || row.eventType
    })
    const limit = Math.max(1, Number(url.searchParams.get('limit') || 20))
    const items = [...counts.entries()].map(([eventType, count]) => ({ eventType, count }))
      .sort((left, right) => right.count - left.count || left.eventType.localeCompare(right.eventType)).slice(0, limit)
    return sendJson(response, api({ projectId, ...metricRange(url), items }))
  }
  if (endpoint === '/admin/events') return sendJson(response, api(paged(projectId, eventRowsFor(projectId))))
  if (endpoint === '/admin/devices') return sendJson(response, api(paged(projectId, devices)))
  if (endpoint === '/admin/sessions') return sendJson(response, api(paged(projectId, sessions)))

  if (endpoint === '/admin/traffic-metrics/summary') return sendJson(response, api({ projectId, rangeStart: iso(-7 * 86400000), rangeEnd: iso(), pageViews: 6842, visitors: 2147 }))
  if (endpoint === '/admin/traffic-metrics/trends') {
    const points = Array.from({ length: 7 }, (_, index) => ({ time: iso(-(6 - index) * 86400000).slice(0, 10), pageViews: 720 + index * 61, visitors: 230 + index * 18 }))
    return sendJson(response, api({ projectId, granularity: url.searchParams.get('granularity') || 'day', rangeStart: iso(-7 * 86400000), rangeEnd: iso(), points }))
  }
  if (endpoint === '/admin/traffic-metrics/top-pages') return sendJson(response, api({ projectId, rangeStart: iso(-7 * 86400000), rangeEnd: iso(), items: [{ key: '/', count: 2310 }, { key: '/features', count: 1488 }, { key: '/pricing', count: 974 }, { key: '/download', count: 655 }] }))
  if (endpoint === '/admin/traffic-metrics') {
    const metricType = url.searchParams.get('metricType') || 'page_view'
    const items = (trafficRows[metricType] || []).map((row) => trafficRecord(row, metricType))
    return sendJson(response, api(paged(projectId, items)))
  }

  if (endpoint === '/admin/counters/metadata/event-types') return sendJson(response, api(catalogFor(projectId).map((item) => item.rawKey)))
  if (endpoint === '/admin/counters' && method === 'GET') return sendJson(response, api({ projectId, items: counters.get(projectId) || [] }))
  const counterMatch = endpoint.match(/^\/admin\/counters\/([^/]+)(?:\/(increment|rebuild))?$/)
  if (counterMatch) {
    const key = decodeURIComponent(counterMatch[1])
    const action = counterMatch[2]
    const list = counters.get(projectId) || []
    const existing = list.find((item) => item.key === key)
    if (method === 'DELETE') {
      counters.set(projectId, list.filter((item) => item.key !== key))
      return sendJson(response, api(null))
    }
    if (method === 'PUT') {
      const body = await readJson(request)
      const record = { ...(existing || { key, value: 0, displayName: null, unit: null, eventTrigger: null, isPublic: false, description: null, lastRebuiltAt: null, lastRebuildEventCount: null }), ...body, updatedAt: iso() }
      counters.set(projectId, [...list.filter((item) => item.key !== key), record])
      return sendJson(response, api(record))
    }
    if (method === 'POST' && existing) {
      if (action === 'increment') existing.value += 1
      if (action === 'rebuild') { existing.value = 12960; existing.lastRebuiltAt = iso(); existing.lastRebuildEventCount = 12960 }
      existing.updatedAt = iso()
      return sendJson(response, api(existing))
    }
    if (method === 'GET') return sendJson(response, api(existing))
  }

  if (endpoint === '/admin/analytics/funnel') {
    const rows = requireFilteredEventRows(response, projectId, url)
    if (!rows) return
    const steps = (url.searchParams.get('steps') || 'app_opened,content_created,content_shared').split(',')
    const groupBy = url.searchParams.get('groupBy')
    const journeyKey = url.searchParams.get('journeyKey')
    const capabilityError = validateMockFunnelCapabilities(projectId, groupBy, journeyKey)
    if (capabilityError) {
      return sendJson(response, { success: false, data: null, error: { code: 'INVALID_ANALYTICS_PROPERTY_FILTER', message: capabilityError }, timestamp: iso() }, 400)
    }
    return sendJson(response, api(buildFunnelResult(
      projectId,
      rows,
      steps,
      metricRange(url),
      groupBy,
      journeyKey,
    )))
  }
  if (endpoint === '/admin/analytics/retention') {
    const cohortEvent = url.searchParams.get('cohortEvent')
    const returnEvent = url.searchParams.get('returnEvent')
    const requestedDays = (url.searchParams.get('days') || '1,7,30').split(',').map(Number).filter(Number.isFinite)
    const retention = retentionWindow(url, requestedDays, 30)
    const rows = requireFilteredEventRows(response, projectId, retention.queryUrl, 30)
    if (!rows) return
    return sendJson(response, api(buildRetentionResult(
      projectId,
      rows,
      cohortEvent,
      returnEvent,
      requestedDays,
      retention.range,
      retention.observationEndMs,
      retention.requestedObservationEndMs,
    )))
  }

  if (endpoint === '/admin/privacy/requests' && method === 'GET') {
    let items = privacyRequests.filter((item) => item.projectId === projectId)
    if (url.searchParams.get('openOnly') === 'true') items = items.filter((item) => !['COMPLETED', 'REJECTED', 'CANCELLED'].includes(item.status))
    for (const field of ['status', 'requestType', 'processor', 'userId']) {
      const value = url.searchParams.get(field)
      if (value) items = items.filter((item) => item[field] === value)
    }
    return sendJson(response, api({ projectId, rangeStart: null, rangeEnd: null, page: 1, pageSize: Number(url.searchParams.get('pageSize') || 20), total: items.length, items }))
  }
  const privacyMatch = endpoint.match(/^\/admin\/privacy\/requests\/([^/]+)(?:\/(activities|notify|execute))?$/)
  if (privacyMatch) {
    const requestId = decodeURIComponent(privacyMatch[1])
    const action = privacyMatch[2]
    const ticket = privacyRequests.find((item) => item.requestId === requestId && item.projectId === projectId)
    if (!ticket) return sendJson(response, { success: false, data: null, error: { code: 'NOT_FOUND', message: 'Mock ticket not found' }, timestamp: iso() }, 404)
    if (method === 'GET' && action === 'activities') return sendJson(response, api(activities.get(requestId) || []))
    if (method === 'GET') return sendJson(response, api(ticket))
    const body = await readJson(request)
    if (method === 'PATCH') {
      const fromStatus = ticket.status
      Object.assign(ticket, body, { version: ticket.version + 1, updatedAt: iso(), processedAt: iso() })
      activities.get(requestId)?.push({ activityId: `act-${Date.now()}`, activityType: 'STATUS_CHANGED', fromStatus, toStatus: ticket.status, actor: body.operator || 'mock-operator', details: { note: body.operatorNote }, createdAt: iso() })
      return sendJson(response, api(ticket))
    }
    if (method === 'POST' && action === 'notify') return sendJson(response, api({ requestId, notificationId: `notify-${Date.now()}`, status: 'QUEUED' }))
    if (method === 'POST' && action === 'execute') {
      ticket.status = 'COMPLETED'; ticket.operator = body.operator; ticket.version += 1; ticket.processedAt = iso(); ticket.closedAt = iso(); ticket.updatedAt = iso()
      const exportData = ticket.requestType === 'EXPORT' ? { user: { userId: ticket.userId }, events: eventRowsFor(projectId).slice(0, 3), generatedBy: 'AnalyticsHub mock' } : null
      ticket.resultPayload = ticket.requestType === 'EXPORT' ? { records: 3 } : { anonymized: true, auditRetained: true }
      return sendJson(response, api({ requestId, requestType: ticket.requestType, status: 'COMPLETED', executedAt: iso(), version: ticket.version, downloadFileName: exportData ? `${requestId}.json` : null, summary: ticket.resultPayload, exportData }))
    }
  }

  return sendJson(response, { success: false, data: null, error: { code: 'MOCK_NOT_IMPLEMENTED', message: `Mock endpoint not implemented: ${method} ${endpoint}` }, timestamp: iso() }, 404)
}

const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon',
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`)
    if (url.pathname === '/__mock/requests') return sendJson(response, api(requestLog))
    if (url.pathname.startsWith('/analyticshub/api/')) return await handleApi(request, response, url)

    const appPath = url.pathname.startsWith('/analyticshub/')
      ? url.pathname.slice('/analyticshub'.length)
      : url.pathname
    const requestedPath = appPath === '/' ? '/index.html' : appPath
    let filePath = path.join(distRoot, requestedPath)
    try {
      const details = await stat(filePath)
      if (!details.isFile()) filePath = path.join(distRoot, 'index.html')
    } catch {
      filePath = path.join(distRoot, 'index.html')
    }
    const body = await readFile(filePath)
    response.writeHead(200, { 'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream' })
    response.end(body)
  } catch (error) {
    sendJson(response, { success: false, data: null, error: { code: 'MOCK_ERROR', message: error.message }, timestamp: iso() }, 500)
  }
})

server.listen(port, host, () => {
  console.log(`AnalyticsHub mock preview: http://${host}:${port}/analyticshub/login`)
  console.log('Admin token: demo-admin-token')
  console.log('Data resets when this process restarts.')
})
