import { describe, expect, it } from 'vitest'
import source from './AdminMetrics.vue?raw'

describe('AdminMetrics layout-editing interaction policy', () => {
  it('moves cards only from their title bar and suppresses text selection only while editing', () => {
    expect(source).toContain('drag-allow-from=".widget-header-bar"')

    expect(source).toMatch(/\.workspace-area\.is-editing\s*\{[^}]*user-select:\s*none/s)
    expect(source).not.toMatch(/\.workspace-area\s*\{[^}]*user-select:\s*none/s)
  })

  it('shows grid anchors and a distinct snapped destination only while editing', () => {
    expect(source).toContain(':col-num="DASHBOARD_GRID.columns"')
    expect(source).toContain(':row-height="DASHBOARD_GRID.rowHeight"')
    expect(source).toMatch(/\.workspace-area\.is-editing \.dashboard-grid\s*\{[^}]*background-image:/s)
    expect(source).toMatch(/\.workspace-area\.is-editing :deep\(\.vue-grid-placeholder\)\s*\{[^}]*display:\s*none/s)
    expect(source).toMatch(/\.dashboard-grid-drop-preview\s*\{[^}]*border:\s*2px dashed/s)
  })

  it('uses the same discrete interaction options for the card and destination preview', () => {
    expect(source).toContain(':drag-option="dashboardGridDragOption"')
    expect(source).toContain(':resize-option="dashboardGridResizeOption"')
    expect(source).toContain('@move="handleDashboardGridMove"')
    expect(source).toContain('@moved="clearDashboardGridPreview"')
    expect(source).toContain('@resize="handleDashboardGridResize"')
  })

  it('does not silently convert a legacy overview into an explicit metric snapshot on layout save', () => {
    expect(source).not.toContain("type === 'core.overview' && !Array.isArray(config?.metricKeys)")
  })

  it('clears project-scoped property filters and uses the committed snapshot for all supported views', () => {
    expect(source).toContain('filters.propertyFilters = []')
    expect(source.match(/propertyFilters: context\.snapshot\.propertyFilters/g)?.length).toBeGreaterThanOrEqual(6)
  })

  it('defaults governed projects to their trusted schema scope and labels diagnostic fallback', () => {
    expect(source).toContain('await loadTrustedSchemaPolicy(projectId, generation)')
    expect(source).toContain('filters.propertyFilters = response.data.data ? [trustedSchemaFilter(response.data.data)] : []')
    expect(source).toContain("t('analyticsFilters.diagnosticScopeTitle')")
    expect(source).toContain("t('analyticsFilters.trustedScopeLoadFailedTitle')")
  })

  it('loads registered properties before the first product-funnel configuration', () => {
    expect(source.match(/Promise\.all\(\[loadSemanticDefinitions\(\), loadAnalyticsProperties\(\)\]\)/g)?.length)
      .toBeGreaterThanOrEqual(2)
    expect(source).toContain(':loading="analyticsPropertiesLoading"')
  })

  it('localizes bounded-query recovery errors instead of exposing backend copy', () => {
    expect(source).toContain("ANALYTICS_QUERY_RANGE_EXCEEDED: t('analysisConfig.errorCodes.range')")
    expect(source).toContain("ANALYTICS_QUERY_BUDGET_EXCEEDED: t('analysisConfig.errorCodes.budget')")
    expect(source).toContain("ANALYTICS_QUERY_TIMEOUT: t('analysisConfig.errorCodes.timeout')")
    expect(source.match(/getAnalyticsQueryErrorMessage\(error/g)?.length).toBeGreaterThanOrEqual(6)
  })
})
