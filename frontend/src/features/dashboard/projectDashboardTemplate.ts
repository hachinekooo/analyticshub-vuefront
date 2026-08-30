import type { ProjectAnalysisTemplate } from '@/api/admin'
import type { AdminDashboard } from '@/api/dashboard'

export type DashboardSpaceKey = string

export interface DashboardLayoutItem {
  x: number
  y: number
  w: number
  h: number
  i: string
  type?: string
  config?: Record<string, unknown>
  minW?: number
  minH?: number
}

export interface DashboardSpaceDefinition {
  key: DashboardSpaceKey
  labelKey?: string
  displayName: Readonly<Record<string, string>>
  description: string
  defaultLayout: readonly DashboardLayoutItem[]
  widgetTemplates: readonly DashboardLayoutItem[]
  detailFilters: boolean
  projectDeclared?: boolean
}

const appLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 12, h: 4, i: 'overview_default', type: 'core.overview', minW: 6, minH: 3 },
  { x: 0, y: 4, w: 8, h: 10, i: 'trends_default', type: 'core.trends', minW: 4, minH: 6 },
  {
    x: 8, y: 4, w: 4, h: 10, i: 'topEvents_default', type: 'core.topEvents', minW: 3, minH: 6,
    config: { aggregation: 'semantic' },
  },
]

const websiteLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 12, h: 5, i: 'trafficOverview_default', type: 'core.trafficOverview', minW: 6, minH: 4 },
  { x: 0, y: 5, w: 7, h: 10, i: 'trafficTrends_default', type: 'core.trafficTrends', minW: 4, minH: 6 },
  { x: 7, y: 5, w: 5, h: 10, i: 'rankings_default', type: 'core.topPages', minW: 4, minH: 6 },
  { x: 0, y: 15, w: 12, h: 8, i: 'referrers_default', type: 'core.topReferrers', minW: 4, minH: 6 },
]

const appDetailsLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 6, h: 12, i: 'events_default', type: 'core.events', minW: 4, minH: 8 },
  { x: 6, y: 0, w: 6, h: 14, i: 'devices_default', type: 'core.devices', minW: 4, minH: 8 },
  { x: 6, y: 14, w: 6, h: 10, i: 'sessions_default', type: 'core.sessions', minW: 4, minH: 6 },
]

const websiteDetailsLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 12, h: 14, i: 'traffic_default', type: 'core.traffic', minW: 6, minH: 8 },
]

const webAppLayout: readonly DashboardLayoutItem[] = [
  ...appLayout,
  ...websiteLayout.map((item) => ({ ...item, y: item.y + 14 })),
]

const webAppDetailsLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 6, h: 12, i: 'events_default', type: 'core.events', minW: 4, minH: 8 },
  { x: 6, y: 0, w: 6, h: 12, i: 'traffic_default', type: 'core.traffic', minW: 4, minH: 8 },
  { x: 0, y: 12, w: 6, h: 14, i: 'devices_default', type: 'core.devices', minW: 4, minH: 8 },
  { x: 6, y: 12, w: 6, h: 10, i: 'sessions_default', type: 'core.sessions', minW: 4, minH: 6 },
]

const productWidgets: readonly DashboardLayoutItem[] = [
  ...appLayout,
  { x: 0, y: 0, w: 12, h: 10, i: 'productFunnel_template', type: 'core.productFunnel', minW: 6, minH: 6 },
  { x: 0, y: 0, w: 6, h: 10, i: 'retention_template', type: 'core.retention', minW: 4, minH: 6 },
  { x: 0, y: 0, w: 12, h: 8, i: 'counters_template', type: 'core.counters', minW: 4, minH: 4 },
  { x: 0, y: 0, w: 6, h: 8, i: 'governedMetric_template', type: 'core.governedMetric', minW: 4, minH: 5 },
]

const buildSpaceDefinitions = (
  overviewLayout: readonly DashboardLayoutItem[],
  overviewWidgets: readonly DashboardLayoutItem[],
  detailsLayout: readonly DashboardLayoutItem[],
): readonly DashboardSpaceDefinition[] => [
  {
    key: 'overview',
    labelKey: 'metrics.spaces.overview',
    displayName: { 'zh-CN': '数据大屏', en: 'Dashboard' },
    description: 'Customizable project trends and analysis workspace',
    defaultLayout: overviewLayout,
    widgetTemplates: overviewWidgets,
    detailFilters: false,
  },
  {
    key: 'details',
    labelKey: 'metrics.spaces.details',
    displayName: { 'zh-CN': '明细数据', en: 'Detailed Data' },
    description: 'Customizable raw-record workspace supported by the selected project template',
    defaultLayout: detailsLayout,
    widgetTemplates: detailsLayout,
    detailFilters: true,
  },
]

const templateSpaces: Readonly<Record<ProjectAnalysisTemplate, readonly DashboardSpaceDefinition[]>> = {
  app: buildSpaceDefinitions(appLayout, productWidgets, appDetailsLayout),
  website: buildSpaceDefinitions(websiteLayout, websiteLayout, websiteDetailsLayout),
  webapp: buildSpaceDefinitions(webAppLayout, [...productWidgets, ...websiteLayout], webAppDetailsLayout),
  blank: buildSpaceDefinitions([], productWidgets, []),
}

/** Returns the stable workspace contract initialized by a project's analysis template. */
export const dashboardSpacesForTemplate = (template: ProjectAnalysisTemplate) =>
  templateSpaces[template]

const dashboardLayoutFromDefinition = (dashboard: AdminDashboard): DashboardLayoutItem[] =>
  dashboard.definition.widgets.map((widget) => ({
    i: widget.id,
    type: widget.type,
    config: widget.config ? JSON.parse(JSON.stringify(widget.config)) : undefined,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW,
    minH: widget.layout.minH,
  }))

/**
 * 合并模板自带工作区与项目声明的 Dashboard。入口由显式配置决定，
 * 不依赖查询窗口内是否已经产生事件，避免空数据导致导航忽隐忽现。
 */
export const dashboardSpacesForProject = (
  template: ProjectAnalysisTemplate,
  dashboards: readonly AdminDashboard[],
): readonly DashboardSpaceDefinition[] => {
  const activeDashboards = dashboards.filter((dashboard) => dashboard.isActive)
  const activeByKey = new Map(activeDashboards.map((dashboard) => [dashboard.dashboardKey, dashboard]))
  const builtInSpaces = dashboardSpacesForTemplate(template).map((space) => {
    const dashboard = activeByKey.get(space.key)
    if (!dashboard || space.detailFilters) return space
    return {
      ...space,
      displayName: dashboard.displayName,
      description: dashboard.description || space.description,
      defaultLayout: dashboardLayoutFromDefinition(dashboard),
    }
  })
  const builtInKeys = new Set(builtInSpaces.map((space) => space.key))
  const declaredSpaces = activeDashboards
    .filter((dashboard) => !builtInKeys.has(dashboard.dashboardKey))
    .map((dashboard): DashboardSpaceDefinition => ({
      key: dashboard.dashboardKey,
      displayName: dashboard.displayName,
      description: dashboard.description || '',
      defaultLayout: dashboardLayoutFromDefinition(dashboard),
      widgetTemplates: productWidgets,
      detailFilters: false,
      projectDeclared: true,
    }))
  return [...builtInSpaces, ...declaredSpaces]
}

export const cloneDashboardLayout = (layout: readonly DashboardLayoutItem[]) =>
  JSON.parse(JSON.stringify(layout)) as DashboardLayoutItem[]
