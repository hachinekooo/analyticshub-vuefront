<template>
  <section class="governed-metric" v-loading="loading">
    <header class="metric-header">
      <div>
        <h3>{{ title || metricKey }}</h3>
        <p v-if="definition?.description">{{ definition.description }}</p>
      </div>
      <el-tag size="small" effect="plain" :type="classificationTagType">
        {{ classificationLabel }}
      </el-tag>
    </header>

    <el-alert v-if="errorMessage" type="error" :closable="false" :title="errorMessage" />
    <el-empty v-else-if="!result" :description="t('metrics.noData')" :image-size="54" />
    <el-empty v-else-if="isEmptyResult" :description="t('metrics.noData')" :image-size="54" />

    <div v-else-if="result.metricType === 'PROPERTY_BREAKDOWN'" class="breakdown-list">
      <div v-for="row in breakdownRows" :key="row.missing ? '__missing__' : (row.value || '__empty__')" class="breakdown-row">
        <div class="breakdown-label">
          <span>{{ breakdownLabel(row) }}</span>
          <strong>{{ formatPercent(row.share) }}</strong>
        </div>
        <el-progress :percentage="Math.round(row.share * 100)" :show-text="false" />
        <small>{{ formatNumber(row.measure) }}</small>
      </div>
    </div>

    <div v-else-if="result.metricType === 'NUMERIC_PROPERTY_SUMMARY'" class="summary-grid">
      <div class="summary-primary">
        <span>{{ t('metrics.governedMetric.average') }}</span>
        <strong>{{ formatMeasure(numericResult.average) }}</strong>
      </div>
      <div><span>{{ t('metrics.governedMetric.median') }}</span><strong>{{ formatMeasure(numericResult.median) }}</strong></div>
      <div><span>P90</span><strong>{{ formatMeasure(numericResult.p90) }}</strong></div>
      <div><span>{{ t('metrics.governedMetric.samples') }}</span><strong>{{ formatNumber(numericResult.sampleCount) }}</strong></div>
    </div>

    <div v-else-if="result.metricType === 'FUNNEL_CONVERSION'" class="funnel-list">
      <section v-for="group in funnelGroups" :key="group.groupValue || '__all__'" class="funnel-group">
        <strong class="group-title">{{ funnelGroupLabel(group.groupValue) }}</strong>
        <div v-for="step in group.steps" :key="step.stepIndex" class="funnel-step">
          <SemanticEventLabel v-bind="eventPresentation(step.eventType)" :show-help="false" />
          <strong>{{ formatNumber(step.users) }}</strong>
          <small>{{ formatPercent(step.conversionRate) }}</small>
        </div>
      </section>
    </div>

    <div v-else-if="result.metricType === 'RETENTION'" class="retention-result">
      <div class="retention-summary">
        <span>{{ t('metrics.governedMetric.cohortUsers') }}</span>
        <strong>{{ formatNumber(retentionResult.cohortUsers) }}</strong>
      </div>
      <div v-for="bucket in retentionBuckets" :key="bucket.day" class="retention-row">
        <span>D{{ bucket.day }}</span>
        <el-progress :percentage="Math.round(bucket.retentionRate * 100)" :show-text="false" />
        <strong>{{ formatPercent(bucket.retentionRate) }}</strong>
        <small>{{ formatNumber(bucket.retainedUsers) }} / {{ formatNumber(bucket.eligibleUsers) }}</small>
      </div>
    </div>

    <div v-else-if="result.metricType === 'EVENT_COUNT' || result.metricType === 'UNIQUE_ACTORS'" class="scalar-result">
      <strong>{{ formatNumber(scalarValue) }}</strong>
    </div>

    <el-empty v-else :description="t('metrics.noData')" :image-size="54" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import {
  getAnalyticsMetricResult,
  type AnalyticsMetricDefinition,
  type AnalyticsMetricResult,
} from '@/api/semantic'
import { getApiErrorMessage } from '@/utils/apiError'
import SemanticEventLabel from '@/components/metrics/SemanticEventLabel.vue'
import type { SemanticDefinition } from '@/api/semantic'

