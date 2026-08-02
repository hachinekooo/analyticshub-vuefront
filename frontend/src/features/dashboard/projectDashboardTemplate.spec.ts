import { describe, expect, it } from 'vitest'
import { cloneDashboardLayout, dashboardSpacesForTemplate } from './projectDashboardTemplate'

describe('project dashboard templates', () => {
  it('keeps app product analytics separate from website traffic analytics', () => {
    const appSpaces = dashboardSpacesForTemplate('app')
    const websiteSpaces = dashboardSpacesForTemplate('website')

    expect(appSpaces.map((space) => space.key)).toEqual(['app', 'details'])
    expect(appSpaces[0]?.defaultLayout.map((item) => item.type)).not.toContain('core.trafficTrends')
    expect(websiteSpaces.map((space) => space.key)).toEqual(['website', 'details'])
    expect(websiteSpaces[0]?.defaultLayout.map((item) => item.type)).toContain('core.trafficTrends')
  })

  it('gives web apps both product and traffic workspaces', () => {
    expect(dashboardSpacesForTemplate('webapp').map((space) => space.key))
      .toEqual(['product', 'website', 'details'])
  })

  it('returns a detached layout for editing', () => {
    const source = dashboardSpacesForTemplate('app')[0]!.defaultLayout
    const cloned = cloneDashboardLayout(source)

    cloned[0]!.w = 1
    expect(source[0]!.w).toBe(12)
  })
})
