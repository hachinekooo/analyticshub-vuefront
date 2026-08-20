import snap from '@interactjs/modifiers/snap/pointer'
import snapSize from '@interactjs/modifiers/snap/size'
import type { SnapFunction } from '@interactjs/modifiers/snap/pointer'
import { DASHBOARD_GRID } from './dashboardGridContract'

export interface DashboardGridPreview {
  i: string
  x: number
  y: number
  w: number
  h: number
}

export const dashboardGridColumnPitch = (containerWidth: number) =>
  (containerWidth - DASHBOARD_GRID.gap) / DASHBOARD_GRID.columns

export const snapDashboardGridDelta = (x: number, y: number, containerWidth: number) => {
  const columnPitch = dashboardGridColumnPitch(containerWidth)
  const rowPitch = DASHBOARD_GRID.rowHeight + DASHBOARD_GRID.gap
  return {
    x: Math.round(x / columnPitch) * columnPitch,
    y: Math.round(y / rowPitch) * rowPitch,
  }
}

export const dashboardGridPreviewStyle = (preview: DashboardGridPreview) => {
  const horizontalStart = preview.x / DASHBOARD_GRID.columns
  const horizontalSpan = preview.w / DASHBOARD_GRID.columns
  const rowPitch = DASHBOARD_GRID.rowHeight + DASHBOARD_GRID.gap
  return {
    left: `calc(${horizontalStart * 100}% + ${DASHBOARD_GRID.gap * (1 - horizontalStart)}px)`,
    top: `${DASHBOARD_GRID.gap + preview.y * rowPitch}px`,
    width: `calc(${horizontalSpan * 100}% - ${DASHBOARD_GRID.gap * (1 + horizontalSpan)}px)`,
    height: `${preview.h * rowPitch - DASHBOARD_GRID.gap}px`,
  }
}

const dashboardGridSnapTarget: SnapFunction = (x, y, interaction) => {
  const element = interaction.element as HTMLElement | null
  const container = element?.offsetParent as HTMLElement | null
  const containerWidth = container?.clientWidth ?? 0
  if (containerWidth <= DASHBOARD_GRID.gap) return { x, y, range: Infinity }
  return { ...snapDashboardGridDelta(x, y, containerWidth), range: Infinity }
}

/** 本体与落点共用离散位移，避免组件连续移动而占位框滞后跳变。 */
export const dashboardGridDragOption = {
  modifiers: [snap({
    targets: [dashboardGridSnapTarget],
    offset: 'startCoords',
    range: Infinity,
  })],
}

/** 缩放尺寸按同一网格步长变化，与保存的 w/h 保持一致。 */
export const dashboardGridResizeOption = {
  modifiers: [snapSize({
    targets: [dashboardGridSnapTarget],
    offset: 'startCoords',
    range: Infinity,
  })],
}
