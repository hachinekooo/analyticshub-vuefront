import { describe, expect, it } from 'vitest'
import source from './AnalysisConfiguration.vue?raw'

describe('AnalysisConfiguration safety policy', () => {
  it('loads semantic and trusted-schema context before creating governed metrics', () => {
    expect(source).toContain('getSemanticDefinitions(requestedProjectId)')
    expect(source).toContain('getTrustedSchemaPolicy(requestedProjectId)')
    expect(source).toContain('getAnalysisPacks(requestedProjectId)')
    expect(source).toContain(':disabled="!activeSemanticKeys.length"')
    expect(source).not.toContain("'product.started'")
    expect(source).not.toContain("'product.completed'")
  })

  it('reloads the complete server pack before preparing the next version', () => {
    expect(source).toContain('loadPackForNextVersion')
    expect(source).toContain('packForm.packVersion = pack.packVersion + 1')
    expect(source).toContain('JSON.stringify(snapshot.manifest, null, 2)')
  })

  it('can reload an audited historical snapshot while submitting the next current version', () => {
    expect(source).toContain('pack.versions.map')
    expect(source).toContain('pack.versions.find')
    expect(source).toContain('packForm.packVersion = pack.packVersion + 1')
  })

  it('does not report clean KPI quality before a trusted contract baseline exists', () => {
    expect(source).toContain('!quality.trustedSchemaPolicyConfigured')
    expect(source).toContain('quality.unverifiedSchema')
    expect(source).toContain('quality.trustedSchemaPolicyConfigured && !quality.issues.length')
  })

  it('resets editable Pack content when the selected project changes', () => {
    expect(source).toContain("packForm.packKey = 'custom.product-analytics'")
    expect(source).toContain('packForm.packVersion = 1')
    expect(source).toContain('trustedSchemaPolicy: null')
  })

  it('localizes stable data-quality issue codes instead of rendering backend copy directly', () => {
    expect(source).toContain('qualityIssueMessages')
    expect(source).toContain('qualityIssueDescription(row)')
    expect(source).not.toContain('prop="description" :label="t(\'analysisConfig.quality.issue\')"')
  })

  it('localizes trusted-schema write conflicts instead of exposing backend copy', () => {
    expect(source).toContain("ANALYSIS_PACK_TRUSTED_SCHEMA_CONFLICT: t('analysisConfig.errorCodes.trustedSchemaConflict')")
  })

  it('requires an explicit second request before a pack can deactivate omitted definitions', () => {
    expect(source).toContain("getApiErrorCode(error) !== 'ANALYSIS_PACK_DEACTIVATION_CONFIRMATION_REQUIRED'")
    expect(source).toContain('await ElMessageBox.confirm(')
    expect(source).toContain('removedPropertyKeys')
    expect(source).toContain('removedMetricKeys')
    expect(source).toContain('removesTrustedSchemaPolicy')
    expect(source).toContain('response = await submit(true)')
  })

  it('omits blank localized names and requires a usable pack identity', () => {
    expect(source).toContain("if (packForm.zhName.trim()) displayName['zh-CN']")
    expect(source).toContain('if (packForm.enName.trim()) displayName.en')
    expect(source).toContain('packIdentityRequired')
  })

  it('prefills the project policy filter instead of a product-specific schema version', () => {
    expect(source).toContain('propertyKey: policy.propertyKey')
    expect(source).toContain('values: [policy.trustedValues[0]]')
    expect(source).not.toMatch(/event_schema_version[^\n]*['"]3['"]/)
  })

  it('supports every backend governed metric type in the management form', () => {
    expect(source).toContain("'PROPERTY_BREAKDOWN'")
    expect(source).toContain("'NUMERIC_PROPERTY_SUMMARY'")
    expect(source).toContain("aggregation: 'EVENT_COUNT'")
    expect(source).toContain("missingValuePolicy: 'INCLUDE'")
    expect(source).toContain("unit: numericProperty?.propertyKey.endsWith('_ms') ? 'MILLISECONDS' : 'NUMBER'")
    expect(source).toContain('v-for="type in metricTypeOptions"')
    expect(source).toContain("t('analysisConfig.metrics.breakdownSummary'")
    expect(source).toContain("t('analysisConfig.metrics.numericSummary'")
  })

  it('marks cross-version definitions and calculated results as diagnostic', () => {
    expect(source).toContain("row.definition.schemaScope === 'CROSS_VERSION_VERIFIED'")
    expect(source).toContain("metricResult.resultClassification === 'CROSS_VERSION_DIAGNOSTIC'")
    expect(source).toContain("metricResult.resultClassification === 'UNGOVERNED_DIAGNOSTIC'")
    expect(source).toContain('metricResult.diagnosticReason')
    expect(source).toContain("t('analysisConfig.metrics.diagnosticResultTitle')")
  })
})
