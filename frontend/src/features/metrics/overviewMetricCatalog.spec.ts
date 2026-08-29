import { describe, expect, it } from 'vitest'
import {
  OVERVIEW_METRIC_KEYS,
  resolveOverviewMetricKeys,
  resolveTrendMetricKeys,
} from './overviewMetricCatalog'

describe('overview metric catalog', () => {
  it('does not infer unsupported cloud-account metrics for an unconfigured app', () => {
    expect(resolveOverviewMetricKeys(undefined, [
      OVERVIEW_METRIC_KEYS.activeDevices,
      OVERVIEW_METRIC_KEYS.activeActors,
    ])).toEqual([
      OVERVIEW_METRIC_KEYS.activeDevices,
      OVERVIEW_METRIC_KEYS.activeActors,
    ])
  })

  it('keeps the backend declared default order', () => {
    expect(resolveOverviewMetricKeys(undefined, [
      OVERVIEW_METRIC_KEYS.eventOccurrences,
      OVERVIEW_METRIC_KEYS.activeDevices,
    ])).toEqual([
      OVERVIEW_METRIC_KEYS.eventOccurrences,
      OVERVIEW_METRIC_KEYS.activeDevices,
    ])
  })

  it('does not infer metrics when the backend declares none', () => {
    expect(resolveOverviewMetricKeys(undefined, [])).toEqual([])
    expect(resolveTrendMetricKeys([])).toEqual([])
  })

  it('preserves the explicit dashboard order and removes unavailable metrics', () => {
    expect(resolveOverviewMetricKeys([
      OVERVIEW_METRIC_KEYS.accountCreated,
      OVERVIEW_METRIC_KEYS.activeDevices,
      OVERVIEW_METRIC_KEYS.accountRecreated,
    ], [
      OVERVIEW_METRIC_KEYS.activeDevices,
      OVERVIEW_METRIC_KEYS.accountCreated,
    ])).toEqual([
      OVERVIEW_METRIC_KEYS.accountCreated,
      OVERVIEW_METRIC_KEYS.activeDevices,
    ])
  })
})
