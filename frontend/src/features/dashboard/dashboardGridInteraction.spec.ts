import { describe, expect, it } from 'vitest'
import {
  dashboardGridColumnPitch,
  dashboardGridPreviewStyle,
  snapDashboardGridDelta,
} from './dashboardGridInteraction'

describe('dashboard grid interaction', () => {
  it('uses the same horizontal pitch as the twelve-column canvas', () => {
    expect(dashboardGridColumnPitch(1354)).toBe(112)
  })

  it('keeps movement in place before the midpoint and then advances one grid unit', () => {
    expect(snapDashboardGridDelta(55, 19, 1354)).toEqual({ x: 0, y: 0 })
    expect(snapDashboardGridDelta(57, 21, 1354)).toEqual({ x: 112, y: 40 })
  })

  it('snaps reverse movement symmetrically', () => {
    expect(snapDashboardGridDelta(-57, -21, 1354)).toEqual({ x: -112, y: -40 })
  })

  it('places the host preview on the same grid geometry as a grid item', () => {
    expect(dashboardGridPreviewStyle({ i: 'events', x: 0, y: 2, w: 6, h: 12 })).toEqual({
      left: 'calc(0% + 10px)',
      top: '90px',
      width: 'calc(50% - 15px)',
      height: '470px',
    })
  })
})