const props = defineProps<{
  projectId: string
  metricKey: string
  title?: string
  definition?: AnalyticsMetricDefinition
  semanticDefinitions?: SemanticDefinition[]
  dateRange: readonly [string, string] | null
  refreshToken: number
}>()

const { t, locale } = useI18n()
const loading = ref(false)
const result = ref<AnalyticsMetricResult | null>(null)
const errorMessage = ref('')
let generation = 0

const load = async () => {
  const current = ++generation
  result.value = null
  errorMessage.value = ''
  if (!props.projectId || !props.metricKey) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const response = await getAnalyticsMetricResult(props.projectId, props.metricKey, {
      from: props.dateRange?.[0],
      to: props.dateRange?.[1],
    })
    if (current === generation) result.value = response.data.data
  } catch (error) {
    if (current === generation) {
      result.value = null
      errorMessage.value = getApiErrorMessage(error, t('metrics.governedMetric.loadFailed'))
    }
  } finally {
    if (current === generation) loading.value = false
  }
}

watch(
  () => [props.projectId, props.metricKey, props.dateRange?.[0], props.dateRange?.[1], props.refreshToken],
  load,
  { immediate: true },
)

const localizedName = computed(() => {
  const names = props.definition?.displayName
  if (!names) return ''
  const keys = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  return keys.map(key => names[key]).find(Boolean) || Object.values(names)[0] || ''
})
const title = computed(() => props.title || localizedName.value)
const semanticDefinitionByKey = computed(() => new Map(
  (props.semanticDefinitions ?? []).map(definition => [definition.semanticKey, definition]),
))
const eventPresentation = (eventKey: string) => {
  const definition = semanticDefinitionByKey.value.get(eventKey)
  return {
    eventKey,
    displayName: definition?.displayName ?? null,
    description: definition?.description ?? null,
    knownBusinessName: Boolean(definition),
  }
}
const classificationLabel = computed(() => {
  if (result.value?.resultClassification === 'TRUSTED_SCHEMA') return t('metrics.governedMetric.trusted')
  if (result.value?.resultClassification === 'CROSS_VERSION_DIAGNOSTIC') return t('metrics.governedMetric.crossVersion')
  return t('metrics.governedMetric.diagnostic')
})
const classificationTagType = computed(() =>
  result.value?.resultClassification === 'TRUSTED_SCHEMA' ? 'success' : 'warning')
