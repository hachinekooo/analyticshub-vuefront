<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { useI18n } from '@/i18n'
import { getApiErrorCode, getApiErrorDetails, getApiErrorMessage } from '@/utils/apiError'
import { projectIdFromParam, projectRoute } from '@/utils/projectRoutes'
import { getAnalyticsDataQuality, type AnalyticsDataQuality } from '@/api/metrics'
import {
  getAnalysisPacks,
  getAnalyticsMetricDefinitions,
  getAnalyticsMetricResult,
  getAnalyticsPropertyDefinitions,
  getSemanticDefinitions,
  getTrustedSchemaPolicy,
  importAnalysisPack,
  upsertAnalyticsMetricDefinition,
  upsertAnalyticsPropertyDefinition,
  type AnalysisPackDetail,
  type AnalyticsMetricDefinition,
  type AnalyticsMetricResult,
  type AnalyticsPropertyDataType,
  type AnalyticsPropertyDefinition,
  type SemanticDefinition,
  type TrustedSchemaPolicy,
} from '@/api/semantic'

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const analysisErrorMessages = computed(() => ({
  INVALID_PROJECT: t('analysisConfig.errorCodes.invalidProject'),
  PROJECT_NOT_FOUND: t('analysisConfig.errorCodes.invalidProject'),
  PROJECT_INACTIVE: t('analysisConfig.errorCodes.inactiveProject'),
  PROJECT_DB_UNAVAILABLE: t('analysisConfig.errorCodes.projectDbUnavailable'),
  INVALID_ANALYSIS_CONFIGURATION: t('analysisConfig.errorCodes.invalidConfiguration'),
  ANALYSIS_PACK_DEFINITION_MANAGED: t('analysisConfig.errorCodes.managedByPack'),
  ANALYSIS_PACK_TRUSTED_SCHEMA_CONFLICT: t('analysisConfig.errorCodes.trustedSchemaConflict'),
  ANALYSIS_PACK_DEACTIVATION_CONFIRMATION_REQUIRED: t('analysisConfig.errorCodes.packConfirmation'),
  ANALYTICS_GOVERNANCE_TRANSITION_BLOCKED: t('analysisConfig.errorCodes.governanceBlocked'),
  INVALID_ANALYTICS_PROPERTY: t('analysisConfig.errorCodes.property'),
  INVALID_ANALYTICS_PROPERTY_FILTER: t('analysisConfig.errorCodes.property'),
  ANALYTICS_PROPERTY_NOT_FOUND: t('analysisConfig.errorCodes.property'),
  INVALID_ANALYTICS_METRIC: t('analysisConfig.errorCodes.metric'),
  ANALYTICS_METRIC_NOT_FOUND: t('analysisConfig.errorCodes.metric'),
  ANALYTICS_METRIC_INACTIVE: t('analysisConfig.errorCodes.metric'),
  SEMANTIC_DEFINITION_UNAVAILABLE: t('analysisConfig.errorCodes.semanticUnavailable'),
  ANALYTICS_QUERY_RANGE_EXCEEDED: t('analysisConfig.errorCodes.range'),
  ANALYTICS_QUERY_BUDGET_EXCEEDED: t('analysisConfig.errorCodes.budget'),
  ANALYTICS_QUERY_TIMEOUT: t('analysisConfig.errorCodes.timeout'),
  ANALYTICS_DISTRIBUTION_CARDINALITY_EXCEEDED: t('analysisConfig.errorCodes.cardinality'),
  VALIDATION_ERROR: t('analysisConfig.errorCodes.validation'),
}))
const getAnalysisErrorMessage = (error: unknown, fallback: string) =>
  getApiErrorMessage(error, fallback, analysisErrorMessages.value)
const qualityIssueMessages = computed<Record<string, string>>(() => ({
  missing_schema_version: t('analysisConfig.quality.issueCodes.missingSchemaVersion'),
  untrusted_schema_value: t('analysisConfig.quality.issueCodes.untrustedSchemaValue'),
  schema_version_distribution_truncated: t('analysisConfig.quality.issueCodes.schemaVersionDistributionTruncated'),
  oversized_properties: t('analysisConfig.quality.issueCodes.oversizedProperties'),
  future_event_timestamp: t('analysisConfig.quality.issueCodes.futureEventTimestamp'),
  stale_event_timestamp: t('analysisConfig.quality.issueCodes.staleEventTimestamp'),
  property_type_mismatch: t('analysisConfig.quality.issueCodes.propertyTypeMismatch'),
  property_value_outside_allowlist: t('analysisConfig.quality.issueCodes.propertyValueOutsideAllowlist'),
  property_coverage_truncated: t('analysisConfig.quality.issueCodes.propertyCoverageTruncated'),
}))
const qualityIssueDescription = (issue: AnalyticsDataQuality['issues'][number]) =>
  qualityIssueMessages.value[issue.code] || issue.description
