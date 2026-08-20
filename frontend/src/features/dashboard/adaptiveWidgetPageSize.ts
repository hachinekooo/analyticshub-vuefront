import { dashboardGridItemPixelHeight } from './dashboardGridContract'

const tablePageSizePolicies = {
  'core.events': { referenceHeight: 12 },
  'core.devices': { referenceHeight: 14 },
  'core.sessions': { referenceHeight: 10 },
  'core.traffic': { referenceHeight: 14 },
} as const

export type AdaptiveTableWidgetType = keyof typeof tablePageSizePolicies

const BASE_PAGE_SIZE = 10
const MIN_PAGE_SIZE = 5
const MAX_PAGE_SIZE = 100
const COMPACT_TABLE_ROW_HEIGHT = 32

export const isAdaptiveTableWidget = (type: string): type is AdaptiveTableWidgetType =>
  Object.prototype.hasOwnProperty.call(tablePageSizePolicies, type)

/** 先扣除组件固定区域，再按表格行高估算真实容量；请求只在缩放结束后触发。 */
export const adaptiveWidgetPageSize = (type: string, height: number): number | null => {
  if (!isAdaptiveTableWidget(type) || !Number.isFinite(height)) return null
  const referenceHeight = tablePageSizePolicies[type].referenceHeight
  const fixedContentHeight = dashboardGridItemPixelHeight(referenceHeight)
    - BASE_PAGE_SIZE * COMPACT_TABLE_ROW_HEIGHT
  const availableTableHeight = dashboardGridItemPixelHeight(height) - fixedContentHeight
  const rowCapacity = Math.floor(availableTableHeight / COMPACT_TABLE_ROW_HEIGHT)
  return Math.min(MAX_PAGE_SIZE, Math.max(MIN_PAGE_SIZE, rowCapacity))
}

/** 旧布局可正常加载，但固定值不再参与分页；新版保存时移除它以消除双重真相。 */
export const withoutLegacyFixedPageSize = (
  type: string,
  config: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined => {
  if (!isAdaptiveTableWidget(type) || !config || !('pageSize' in config)) return config
  const remaining = { ...config }
  delete remaining.pageSize
  return Object.keys(remaining).length > 0 ? remaining : undefined
}
