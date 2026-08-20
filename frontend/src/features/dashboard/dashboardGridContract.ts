export const DASHBOARD_GRID = {
  columns: 12,
  rowHeight: 30,
  gap: 10,
} as const

/** 网格项高度包含每行高度和行间距；分页容量与画布吸附共用同一尺寸契约。 */
export const dashboardGridItemPixelHeight = (height: number) =>
  Math.max(1, height) * DASHBOARD_GRID.rowHeight
  + Math.max(0, height - 1) * DASHBOARD_GRID.gap
