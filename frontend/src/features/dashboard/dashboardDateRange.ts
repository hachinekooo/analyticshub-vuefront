import type { DashboardDefinition } from '@/api/dashboard'

export type DashboardDefaultRange = NonNullable<DashboardDefinition['defaultRange']>

const presetDays: Record<Exclude<DashboardDefaultRange, 'custom'>, number> = {
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
}

const toDateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Convert a Dashboard preset into the inclusive calendar range used by the date picker. */
export const dateRangeForDashboardPreset = (
  preset: DashboardDefaultRange | undefined,
  now = new Date(),
): string[] | null => {
  if (!preset || preset === 'custom') return null
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(end)
  start.setDate(start.getDate() - presetDays[preset] + 1)
  return [toDateValue(start), toDateValue(end)]
}
