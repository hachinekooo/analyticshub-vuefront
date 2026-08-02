import http from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const host = '127.0.0.1'
const port = Number(process.env.ANALYTICSHUB_MOCK_PORT || 4173)
const distRoot = fileURLToPath(new URL('../dist', import.meta.url))
const now = Date.now()
const iso = (offsetMs = 0) => new Date(now + offsetMs).toISOString()
const timestamp = (offsetMs = 0) => now + offsetMs

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
  ['evt-1001', 'letter_created', 'user-001', 'device-ios-001', 'session-001', -5 * 60000, { source: 'composer', template: 'classic' }],
  ['evt-1002', 'letter_shared', 'user-001', 'device-ios-001', 'session-001', -4 * 60000, { channel: 'image' }],
  ['evt-1003', 'subscription_viewed', 'user-002', 'device-ios-002', 'session-002', -50 * 60000, { placement: 'settings' }],
  ['evt-1004', 'letter_done_v2', 'user-003', 'device-ios-003', 'session-003', -2 * 3600000, { source: 'quick_action' }],
  ['evt-1005', 'app_opened', null, 'device-ios-004', 'session-004', -3 * 3600000, { coldStart: true }],
].map(([eventId, eventType, userId, deviceId, sessionId, offset, properties]) => ({
  eventId, eventType, userId, deviceId, sessionId,
  eventTimestamp: timestamp(offset),
  createdAt: iso(offset),
  properties,
}))

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
    semanticKey: 'letter.completed',
    displayName: { 'zh-CN': '完成信件', en: 'Letter completed' },
    category: 'letter',
    description: 'All event keys representing a completed letter.',
    isActive: true,
    aliases: ['letter_created', 'letter_done_v2'],
    createdAt: iso(-10 * 86400000),
    updatedAt: iso(-3600000),
  },
  {
    projectId: project.projectId,
    sourceKind: 'EVENT_TYPE',
    semanticKey: 'letter.shared',
    displayName: { 'zh-CN': '分享信件', en: 'Letter shared' },
    category: 'letter',
    description: 'Letter export or share completed.',
    isActive: true,
    aliases: ['letter_shared'],
    createdAt: iso(-9 * 86400000),
    updatedAt: iso(-7200000),
  },
]]))

const counters = new Map(projects.map((project) => [project.projectId, [
  {
    key: 'letters_completed_total',
    value: 12846,
    displayName: { 'zh-CN': '累计完成信件', en: 'Letters completed' },
    unit: { 'zh-CN': '封', en: 'letters' },
    eventTrigger: { event_types: ['letter_created', 'letter_done_v2'] },
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
    eventTrigger: { event_type: 'letter_shared' },
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
  const rawCounts = new Map([
    ['letter_created', 684], ['letter_done_v2', 93], ['letter_shared', 216],
    ['subscription_viewed', 87], ['app_opened', 1204],
  ])
  return [...rawCounts].map(([rawKey, eventCount], index) => {
    const definition = definitions.find((item) => item.isActive && item.aliases.includes(rawKey))
    return {
      rawKey,
      semanticKey: definition?.semanticKey || null,
      mapped: Boolean(definition),
      displayName: definition?.displayName || null,
      category: definition?.category || null,
      description: definition?.description || null,
      eventCount,
      firstSeenAt: iso(-(index + 4) * 86400000),
      lastSeenAt: iso(-index * 3600000),
    }
  })
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
      schemaVersion: '8', pendingMigrations: 0, historyTable: 'analytics_schema_history', errorCode: null, error: null,
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
    const record = {
      projectId, sourceKind: body.sourceKind, semanticKey, displayName: body.displayName,
      category: body.category || null, description: body.description || null, isActive: body.isActive,
      aliases: body.aliasMode === 'PRESERVE' ? (existing?.aliases || []) : (body.aliases || []),
      createdAt: existing?.createdAt || iso(), updatedAt: iso(),
    }
    semanticState.set(projectId, [...list.filter((item) => item.semanticKey !== semanticKey), record])
    return sendJson(response, api(record))
  }
  if (semanticMatch && method === 'DELETE') {
    const semanticKey = decodeURIComponent(semanticMatch[1])
    semanticState.set(projectId, (semanticState.get(projectId) || []).filter((item) => item.semanticKey !== semanticKey))
    return sendJson(response, api({ projectId, semanticKey, message: 'Deleted in mock environment' }))
  }

  if (endpoint === '/admin/metrics/overview') {
    return sendJson(response, api({ projectId, rangeStart: iso(-7 * 86400000), rangeEnd: iso(), devicesTotal: 1842, devicesActive: 638, usersActive: 512, sessionsTotal: 2964, eventsTotal: 18734, avgSessionDurationMs: 284000, avgEventsPerSession: 6.32 }))
  }
  if (endpoint === '/admin/metrics/trends') {
    const points = Array.from({ length: 7 }, (_, index) => ({ time: iso(-(6 - index) * 86400000).slice(0, 10), events: 1800 + index * 170 + (index % 2) * 260, sessions: 310 + index * 37 }))
    return sendJson(response, api({ projectId, granularity: url.searchParams.get('granularity') || 'day', rangeStart: iso(-7 * 86400000), rangeEnd: iso(), points }))
  }
  if (endpoint === '/admin/metrics/top-events') {
    return sendJson(response, api({ projectId, rangeStart: iso(-7 * 86400000), rangeEnd: iso(), items: catalogFor(projectId).map((item) => ({ eventType: item.rawKey, count: item.eventCount })) }))
  }
  if (endpoint === '/admin/events') return sendJson(response, api(paged(projectId, eventRows)))
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
    const steps = (url.searchParams.get('steps') || 'app_opened,letter_created,letter_shared').split(',')
    return sendJson(response, api({ projectId, rangeStart: iso(-7 * 86400000), rangeEnd: iso(), steps, groupBy: null, attributionModel: 'ordered', groups: [{ groupValue: 'all', steps: steps.map((eventType, index) => ({ stepIndex: index, eventType, users: [620, 384, 171][index] || 120, conversionRate: [1, 0.619, 0.445][index] || 0.3, dropOffRate: [0, 0.381, 0.555][index] || 0.7 })) }] }))
  }
  if (endpoint === '/admin/analytics/retention') return sendJson(response, api({ projectId, rangeStart: iso(-30 * 86400000), rangeEnd: iso(), cohortEvent: url.searchParams.get('cohortEvent'), returnEvent: url.searchParams.get('returnEvent'), cohortUsers: 540, buckets: [{ day: 1, retainedUsers: 302, retentionRate: 0.559 }, { day: 7, retainedUsers: 188, retentionRate: 0.348 }, { day: 30, retainedUsers: 92, retentionRate: 0.17 }] }))

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
      const exportData = ticket.requestType === 'EXPORT' ? { user: { userId: ticket.userId }, events: eventRows.slice(0, 3), generatedBy: 'AnalyticsHub mock' } : null
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