const projectId = computed(() => projectIdFromParam(route.params.projectId))
const activeTab = ref('properties')
const loading = ref(false)
const saving = ref(false)
const properties = ref<AnalyticsPropertyDefinition[]>([])
const metrics = ref<AnalyticsMetricDefinition[]>([])
const semantics = ref<SemanticDefinition[]>([])
const trustedSchemaPolicy = ref<TrustedSchemaPolicy | null>(null)
const analysisPacks = ref<AnalysisPackDetail[]>([])
const quality = ref<AnalyticsDataQuality | null>(null)
const propertyDialogVisible = ref(false)
const editingPropertyKey = ref('')
const qualityRange = ref<[Date, Date] | null>([
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  new Date(),
])

const requireQualityRange = () => {
  const range = qualityRange.value
  if (!range || range.length !== 2) {
    ElMessage.warning(t('analysisConfig.messages.rangeRequired'))
    return null
  }
  return range
}

const propertyForm = reactive({
  propertyKey: '',
  zhName: '',
  enName: '',
  dataType: 'STRING' as AnalyticsPropertyDataType,
  description: '',
  allowedValues: '',
  filterable: true,
  groupable: false,
  journeyKey: false,
  sensitive: false,
  active: true,
})

const packForm = reactive({
  packKey: 'custom.product-analytics',
  packVersion: 1,
  zhName: '产品分析配置',
  enName: 'Product Analytics Configuration',
  manifest: JSON.stringify({
    schemaVersion: 1,
    trustedSchemaPolicy: null,
    properties: [],
    metrics: [],
  }, null, 2),
})
const lastPackChecksum = ref('')
const loadedPackKey = ref('')
const packVersionOptions = computed(() => analysisPacks.value.flatMap(pack =>
  pack.versions.map(version => ({
    value: `${pack.packKey}@${version.packVersion}`,
    label: `${pack.packKey} · v${version.packVersion}`,
  })),
))
const metricResultVisible = ref(false)
const metricResult = ref<AnalyticsMetricResult | null>(null)
const metricDialogVisible = ref(false)
const editingMetricKey = ref('')

const activeSemanticKeys = computed(() => semantics.value
  .filter(item => item.isActive)
  .map(item => item.semanticKey))

const defaultMetricDefinition = (type: AnalyticsMetricDefinition['metricType']) => {
  const [first = '', second = ''] = activeSemanticKeys.value
  const policy = trustedSchemaPolicy.value
  const propertyFilters = policy?.trustedValues[0]
    ? [{ propertyKey: policy.propertyKey, operator: 'EQ', values: [policy.trustedValues[0]] }]
    : []
  if (type === 'FUNNEL_CONVERSION') return { steps: [first, second], propertyFilters }
  if (type === 'RETENTION') return { cohortEvent: first, returnEvent: second, days: [1, 7, 30], propertyFilters }
  return { semanticEvent: first, propertyFilters }
}

const metricForm = reactive({
  metricKey: '',
  zhName: '',
  enName: '',
  metricType: 'EVENT_COUNT' as AnalyticsMetricDefinition['metricType'],
  description: '',
  definitionJson: JSON.stringify(defaultMetricDefinition('EVENT_COUNT'), null, 2),
  active: true,
})
let projectGeneration = 0

const localizedName = (names: Record<string, string>) => {
  const preferred = locale.value === 'zh' ? ['zh-CN', 'zh', 'default', 'en'] : ['en', 'default', 'zh-CN', 'zh']
  return preferred.map(key => names?.[key]).find(Boolean) || Object.values(names || {})[0] || '—'
}

const capabilityLabels = (item: AnalyticsPropertyDefinition) => [
  item.filterable ? t('analysisConfig.capabilities.filter') : '',
  item.groupable ? t('analysisConfig.capabilities.group') : '',
  item.journeyKey ? t('analysisConfig.capabilities.journey') : '',
].filter(Boolean)

const metricTypeLabel = (type: AnalyticsMetricDefinition['metricType']) =>
  t(`analysisConfig.metricTypes.${type}`)

const metricDefinitionSummary = (item: AnalyticsMetricDefinition) => {
  const definition = item.definition
  if (item.metricType === 'EVENT_COUNT' || item.metricType === 'UNIQUE_ACTORS') {
    return t('analysisConfig.metrics.eventSummary', { event: String(definition.semanticEvent || '—') })
  }
  if (item.metricType === 'FUNNEL_CONVERSION') {
    const steps = Array.isArray(definition.steps) ? definition.steps.join(' → ') : '—'
    return t('analysisConfig.metrics.funnelSummary', { steps })
  }
  const days = Array.isArray(definition.days) ? definition.days.join(', ') : '—'
  return t('analysisConfig.metrics.retentionSummary', {
    cohort: String(definition.cohortEvent || '—'),
    returning: String(definition.returnEvent || '—'),
    days,
  })
}

