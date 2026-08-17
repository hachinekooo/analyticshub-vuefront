import type { AppVersionDistributionItem } from '@/api/metrics'

export type ActiveAppVersionSummary = {
  appVersion: string
  activeDevices: number
  lastObservedAt: string
}

/** Builds in the same public App version belong to one operational version cohort. */
export const findTopActiveAppVersion = (
  items: readonly AppVersionDistributionItem[],
): ActiveAppVersionSummary | null => {
  const versions = new Map<string, ActiveAppVersionSummary>()
  for (const item of items) {
    if (item.appVersion === 'unknown') continue
    const existing = versions.get(item.appVersion)
    versions.set(item.appVersion, {
      appVersion: item.appVersion,
      activeDevices: (existing?.activeDevices ?? 0) + item.activeDevices,
      lastObservedAt: existing && existing.lastObservedAt > item.lastObservedAt
        ? existing.lastObservedAt
        : item.lastObservedAt,
    })
  }
  return [...versions.values()].sort((left, right) => {
    if (left.activeDevices !== right.activeDevices) return right.activeDevices - left.activeDevices
    if (left.lastObservedAt !== right.lastObservedAt) {
      return right.lastObservedAt.localeCompare(left.lastObservedAt)
    }
    return right.appVersion.localeCompare(left.appVersion, undefined, { numeric: true })
  })[0] ?? null
}
