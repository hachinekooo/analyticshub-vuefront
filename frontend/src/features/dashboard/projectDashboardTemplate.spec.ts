import { describe, expect, it } from 'vitest'
import { cloneDashboardLayout, dashboardSpacesForTemplate } from './projectDashboardTemplate'

describe('project dashboard templates', () => {
  it('keeps app product analytics separate from website traffic analytics', () => {
    const appSpaces = dashboardSpacesForTemplate('app')
    const websiteSpaces = dashboardSpacesForTemplate('website')

    expect(appSpaces.map((space) => space.key)).toEqual(['overview', 'details'])
    expect(appSpaces[0]?.defaultLayout.map((item) => item.type)).not.toContain('core.trafficTrends')
    expect(appSpaces[1]?.defaultLayout.map((item) => item.type)).not.toContain('core.traffic')
    expect(websiteSpaces.map((space) => space.key)).toEqual(['overview', 'details'])
    expect(websiteSpaces[0]?.defaultLayout.map((item) => item.type)).toContain('core.trafficTrends')
    expect(websiteSpaces[1]?.defaultLayout.map((item) => item.type)).toEqual(['core.traffic'])
  })

  it('combines product and website records only for the webapp template', () => {
    const spaces = dashboardSpacesForTemplate('webapp')

    expect(spaces.map((space) => space.key)).toEqual(['overview', 'details'])
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