const loadPackForNextVersion = (selection: string) => {
  const separator = selection.lastIndexOf('@')
  const packKey = separator < 0 ? selection : selection.slice(0, separator)
  const selectedVersion = separator < 0 ? undefined : Number(selection.slice(separator + 1))
  const pack = analysisPacks.value.find(item => item.packKey === packKey)
  if (!pack) return
  const snapshot = pack.versions.find(item => item.packVersion === selectedVersion)
    || pack.versions[0]
  if (!snapshot) return
  loadedPackKey.value = `${pack.packKey}@${snapshot.packVersion}`
  packForm.packKey = pack.packKey
  packForm.packVersion = pack.packVersion + 1
  packForm.zhName = snapshot.displayName['zh-CN'] || snapshot.displayName.zh || ''
  packForm.enName = snapshot.displayName.en || snapshot.displayName.default || ''
  packForm.manifest = JSON.stringify(snapshot.manifest, null, 2)
  lastPackChecksum.value = snapshot.checksumSha256
}

const refreshConfiguration = async (generation = projectGeneration) => {
  const requestedProjectId = projectId.value
  if (!requestedProjectId) return
  loading.value = true
  try {
    const [propertyResponse, metricResponse, semanticResponse, policyResponse, packResponse] = await Promise.all([
      getAnalyticsPropertyDefinitions(requestedProjectId),
      getAnalyticsMetricDefinitions(requestedProjectId),
      getSemanticDefinitions(requestedProjectId),
      getTrustedSchemaPolicy(requestedProjectId),
      getAnalysisPacks(requestedProjectId),
    ])
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    properties.value = propertyResponse.data.data.items
    metrics.value = metricResponse.data.data
    semantics.value = semanticResponse.data.data.items
    trustedSchemaPolicy.value = policyResponse.data.data
    analysisPacks.value = packResponse.data.data
    const onlyPack = analysisPacks.value.length === 1 ? analysisPacks.value[0] : undefined
    if (!loadedPackKey.value && onlyPack) loadPackForNextVersion(`${onlyPack.packKey}@${onlyPack.packVersion}`)
  } catch (error) {
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    ElMessage.error(getAnalysisErrorMessage(error, t('analysisConfig.messages.loadFailed')))
  } finally {
    if (generation === projectGeneration) loading.value = false
  }
}

const loadQuality = async () => {
  const requestedProjectId = projectId.value
  const generation = projectGeneration
  if (!requestedProjectId) return
  const range = requireQualityRange()
  if (!range) return
  loading.value = true
  try {
    const response = await getAnalyticsDataQuality({
      projectId: requestedProjectId,
      from: range[0].toISOString(),
      to: range[1].toISOString(),
    })
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    quality.value = response.data.data
  } catch (error) {
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    ElMessage.error(getAnalysisErrorMessage(error, t('analysisConfig.messages.qualityFailed')))
  } finally {
    if (generation === projectGeneration) loading.value = false
  }
}

const openPropertyDialog = () => {
  editingPropertyKey.value = ''
  Object.assign(propertyForm, {
    propertyKey: '', zhName: '', enName: '', dataType: 'STRING', description: '',
    allowedValues: '', filterable: true, groupable: false, journeyKey: false,
    sensitive: false, active: true,
  })
  propertyDialogVisible.value = true
}

const editProperty = (item: AnalyticsPropertyDefinition) => {
  editingPropertyKey.value = item.propertyKey
  Object.assign(propertyForm, {
    propertyKey: item.propertyKey,
    zhName: item.displayName['zh-CN'] || item.displayName.zh || '',
    enName: item.displayName.en || item.displayName.default || '',
    dataType: item.dataType,
    description: item.description || '',
    allowedValues: item.allowedValues?.join('\n') || '',
    filterable: item.filterable,
    groupable: item.groupable,
    journeyKey: item.journeyKey,
    sensitive: item.sensitive,
    active: item.active,
  })
  propertyDialogVisible.value = true
}

watch(() => propertyForm.sensitive, sensitive => {
  if (sensitive) {
    propertyForm.filterable = false
    propertyForm.groupable = false
    propertyForm.journeyKey = false
  }
})

watch(() => propertyForm.dataType, dataType => {
  if (dataType !== 'STRING') propertyForm.journeyKey = false
})

const saveProperty = async () => {
  if (!projectId.value || !propertyForm.propertyKey.trim() || (!propertyForm.zhName.trim() && !propertyForm.enName.trim())) {
    ElMessage.warning(t('analysisConfig.messages.propertyRequired'))
    return
  }
  const requestedProjectId = projectId.value
  const generation = projectGeneration
  saving.value = true
  try {
    const displayName: Record<string, string> = {}
    if (propertyForm.zhName.trim()) displayName['zh-CN'] = propertyForm.zhName.trim()
    if (propertyForm.enName.trim()) displayName.en = propertyForm.enName.trim()
    const allowedValues = propertyForm.allowedValues.split('\n').map(value => value.trim()).filter(Boolean)
    await upsertAnalyticsPropertyDefinition(requestedProjectId, propertyForm.propertyKey.trim(), {
      displayName,
      dataType: propertyForm.dataType,
      description: propertyForm.description.trim() || null,
      allowedValues: allowedValues.length ? allowedValues : null,
      filterable: propertyForm.filterable,
      groupable: propertyForm.groupable,
      journeyKey: propertyForm.journeyKey,
      sensitive: propertyForm.sensitive,
      active: propertyForm.active,
    })
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    propertyDialogVisible.value = false
    await refreshConfiguration()
    ElMessage.success(t('analysisConfig.messages.propertySaved'))
  } catch (error) {
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    ElMessage.error(getAnalysisErrorMessage(error, t('analysisConfig.messages.saveFailed')))
  } finally {
    if (generation === projectGeneration) saving.value = false
  }
}