const breakdownRows = computed(() => (result.value?.result.rows ?? []) as Array<{
  value: string | null
  displayName?: Record<string, string>
  missing: boolean
  measure: number
  share: number
}>)
const breakdownLabel = (row: { value: string | null; missing: boolean; displayName?: Record<string, string> }) => {
  if (row.missing) return t('metrics.governedMetric.missing')
  const names = row.displayName
  if (!names) return row.value || '—'
  const keys = locale.value === 'zh' ? ['zh-CN', 'zh', 'default', 'en'] : ['en', 'default', 'zh-CN', 'zh']
  return keys.map(key => names[key]).find(Boolean) || Object.values(names)[0] || row.value || '—'
}
const numericResult = computed(() => result.value?.result as Record<string, number | string | null>)
type FunnelStep = { stepIndex: number; eventType: string; users: number; conversionRate: number; dropOffRate: number }
type FunnelGroup = { groupValue: string | null; steps: FunnelStep[] }
type RetentionBucket = { day: number; eligibleUsers: number; retainedUsers: number; retentionRate: number }
const funnelGroups = computed(() => (result.value?.result.groups ?? []) as FunnelGroup[])
const funnelGroupLabel = (groupValue: string | null) => {
  const groupBy = props.definition?.definition.groupBy
  return typeof groupBy === 'string' && groupBy ? (groupValue || t('metrics.governedMetric.missing')) : t('metrics.governedMetric.allUsers')
}
const retentionResult = computed(() => result.value?.result as Record<string, unknown>)
const retentionBuckets = computed(() => (result.value?.result.buckets ?? []) as RetentionBucket[])
const scalarValue = computed(() => {
  if (result.value?.metricType === 'EVENT_COUNT') return result.value.result.occurrences
  if (result.value?.metricType === 'UNIQUE_ACTORS') return result.value.result.actors
  return undefined
})
const isEmptyResult = computed(() => {
  if (!result.value) return false
  switch (result.value.metricType) {
    case 'PROPERTY_BREAKDOWN':
      return breakdownRows.value.length === 0
    case 'FUNNEL_CONVERSION':
      return funnelGroups.value.length === 0
    case 'NUMERIC_PROPERTY_SUMMARY':
      return typeof numericResult.value.sampleCount !== 'number'
        || numericResult.value.sampleCount <= 0
    case 'RETENTION':
      return retentionBuckets.value.length === 0
        && !(typeof retentionResult.value.cohortUsers === 'number'
          && retentionResult.value.cohortUsers > 0)
    default:
      return false
  }
})
const formatNumber = (value: unknown) => typeof value === 'number'
  ? new Intl.NumberFormat(locale.value).format(value)
  : '—'
const formatPercent = (value: number) => new Intl.NumberFormat(locale.value, {
  style: 'percent', maximumFractionDigits: 1,
}).format(value)
const formatMeasure = (value: unknown) => {
  if (typeof value !== 'number') return '—'
  const unit = numericResult.value.unit
  if (unit === 'MILLISECONDS') {
    return `${new Intl.NumberFormat(locale.value, { maximumFractionDigits: 1 }).format(value / 1000)} s`
  }
  return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 2 }).format(value)
}
</script>

<style scoped>
.governed-metric { height: 100%; overflow: auto; padding: 16px; }
.metric-header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.metric-header h3 { margin: 0; font-size: 16px; }
.metric-header p { margin: 4px 0 0; color: var(--el-text-color-secondary); font-size: 12px; }
.breakdown-list { display: grid; gap: 12px; }
.breakdown-label { display: flex; justify-content: space-between; gap: 12px; }
.breakdown-row small { color: var(--el-text-color-secondary); }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.summary-grid > div { display: grid; gap: 6px; padding: 12px; border-radius: 10px; background: var(--el-fill-color-light); }
.summary-grid span { color: var(--el-text-color-secondary); font-size: 12px; }
.summary-grid strong { font-size: 18px; }
.summary-primary { grid-column: span 3; }
.summary-primary strong, .scalar-result strong { font-size: 32px; }
.scalar-result { display: grid; min-height: 120px; place-items: center; }
.funnel-list { display: grid; gap: 14px; }
.funnel-group { display: grid; gap: 8px; }
.group-title { color: var(--el-text-color-secondary); font-size: 12px; }
.funnel-step { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; gap: 12px; align-items: center; padding: 8px 10px; border-radius: 8px; background: var(--el-fill-color-lighter); }
.funnel-step span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.funnel-step small { min-width: 54px; color: var(--el-text-color-secondary); text-align: right; }
.retention-result { display: grid; gap: 12px; }
.retention-summary { display: flex; justify-content: space-between; align-items: baseline; padding: 12px; border-radius: 10px; background: var(--el-fill-color-light); }
.retention-summary span { color: var(--el-text-color-secondary); }
.retention-summary strong { font-size: 24px; }
.retention-row { display: grid; grid-template-columns: 36px minmax(80px, 1fr) 58px 72px; gap: 10px; align-items: center; }
.retention-row strong, .retention-row small { text-align: right; }
.retention-row small { color: var(--el-text-color-secondary); }
</style>
