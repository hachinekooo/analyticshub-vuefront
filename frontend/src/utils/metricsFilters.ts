export type TrafficPlatform = 'web' | 'app'

/**
 * Platform is a UI scope, while the backend filters traffic rows by metricType.
 * Keeping this mapping in one place prevents an App filter from leaking into
 * the Website view when operators switch back and forth.
 */
export const trafficMetricTypeForPlatform = (platform: TrafficPlatform) =>
  platform === 'web' ? 'page_view' : 'screen_view'