const openMetricDialog = () => {
  editingMetricKey.value = ''
  Object.assign(metricForm, {
    metricKey: '', zhName: '', enName: '', metricType: 'EVENT_COUNT', description: '',
    definitionJson: JSON.stringify(defaultMetricDefinition('EVENT_COUNT'), null, 2), active: true,
  })
  metricDialogVisible.value = true
}

const editMetric = (item: AnalyticsMetricDefinition) => {
  editingMetricKey.value = item.metricKey
  Object.assign(metricForm, {
    metricKey: item.metricKey,
    zhName: item.displayName['zh-CN'] || item.displayName.zh || '',
    enName: item.displayName.en || item.displayName.default || '',
    metricType: item.metricType,
    description: item.description || '',
    definitionJson: JSON.stringify(item.definition, null, 2),
    active: item.active,
  })
  metricDialogVisible.value = true
}

watch(() => metricForm.metricType, metricType => {
  if (!editingMetricKey.value && metricDialogVisible.value) {
    metricForm.definitionJson = JSON.stringify(defaultMetricDefinition(metricType), null, 2)
  }
})

const saveMetric = async () => {
  if (!projectId.value || !metricForm.metricKey.trim() || (!metricForm.zhName.trim() && !metricForm.enName.trim())) {
    ElMessage.warning(t('analysisConfig.messages.metricRequired'))
    return
  }
  let definition: Record<string, unknown>
  try {
    const parsed = JSON.parse(metricForm.definitionJson)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('invalid')
    definition = parsed
  } catch {
    ElMessage.warning(t('analysisConfig.messages.invalidMetricJson'))
    return
  }
  const displayName: Record<string, string> = {}
  if (metricForm.zhName.trim()) displayName['zh-CN'] = metricForm.zhName.trim()
  if (metricForm.enName.trim()) displayName.en = metricForm.enName.trim()
  const requestedProjectId = projectId.value
  const generation = projectGeneration
  saving.value = true
  try {
    await upsertAnalyticsMetricDefinition(requestedProjectId, metricForm.metricKey.trim(), {
      displayName,
      metricType: metricForm.metricType,
      definition,
      description: metricForm.description.trim() || null,
      active: metricForm.active,
    })
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    metricDialogVisible.value = false
    await refreshConfiguration()
    ElMessage.success(t('analysisConfig.messages.metricSaved'))
  } catch (error) {
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    ElMessage.error(getAnalysisErrorMessage(error, t('analysisConfig.messages.metricSaveFailed')))
  } finally {
    if (generation === projectGeneration) saving.value = false
  }
}

const applyPack = async () => {
  if (!projectId.value) return
  const packKey = packForm.packKey.trim()
  const displayName: Record<string, string> = {}
  if (packForm.zhName.trim()) displayName['zh-CN'] = packForm.zhName.trim()
  if (packForm.enName.trim()) displayName.en = packForm.enName.trim()
  if (!packKey || Object.keys(displayName).length === 0) {
    ElMessage.warning(t('analysisConfig.messages.packIdentityRequired'))
    return
  }
  let manifest: Record<string, unknown>
  try {
    const parsed = JSON.parse(packForm.manifest)
    if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('invalid')
    manifest = parsed
  } catch {
    ElMessage.warning(t('analysisConfig.messages.invalidJson'))
    return
  }
  const requestedProjectId = projectId.value
  const generation = projectGeneration
  saving.value = true
  try {
    const submit = (confirmDeactivations: boolean) => importAnalysisPack(
      requestedProjectId,
      packKey,
      {
        packVersion: packForm.packVersion,
        displayName,
        manifest,
        confirmDeactivations,
      },
    )
    let response: Awaited<ReturnType<typeof importAnalysisPack>>
    try {
      response = await submit(false)
    } catch (error) {
      if (getApiErrorCode(error) !== 'ANALYSIS_PACK_DEACTIVATION_CONFIRMATION_REQUIRED') throw error
      const details = getApiErrorDetails<{
        removedPropertyKeys?: string[]
        removedMetricKeys?: string[]
        removesTrustedSchemaPolicy?: boolean
      }>(error)
      const removedProperties = details?.removedPropertyKeys?.join(', ') || t('analysisConfig.pack.none')
      const removedMetrics = details?.removedMetricKeys?.join(', ') || t('analysisConfig.pack.none')
      await ElMessageBox.confirm(
        t('analysisConfig.pack.deactivationConfirm', {
          properties: removedProperties,
          metrics: removedMetrics,
          policy: details?.removesTrustedSchemaPolicy
            ? t('analysisConfig.pack.yes')
            : t('analysisConfig.pack.no'),
        }),
        t('analysisConfig.pack.deactivationConfirmTitle'),
        { type: 'warning', confirmButtonText: t('analysisConfig.pack.confirmReplace'), cancelButtonText: t('buttons.cancel') },
      )
      response = await submit(true)
    }
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    lastPackChecksum.value = response.data.data.checksumSha256
    loadedPackKey.value = response.data.data.packKey
    packForm.packVersion = response.data.data.packVersion + 1
    await refreshConfiguration()
    ElMessage.success(t('analysisConfig.messages.packApplied'))
  } catch (error) {
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    ElMessage.error(getAnalysisErrorMessage(error, t('analysisConfig.messages.packFailed')))
  } finally {
    if (generation === projectGeneration) saving.value = false
  }
}

