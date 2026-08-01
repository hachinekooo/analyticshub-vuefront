import type { Component } from 'vue'
import type { Locale } from '@/i18n'
import { dashboardWidgetExtensions } from './dashboardRegistry'

export { dashboardWidgetExtensions } from './dashboardRegistry'

export type DashboardExtensionSpace = 'operations' | 'technical'
export type DashboardExtensionJsonValue =
  | string
  | number
  | boolean
  | null
  | readonly DashboardExtensionJsonValue[]
  | { readonly [key: string]: DashboardExtensionJsonValue }
export type DashboardExtensionConfig = Readonly<Record<string, DashboardExtensionJsonValue>>

export interface DashboardWidgetExtensionProps<
  TConfig extends DashboardExtensionConfig = DashboardExtensionConfig,
> {
  readonly projectId: string
  readonly widgetId: string
  readonly config: TConfig
  readonly dateRange: readonly [string, string] | null
  readonly locale: Locale
  readonly editable: boolean
  /** Changes for manual refreshes as well as filter/project refreshes. */
  readonly refreshToken: number
}

export type DashboardWidgetExtensionEmits<
  TConfig extends DashboardExtensionConfig = DashboardExtensionConfig,
> = {
  'update:config': [config: TConfig]
}

export type DashboardWidgetExtensionComponent<
  TConfig extends DashboardExtensionConfig = DashboardExtensionConfig,
> = Component<DashboardWidgetExtensionProps<TConfig>>

export interface DashboardExtensionLayout {
  w: number
  h: number
  minW?: number
  minH?: number
}

/**
 * Trusted build-time widget contract.
 *
 * Downstream deployments statically import their Vue component and add one
 * definition to `dashboardWidgetExtensions` before building the admin app.
 * The matching `DashboardWidgetExtension` Spring bean must be registered in
 * the backend so stored config receives an explicit allow-list validation.
 */
export interface DashboardWidgetExtension<
  TConfig extends DashboardExtensionConfig = DashboardExtensionConfig,
> {
  type: `custom.${string}`
  displayName: Readonly<Record<string, string>>
  spaces: readonly DashboardExtensionSpace[]
  component: DashboardWidgetExtensionComponent<TConfig>
  defaultLayout: Readonly<DashboardExtensionLayout>
  defaultConfig?: TConfig
  /** Mirror the matching backend extension's configRequired flag. */
  configRequired?: boolean
  /** Optional early UI validation; backend validation remains authoritative. */
  validateConfig?: (config: DashboardExtensionConfig) => boolean
}

export const defineDashboardWidgetExtension = <TConfig extends DashboardExtensionConfig>(
  extension: DashboardWidgetExtension<TConfig>,
) => extension

const extensionTypePattern = /^custom\.[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/
const localePattern = /^(?:default|[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*)$/
const validSpaces = new Set<DashboardExtensionSpace>(['operations', 'technical'])
const maxConfigBytes = 256 * 1024
const extensionByType = new Map<string, DashboardWidgetExtension>()

const isJsonValue = (value: unknown, seen: Set<object>, depth = 0): boolean => {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true
  if (typeof value === 'number') return Number.isFinite(value)
  if (typeof value !== 'object' || depth > 50 || seen.has(value)) return false

  seen.add(value)
  const valid = Array.isArray(value)
    ? value.every((item) => isJsonValue(item, seen, depth + 1))
    : (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null)
      && Object.values(value).every((item) => isJsonValue(item, seen, depth + 1))
  seen.delete(value)
  return valid
}

export const cloneDashboardExtensionConfig = (value: unknown): DashboardExtensionConfig | null => {
  try {
    if (!value || Array.isArray(value) || !isJsonValue(value, new Set())) return null
    const serialized = JSON.stringify(value)
    if (!serialized || new TextEncoder().encode(serialized).byteLength > maxConfigBytes) return null
    const cloned = JSON.parse(serialized) as unknown
    return cloned && typeof cloned === 'object' && !Array.isArray(cloned)
      ? cloned as DashboardExtensionConfig
      : null
  } catch {
    return null
  }
}

export const normalizeDashboardExtensionConfig = (
  extension: Pick<DashboardWidgetExtension, 'validateConfig'>,
  value: unknown,
): DashboardExtensionConfig | null => {
  const cloned = cloneDashboardExtensionConfig(value)
  if (!cloned) return null
  try {
    return !extension.validateConfig || extension.validateConfig(cloned) ? cloned : null
  } catch {
    return null
  }
}

for (const extension of dashboardWidgetExtensions) {
  if (!extension || typeof extension !== 'object') {
    throw new Error('Invalid dashboard extension entry')
  }
  if (typeof extension.type !== 'string'
    || !extensionTypePattern.test(extension.type) || extension.type.length > 100) {
    throw new Error(`Invalid dashboard extension type: ${extension.type}`)
  }
  if (extensionByType.has(extension.type)) {
    throw new Error(`Duplicate dashboard extension type: ${extension.type}`)
  }
  const displayNames = extension.displayName && typeof extension.displayName === 'object'
    ? Object.entries(extension.displayName)
    : []
  const normalizedLocales = new Set(displayNames.map(([key]) => key.toLowerCase()))
  if (displayNames.length === 0 || displayNames.length > 20
    || normalizedLocales.size !== displayNames.length
    || displayNames.some(([key, value]) => !localePattern.test(key) || key.length > 32
      || typeof value !== 'string' || !value.trim() || value.length > 100)) {
    throw new Error(`Invalid dashboard extension displayName: ${extension.type}`)
  }
  const extensionSpaces = Array.isArray(extension.spaces) ? extension.spaces : []
  const spaces = new Set(extensionSpaces)
  const layout = extension.defaultLayout
  if (spaces.size === 0 || spaces.size !== extensionSpaces.length
    || [...spaces].some((space) => !validSpaces.has(space))
    || !layout || typeof layout !== 'object'
    || !Number.isInteger(layout.w) || layout.w < 1 || layout.w > 12
    || !Number.isInteger(layout.h) || layout.h < 1 || layout.h > 100
    || (layout.minW !== undefined && (!Number.isInteger(layout.minW)
      || layout.minW < 1 || layout.minW > layout.w))
    || (layout.minH !== undefined && (!Number.isInteger(layout.minH)
      || layout.minH < 1 || layout.minH > layout.h))
    || (typeof extension.component !== 'object' && typeof extension.component !== 'function')
    || Array.isArray(extension.component)
    || extension.component === null
    || (extension.validateConfig !== undefined && typeof extension.validateConfig !== 'function')) {
    throw new Error(`Invalid dashboard extension metadata: ${extension.type}`)
  }
  const clonedDefaultConfig = extension.defaultConfig === undefined
    ? undefined
    : normalizeDashboardExtensionConfig(extension, extension.defaultConfig)
  if ((extension.configRequired !== undefined && typeof extension.configRequired !== 'boolean')
    || clonedDefaultConfig === null || (extension.configRequired && clonedDefaultConfig === undefined)) {
    throw new Error(`Invalid dashboard extension defaultConfig: ${extension.type}`)
  }
  extensionByType.set(extension.type, extension)
}

export const getDashboardWidgetExtension = (type: string | null | undefined) =>
  type ? extensionByType.get(type) : undefined

export const getDashboardWidgetExtensions = (space: DashboardExtensionSpace) =>
  dashboardWidgetExtensions.filter((extension) => extension.spaces.includes(space))
