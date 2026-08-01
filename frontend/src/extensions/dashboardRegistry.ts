import type { DashboardWidgetExtension } from './dashboard'

/**
 * Build-time integration point for deployment-owned dashboard widgets.
 *
 * Keep private components in the downstream repository, import them here, and
 * register matching `custom.*` definitions. The backend must register the same
 * widget types through DashboardWidgetExtension beans before layouts are saved.
 */
export const dashboardWidgetExtensions: readonly DashboardWidgetExtension[] = Object.freeze([
  // Deployment-owned extensions are registered here.
])