const inspectMetric = async (item: AnalyticsMetricDefinition) => {
  if (!projectId.value) return
  const range = requireQualityRange()
  if (!range) return
  const requestedProjectId = projectId.value
  const generation = projectGeneration
  loading.value = true
  try {
    const response = await getAnalyticsMetricResult(requestedProjectId, item.metricKey, {
      from: range[0].toISOString(),
      to: range[1].toISOString(),
    })
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    metricResult.value = response.data.data
    metricResultVisible.value = true
  } catch (error) {
    if (generation !== projectGeneration || requestedProjectId !== projectId.value) return
    ElMessage.error(getAnalysisErrorMessage(error, t('analysisConfig.messages.metricFailed')))
  } finally {
    if (generation === projectGeneration) loading.value = false
  }
}

watch(projectId, () => {
  const generation = ++projectGeneration
  loading.value = false
  saving.value = false
  properties.value = []
  metrics.value = []
  semantics.value = []
  trustedSchemaPolicy.value = null
  analysisPacks.value = []
  loadedPackKey.value = ''
  quality.value = null
  propertyDialogVisible.value = false
  metricDialogVisible.value = false
  editingPropertyKey.value = ''
  editingMetricKey.value = ''
  metricResultVisible.value = false
  metricResult.value = null
  lastPackChecksum.value = ''
  packForm.packKey = 'custom.product-analytics'
  packForm.packVersion = 1
  packForm.zhName = '产品分析配置'
  packForm.enName = 'Product Analytics Configuration'
  packForm.manifest = JSON.stringify({
    schemaVersion: 1,
    trustedSchemaPolicy: null,
    properties: [],
    metrics: [],
  }, null, 2)
  void refreshConfiguration(generation)
}, { immediate: true })
</script>

