import { describe, expect, it } from 'vitest'
import type { AdminDashboard } from '@/api/dashboard'
import {
  cloneDashboardLayout,
  dashboardSpacesForProject,
  dashboardSpacesForTemplate,
} from './projectDashboardTemplate'

describe('project dashboard templates', () => {
  it('keeps app product analytics separate from website traffic analytics', () => {
    const appSpaces = dashboardSpacesForTemplate('app')
    const websiteSpaces = dashboardSpacesForTemplate('website')

    expect(appSpaces.map((space) => space.key)).toEqual(['overview', 'details'])
    expect(appSpaces[0]?.defaultLayout.map((item) => item.type)).not.toContain('core.trafficTrends')
    expect(appSpaces[1]?.defaultLayout.map((item) => item.type)).not.toContain('core.traffic')
    expect(websiteSpaces.map((space) => space.key)).toEqual(['overview', 'details'])
    expect(websiteSpaces[0]?.defaultLayout.map((item) => item.type)).toContain('core.trafficOverview')
    expect(websiteSpaces[0]?.defaultLayout.map((item) => item.type)).toContain('core.trafficTrends')
    expect(websiteSpaces[0]?.defaultLayout.map((item) => item.type)).toContain('core.topReferrers')
    expect(websiteSpaces[1]?.defaultLayout.map((item) => item.type)).toEqual(['core.traffic'])
  })

  it('combines product and website records only for the webapp template', () => {
    const spaces = dashboardSpacesForTemplate('webapp')

    expect(spaces.map((space) => space.key)).toEqual(['overview', 'details'])
    expect(spaces[0]?.defaultLayout.map((item) => item.type)).toContain('core.trafficOverview')
    expect(spaces[0]?.defaultLayout.map((item) => item.type)).toContain('core.trafficTrends')
    expect(spaces[1]?.defaultLayout.map((item) => item.type)).toEqual([
      'core.events', 'core.traffic', 'core.devices', 'core.sessions',
    ])
  })

  it('returns a detached layout for editing', () => {
    const source = dashboardSpacesForTemplate('app')[0]!.defaultLayout
    const cloned = cloneDashboardLayout(source)

    cloned[0]!.w = 1
    expect(source[0]!.w).toBe(12)
  })
})

const dashboard = (key: string, active = true): AdminDashboard => ({
  projectId: 'demo',
  dashboardKey: key,
  displayName: { 'zh-CN': key === 'survey-insights' ? '调研分析' : '运营看板' },
  description: `${key} description`,
  schemaVersion: 2,
  definition: {
    schemaVersion: 2,
    defaultRange: '30d',
    widgets: [{
      id: `${key}-metric`,
      type: 'core.governedMetric',
      layout: { x: 0, y: 0, w: 6, h: 8 },
      config: { metricKey: 'demo.metric' },
    }],
  },
  revision: 1,
  isDefault: key === 'overview',
  isActive: active,
  createdAt: '2026-08-30T00:00:00Z',
  updatedAt: '2026-08-30T00:00:00Z',
})

describe('dashboardSpacesForProject', () => {
  it('adds active project-declared dashboards after the built-in workspaces', () => {
    const spaces = dashboardSpacesForProject('app', [
      dashboard('overview'),
      dashboard('survey-insights'),
      dashboard('inactive-topic', false),
    ])

    expect(spaces.map((space) => space.key)).toEqual(['overview', 'details', 'survey-insights'])
    expect(spaces[0]?.defaultLayout[0]?.i).toBe('overview-metric')
    expect(spaces[2]?.displayName['zh-CN']).toBe('调研分析')
    expect(spaces[2]?.defaultLayout[0]?.config).toEqual({ metricKey: 'demo.metric' })
  })

  it('keeps declared workspaces visible even when their widgets currently have no data', () => {
    const spaces = dashboardSpacesForProject('app', [dashboard('survey-insights')])

    expect(spaces.some((space) => space.key === 'survey-insights')).toBe(true)
  })
})
