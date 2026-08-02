import type { ProjectAnalysisTemplate } from '@/api/admin'

export type DashboardSpaceKey = 'app' | 'website' | 'product' | 'details' | 'custom'

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
  labelKey: string
  displayName: Readonly<Record<string, string>>
  description: string
  defaultLayout: readonly DashboardLayoutItem[]
  widgetTemplates: readonly DashboardLayoutItem[]
  detailFilters: boolean
}

const appLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 12, h: 4, i: 'overview_default', type: 'core.overview', minW: 6, minH: 3 },
  { x: 0, y: 4, w: 8, h: 10, i: 'trends_default', type: 'core.trends', minW: 4, minH: 6 },
  { x: 8, y: 4, w: 4, h: 10, i: 'topEvents_default', type: 'core.topEvents', minW: 3, minH: 6 },
]

const websiteLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 7, h: 10, i: 'trafficTrends_default', type: 'core.trafficTrends', minW: 4, minH: 6 },
  { x: 7, y: 0, w: 5, h: 10, i: 'rankings_default', type: 'core.topPages', minW: 4, minH: 6 },
]

const productLayout: readonly DashboardLayoutItem[] = [
  ...appLayout,
]

const detailsLayout: readonly DashboardLayoutItem[] = [
  { x: 0, y: 0, w: 6, h: 12, i: 'events_default', type: 'core.events', minW: 4, minH: 8 },
  { x: 6, y: 0, w: 6, h: 12, i: 'traffic_default', type: 'core.traffic', minW: 4, minH: 8 },
  { x: 0, y: 12, w: 6, h: 10, i: 'devices_default', type: 'core.devices', minW: 4, minH: 6 },
  { x: 6, y: 12, w: 6, h: 10, i: 'sessions_default', type: 'core.sessions', minW: 4, minH: 6 },
]

const productWidgets: readonly DashboardLayoutItem[] = [
  ...productLayout,
  { x: 0, y: 0, w: 12, h: 10, i: 'productFunnel_template', type: 'core.productFunnel', minW: 6, minH: 6 },
  { x: 0, y: 0, w: 6, h: 10, i: 'retention_template', type: 'core.retention', minW: 4, minH: 6 },
  { x: 0, y: 0, w: 12, h: 8, i: 'counters_template', type: 'core.counters', minW: 4, minH: 4 },
]

const spaceDefinitions: Readonly<Record<DashboardSpaceKey, DashboardSpaceDefinition>> = {
  app: {
    key: 'app',
    labelKey: 'metrics.spaces.app',
    displayName: { 'zh-CN': 'APP 运营', en: 'App Operations' },
    description: 'Application product behavior dashboard',
    defaultLayout: appLayout,
    widgetTemplates: productWidgets,
    detailFilters: false,
  },
  website: {
    key: 'website',
    labelKey: 'metrics.spaces.website',
    displayName: { 'zh-CN': '网站流量', en: 'Website Traffic' },
    description: 'Website traffic dashboard',
    defaultLayout: websiteLayout,
    widgetTemplates: websiteLayout,
    detailFilters: false,
  },
  product: {
    key: 'product',
    labelKey: 'metrics.spaces.product',
    displayName: { 'zh-CN': '产品运营', en: 'Product Operations' },
    description: 'Web application product behavior dashboard',
    defaultLayout: productLayout,
    widgetTemplates: productWidgets,
    detailFilters: false,
  },
  details: {
    key: 'details',
    labelKey: 'metrics.spaces.details',
    displayName: { 'zh-CN': '明细数据', en: 'Detailed Data' },
    description: 'Project event, device, session, and traffic records',
    defaultLayout: detailsLayout,
    widgetTemplates: detailsLayout,
    detailFilters: true,
  },
  custom: {
    key: 'custom',
    labelKey: 'metrics.spaces.custom',
    displayName: { 'zh-CN': '自定义工作台', en: 'Custom Workspace' },
    description: 'Blank project dashboard',
    defaultLayout: [],
    widgetTemplates: productWidgets,
    detailFilters: false,
  },
}

const templateSpaces: Readonly<Record<ProjectAnalysisTemplate, readonly DashboardSpaceKey[]>> = {
  app: ['app', 'details'],
  website: ['website', 'details'],
  webapp: ['product', 'website', 'details'],
  blank: ['custom', 'details'],
}

/** Returns the stable workspace contract initialized by a project's analysis template. */
export const dashboardSpacesForTemplate = (template: ProjectAnalysisTemplate) =>
  templateSpaces[template].map((key) => spaceDefinitions[key])

export const cloneDashboardLayout = (layout: readonly DashboardLayoutItem[]) =>
  JSON.parse(JSON.stringify(layout)) as DashboardLayoutItem[]