<template>
  <div class="admin-container">
    <PageHeader :title="t('analysisConfig.title')" :subtitle="t('analysisConfig.subtitle')">
      <template #actions>
        <el-button :loading="loading" @click="refreshConfiguration">{{ t('buttons.refresh') }}</el-button>
      </template>
    </PageHeader>

    <el-alert type="info" :closable="false" show-icon class="boundary-alert">
      <template #title>{{ t('analysisConfig.boundary.title') }}</template>
      {{ t('analysisConfig.boundary.description') }}
    </el-alert>
    <el-alert
      v-if="!loading && properties.length === 0"
      type="warning"
      :closable="false"
      show-icon
      class="boundary-alert"
      :title="t('analysisConfig.legacyMode.title')"
      :description="t('analysisConfig.legacyMode.description')"
    />

    <div class="content-card">
      <el-tabs v-model="activeTab">
        <el-tab-pane :label="t('analysisConfig.tabs.properties')" name="properties">
          <div class="section-actions">
            <div><h2>{{ t('analysisConfig.properties.title') }}</h2><p>{{ t('analysisConfig.properties.help') }}</p></div>
            <el-button type="primary" @click="openPropertyDialog">{{ t('analysisConfig.properties.add') }}</el-button>
          </div>
          <el-table :data="properties" v-loading="loading">
            <el-table-column :label="t('analysisConfig.fields.name')" min-width="180">
              <template #default="{ row }">{{ localizedName(row.displayName) }}</template>
            </el-table-column>
            <el-table-column prop="propertyKey" :label="t('analysisConfig.fields.propertyKey')" min-width="220">
              <template #default="{ row }"><code>{{ row.propertyKey }}</code></template>
            </el-table-column>
            <el-table-column prop="dataType" :label="t('analysisConfig.fields.dataType')" width="110" />
            <el-table-column :label="t('analysisConfig.fields.capabilities')" min-width="230">
              <template #default="{ row }">
                <el-tag v-for="label in capabilityLabels(row)" :key="label" size="small" effect="plain">{{ label }}</el-tag>
                <el-tag v-if="row.sensitive" size="small" type="danger" effect="plain">{{ t('analysisConfig.capabilities.sensitive') }}</el-tag>
                <span v-if="!capabilityLabels(row).length && !row.sensitive">—</span>
              </template>
            </el-table-column>
            <el-table-column :label="t('tables.status')" width="100">
              <template #default="{ row }"><el-tag :type="row.active ? 'success' : 'info'">{{ row.active ? t('status.active') : t('status.inactive') }}</el-tag></template>
            </el-table-column>
            <el-table-column :label="t('buttons.actions')" width="100">
              <template #default="{ row }"><el-button link type="primary" @click="editProperty(row)">{{ t('buttons.edit') }}</el-button></template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane :label="t('analysisConfig.tabs.metrics')" name="metrics">
          <div class="section-actions"><div><h2>{{ t('analysisConfig.metrics.title') }}</h2><p>{{ t('analysisConfig.metrics.help') }}</p></div><el-button type="primary" @click="openMetricDialog">{{ t('analysisConfig.metrics.add') }}</el-button></div>
          <el-table :data="metrics" v-loading="loading">
            <el-table-column :label="t('analysisConfig.fields.name')" min-width="180"><template #default="{ row }">{{ localizedName(row.displayName) }}</template></el-table-column>
            <el-table-column prop="metricKey" :label="t('analysisConfig.fields.metricKey')" min-width="220"><template #default="{ row }"><code>{{ row.metricKey }}</code></template></el-table-column>
            <el-table-column :label="t('analysisConfig.fields.metricType')" min-width="160"><template #default="{ row }">{{ metricTypeLabel(row.metricType) }}</template></el-table-column>
            <el-table-column :label="t('analysisConfig.fields.definition')" min-width="340">
              <template #default="{ row }">
                <div class="metric-definition">
                  <span>{{ row.description || metricDefinitionSummary(row) }}</span>
                  <el-tag v-if="row.definition.schemaScope === 'CROSS_VERSION_VERIFIED'" type="warning" size="small" effect="plain">
                    {{ t('analysisConfig.metrics.crossVersionDiagnostic') }}
                  </el-tag>
                  <el-popover placement="bottom" :width="460" trigger="click">
                    <template #reference><el-button link type="primary">{{ t('analysisConfig.metrics.technicalDetails') }}</el-button></template>
                    <pre class="metric-result">{{ JSON.stringify(row.definition, null, 2) }}</pre>
                  </el-popover>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="t('buttons.actions')" width="180"><template #default="{ row }"><el-button link type="primary" @click="editMetric(row)">{{ t('buttons.edit') }}</el-button><el-button link type="primary" @click="inspectMetric(row)">{{ t('analysisConfig.metrics.inspect') }}</el-button></template></el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane :label="t('analysisConfig.tabs.quality')" name="quality">
          <div class="section-actions">
            <div><h2>{{ t('analysisConfig.quality.title') }}</h2><p>{{ t('analysisConfig.quality.help') }}</p></div>
            <div class="quality-actions"><el-date-picker v-model="qualityRange" type="datetimerange" /><el-button type="primary" :loading="loading" :disabled="!qualityRange" @click="loadQuality">{{ t('analysisConfig.quality.inspect') }}</el-button></div>
          </div>
          <el-empty v-if="!quality" :description="t('analysisConfig.quality.empty')" />
          <template v-else>
            <div class="quality-summary"><strong>{{ quality.totalEvents.toLocaleString() }}</strong><span>{{ t('analysisConfig.quality.eventsInspected') }}</span></div>
            <el-alert v-if="!quality.trustedSchemaPolicyConfigured" type="warning" :closable="false" :title="t('analysisConfig.quality.unverifiedSchema')" />
            <div v-else class="quality-distributions">
              <div v-if="quality.schemaVersionPropertyKey"><h3>{{ t('analysisConfig.quality.schemaVersions', { key: quality.schemaVersionPropertyKey }) }}</h3><el-tag v-for="(count, value) in quality.schemaVersions" :key="value" effect="plain"><code>{{ value }}</code> · {{ count }}</el-tag></div>
            </div>
            <el-alert v-if="quality.trustedSchemaPolicyConfigured && !quality.issues.length" type="success" :closable="false" :title="t('analysisConfig.quality.clean')" />
            <el-table v-else :data="quality.issues">
              <el-table-column :label="t('analysisConfig.quality.issue')" min-width="300"><template #default="{ row }">{{ qualityIssueDescription(row) }}</template></el-table-column>
              <el-table-column prop="count" :label="t('tables.count')" width="120" />
              <el-table-column :label="t('analysisConfig.quality.severity')" width="120"><template #default="{ row }"><el-tag :type="row.severity === 'error' ? 'danger' : 'warning'">{{ t(`analysisConfig.quality.severityLabels.${row.severity}`) }}</el-tag></template></el-table-column>
            </el-table>
            <h3>{{ t('analysisConfig.quality.coverage') }}</h3>
            <p class="coverage-scope">
              {{ quality.propertyCoverageTruncated
                ? t('analysisConfig.quality.coveragePartial', {
                    inspected: quality.propertyCoverage.length,
                    total: quality.propertyCoverageTotal,
                  })
                : t('analysisConfig.quality.coverageComplete', { total: quality.propertyCoverageTotal }) }}
            </p>
            <el-table :data="quality.propertyCoverage">
              <el-table-column prop="propertyKey" :label="t('analysisConfig.fields.propertyKey')" min-width="220"><template #default="{ row }"><code>{{ row.propertyKey }}</code></template></el-table-column>
              <el-table-column prop="presentEvents" :label="t('analysisConfig.quality.present')" />
              <el-table-column prop="typeMismatchEvents" :label="t('analysisConfig.quality.mismatch')" />
              <el-table-column prop="disallowedValueEvents" :label="t('analysisConfig.quality.disallowed')" />
            </el-table>
          </template>
        </el-tab-pane>

        <el-tab-pane :label="t('analysisConfig.tabs.pack')" name="pack">
          <div class="section-actions"><div><h2>{{ t('analysisConfig.pack.title') }}</h2><p>{{ t('analysisConfig.pack.help') }}</p></div></div>
          <el-form label-position="top" class="pack-form">
            <el-form-item v-if="analysisPacks.length" :label="t('analysisConfig.pack.existing')">
              <el-select :model-value="loadedPackKey" style="width: 100%" @update:model-value="loadPackForNextVersion">
                <el-option v-for="option in packVersionOptions" :key="option.value" :value="option.value" :label="option.label" />
              </el-select>
              <div class="field-help">{{ t('analysisConfig.pack.existingHelp') }}</div>
            </el-form-item>
            <el-row :gutter="16"><el-col :span="12"><el-form-item label="Pack Key"><el-input v-model="packForm.packKey" /></el-form-item></el-col><el-col :span="12"><el-form-item :label="t('analysisConfig.pack.version')"><el-input-number v-model="packForm.packVersion" :min="1" /></el-form-item></el-col></el-row>
            <el-row :gutter="16"><el-col :span="12"><el-form-item :label="t('analysisConfig.fields.zhName')"><el-input v-model="packForm.zhName" /></el-form-item></el-col><el-col :span="12"><el-form-item :label="t('analysisConfig.fields.enName')"><el-input v-model="packForm.enName" /></el-form-item></el-col></el-row>
            <el-form-item :label="t('analysisConfig.pack.manifest')"><el-input v-model="packForm.manifest" type="textarea" :rows="18" class="json-editor" /></el-form-item>
            <el-alert v-if="lastPackChecksum" type="success" :closable="false" :title="`SHA-256: ${lastPackChecksum}`" />
            <el-button type="primary" :loading="saving" @click="applyPack">{{ t('analysisConfig.pack.apply') }}</el-button>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <el-dialog v-model="propertyDialogVisible" :title="t('analysisConfig.properties.dialogTitle')" width="640px">
      <el-form label-position="top">
        <el-form-item :label="t('analysisConfig.fields.propertyKey')" required><el-input v-model="propertyForm.propertyKey" :disabled="Boolean(editingPropertyKey)" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item :label="t('analysisConfig.fields.zhName')"><el-input v-model="propertyForm.zhName" /></el-form-item></el-col><el-col :span="12"><el-form-item :label="t('analysisConfig.fields.enName')"><el-input v-model="propertyForm.enName" /></el-form-item></el-col></el-row>
        <el-form-item :label="t('analysisConfig.fields.dataType')"><el-select v-model="propertyForm.dataType" style="width: 100%"><el-option v-for="type in ['STRING','BOOLEAN','INTEGER','NUMBER']" :key="type" :value="type" :label="type" /></el-select></el-form-item>
        <el-form-item :label="t('analysisConfig.properties.allowedValues')"><el-input v-model="propertyForm.allowedValues" type="textarea" :rows="4" :placeholder="t('analysisConfig.properties.allowedValuesHelp')" /></el-form-item>
        <el-form-item :label="t('analysisConfig.fields.description')"><el-input v-model="propertyForm.description" type="textarea" /></el-form-item>
        <div class="capability-switches"><el-checkbox v-model="propertyForm.filterable" :disabled="propertyForm.sensitive">{{ t('analysisConfig.capabilities.filter') }}</el-checkbox><el-checkbox v-model="propertyForm.groupable" :disabled="propertyForm.sensitive">{{ t('analysisConfig.capabilities.group') }}</el-checkbox><el-checkbox v-model="propertyForm.journeyKey" :disabled="propertyForm.sensitive || propertyForm.dataType !== 'STRING'">{{ t('analysisConfig.capabilities.journey') }}</el-checkbox><el-checkbox v-model="propertyForm.sensitive">{{ t('analysisConfig.capabilities.sensitive') }}</el-checkbox><el-checkbox v-model="propertyForm.active">{{ t('status.active') }}</el-checkbox></div>
      </el-form>
      <template #footer><el-button @click="propertyDialogVisible = false">{{ t('buttons.cancel') }}</el-button><el-button type="primary" :loading="saving" @click="saveProperty">{{ t('buttons.save') }}</el-button></template>
    </el-dialog>
    <el-dialog v-model="metricDialogVisible" :title="t('analysisConfig.metrics.dialogTitle')" width="720px">
      <el-form label-position="top">
        <el-alert
          v-if="!activeSemanticKeys.length"
          type="warning"
          :closable="false"
          :title="t('analysisConfig.metrics.semanticRequired')"
          :description="t('analysisConfig.metrics.semanticRequiredHelp')"
          class="boundary-alert"
        />
        <el-form-item :label="t('analysisConfig.fields.metricKey')" required><el-input v-model="metricForm.metricKey" :disabled="Boolean(editingMetricKey)" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item :label="t('analysisConfig.fields.zhName')"><el-input v-model="metricForm.zhName" /></el-form-item></el-col><el-col :span="12"><el-form-item :label="t('analysisConfig.fields.enName')"><el-input v-model="metricForm.enName" /></el-form-item></el-col></el-row>
        <el-form-item :label="t('analysisConfig.fields.metricType')"><el-select v-model="metricForm.metricType" :disabled="Boolean(editingMetricKey)" style="width: 100%"><el-option v-for="type in ['EVENT_COUNT','UNIQUE_ACTORS','FUNNEL_CONVERSION','RETENTION']" :key="type" :value="type" :label="metricTypeLabel(type as AnalyticsMetricDefinition['metricType'])" /></el-select></el-form-item>
        <el-form-item :label="t('analysisConfig.fields.definition')" required><el-input v-model="metricForm.definitionJson" type="textarea" :rows="10" class="json-editor" /><div class="field-help">{{ t(`analysisConfig.metrics.definitionHelp.${metricForm.metricType}`) }}</div></el-form-item>
        <el-alert
          v-if="trustedSchemaPolicy"
          type="info"
          :closable="false"
          :title="t('analysisConfig.metrics.trustedPolicyTitle')"
          :description="t('analysisConfig.metrics.trustedPolicyHelp', { key: trustedSchemaPolicy.propertyKey, values: trustedSchemaPolicy.trustedValues.join(', ') })"
          class="boundary-alert"
        />
        <el-form-item :label="t('analysisConfig.fields.description')"><el-input v-model="metricForm.description" type="textarea" /></el-form-item>
        <el-checkbox v-model="metricForm.active">{{ t('status.active') }}</el-checkbox>
      </el-form>
      <template #footer><el-button v-if="!activeSemanticKeys.length" @click="router.push(projectRoute(projectId, 'semantics'))">{{ t('analysisConfig.metrics.openSemantics') }}</el-button><el-button @click="metricDialogVisible = false">{{ t('buttons.cancel') }}</el-button><el-button type="primary" :loading="saving" :disabled="!activeSemanticKeys.length" @click="saveMetric">{{ t('buttons.save') }}</el-button></template>
    </el-dialog>
    <el-dialog v-model="metricResultVisible" :title="t('analysisConfig.metrics.resultTitle')" width="720px">
      <template v-if="metricResult">
        <p><code>{{ metricResult.metricKey }}</code> · {{ metricResult.from }} — {{ metricResult.to }}</p>
        <el-alert
          v-if="metricResult.resultClassification === 'CROSS_VERSION_DIAGNOSTIC'"
          type="warning"
          :closable="false"
          show-icon
          :title="t('analysisConfig.metrics.diagnosticResultTitle')"
          :description="t('analysisConfig.metrics.diagnosticResultDescription', { reason: metricResult.diagnosticReason || '—' })"
          class="boundary-alert"
        />
        <el-alert
          v-else-if="metricResult.resultClassification === 'UNGOVERNED_DIAGNOSTIC'"
          type="warning"
          :closable="false"
          show-icon
          :title="t('analysisConfig.metrics.ungovernedResultTitle')"
          :description="t('analysisConfig.metrics.ungovernedResultDescription')"
          class="boundary-alert"
        />
        <pre class="metric-result">{{ JSON.stringify(metricResult.result, null, 2) }}</pre>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.boundary-alert { margin-bottom: 18px; }
.section-actions { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; margin-bottom: 18px; }
.section-actions h2 { margin: 0 0 6px; font-size: 18px; }
.section-actions p { margin: 0; color: #6e6e73; }
.quality-actions { display: flex; gap: 10px; }
.quality-summary { display: flex; align-items: baseline; gap: 8px; margin-bottom: 16px; }
.quality-summary strong { font-size: 28px; }
.quality-distributions { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin-bottom: 18px; }
.quality-distributions h3 { margin: 0 0 8px; font-size: 14px; }
.quality-distributions :deep(.el-tag) { margin: 0 6px 6px 0; }
.coverage-scope { color: var(--el-text-color-secondary); font-size: 13px; }
.quality-summary span { color: #6e6e73; }
.pack-form { max-width: 900px; }
.json-editor :deep(textarea) { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
.capability-switches { display: flex; flex-wrap: wrap; gap: 14px; }
.metric-result { max-height: 55vh; overflow: auto; padding: 14px; border-radius: 10px; background: #f5f5f7; font-size: 12px; }
.metric-definition { display: grid; gap: 4px; align-items: start; }
.metric-definition :deep(.el-button) { justify-self: start; padding: 0; }
.field-help { margin-top: 6px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.5; }
code { color: #4b4b4f; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
@media (max-width: 900px) { .quality-distributions { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .section-actions, .quality-actions { flex-direction: column; } }
</style>
