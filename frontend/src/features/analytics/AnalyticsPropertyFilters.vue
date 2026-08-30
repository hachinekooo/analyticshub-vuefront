<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/utils/apiError'
import { getAnalyticsPropertyDefinitions, type AnalyticsPropertyDefinition } from '@/api/semantic'
import type { AnalyticsPropertyFilter, AnalyticsPropertyFilterOperator } from '@/api/metrics'

const props = defineProps<{
  projectId: string
  modelValue: AnalyticsPropertyFilter[]
}>()
const emit = defineEmits<{ 'update:modelValue': [value: AnalyticsPropertyFilter[]] }>()
const { t, locale } = useI18n()
const definitions = ref<AnalyticsPropertyDefinition[]>([])
const loading = ref(false)
let loadGeneration = 0

type EditableFilter = { propertyKey: string; operator: AnalyticsPropertyFilterOperator; values: string[] }
const MAX_PROPERTY_FILTERS = 12
const rows = ref<EditableFilter[]>([])

const localizedName = (item: AnalyticsPropertyDefinition) => {
  const keys = locale.value === 'zh' ? ['zh-CN', 'zh', 'default', 'en'] : ['en', 'default', 'zh-CN', 'zh']
  return keys.map(key => item.displayName[key]).find(Boolean) || item.propertyKey
}

const loadDefinitions = async () => {
  const projectId = props.projectId
  const generation = ++loadGeneration
  definitions.value = []
  if (!projectId) return
  loading.value = true
  try {
    const response = await getAnalyticsPropertyDefinitions(projectId)
    if (generation !== loadGeneration || projectId !== props.projectId) return
    definitions.value = response.data.data.items.filter(item => item.active && item.filterable && !item.sensitive)
  } catch (error) {
    if (generation !== loadGeneration || projectId !== props.projectId) return
    ElMessage.error(getApiErrorMessage(error, t('analyticsFilters.loadFailed')))
  } finally {
    if (generation === loadGeneration) loading.value = false
  }
}

const syncFromModel = () => {
  rows.value = props.modelValue.map(item => ({
    propertyKey: item.propertyKey,
    operator: item.operator,
    values: [...item.values],
  }))
}

const buildFilters = () => {
  const selectedRows = rows.value.filter(row => row.propertyKey)
  const filters = selectedRows
    .filter(row => row.propertyKey)
    .map(row => ({
      propertyKey: row.propertyKey,
      operator: row.operator,
      values: row.operator === 'EXISTS'
        ? []
        : row.values.map(value => value.trim()).filter(Boolean),
    }))
  if (filters.some(filter => filter.operator !== 'EXISTS' && filter.values.length === 0)) {
    return { filters: null, errorKey: 'analyticsFilters.valueRequired' }
  }
  if (filters.some(filter => filter.operator === 'EQ' && filter.values.length !== 1)) {
    return { filters: null, errorKey: 'analyticsFilters.eqSingleValue' }
  }
  if (filters.some(filter => filter.operator === 'IN' && filter.values.length > 20)) {
    return { filters: null, errorKey: 'analyticsFilters.inValueLimit' }
  }
  return { filters, errorKey: null }
}

const commitSilently = () => {
  const result = buildFilters()
  if (result.filters) emit('update:modelValue', result.filters)
}

const commit = () => {
  const result = buildFilters()
  if (!result.filters) {
    ElMessage.warning(t(result.errorKey!))
    return false
  }
  emit('update:modelValue', result.filters)
  return true
}

const add = () => {
  if (rows.value.length >= MAX_PROPERTY_FILTERS) return
  rows.value.push({ propertyKey: '', operator: 'EQ', values: [] })
}

const updateEqValue = (row: EditableFilter, value: unknown) => {
  row.values = [String(value)]
}

const changeOperator = (row: EditableFilter) => {
  if (row.operator === 'EQ') row.values = row.values.slice(0, 1)
  if (row.operator === 'EXISTS') row.values = []
  commitSilently()
}

const remove = (index: number) => {
  rows.value.splice(index, 1)
  commitSilently()
}

defineExpose({ commit })

watch(() => props.projectId, () => {
  rows.value = []
  void loadDefinitions()
}, { immediate: true })
watch(() => props.modelValue, syncFromModel, { deep: true, immediate: true })
</script>

<template>
  <div class="analytics-property-filters" v-loading="loading">
    <div class="filter-heading">
      <div>
        <strong>{{ t('analyticsFilters.title') }}</strong>
        <span>{{ t('analyticsFilters.help') }}</span>
      </div>
      <el-button size="small" plain :disabled="rows.length >= MAX_PROPERTY_FILTERS || definitions.length === 0" @click="add">
        {{ t('analyticsFilters.add') }}
      </el-button>
    </div>
    <div v-if="rows.length" class="filter-rows">
      <div v-for="(row, index) in rows" :key="index" class="filter-row">
        <el-select v-model="row.propertyKey" filterable :placeholder="t('analyticsFilters.property')" @change="commitSilently">
          <el-option v-for="item in definitions" :key="item.propertyKey" :value="item.propertyKey" :label="`${localizedName(item)} · ${item.propertyKey}`" :disabled="rows.some((candidate, candidateIndex) => candidateIndex !== index && candidate.propertyKey === item.propertyKey)" />
        </el-select>
        <el-select v-model="row.operator" class="operator" @change="changeOperator(row)">
          <el-option label="=" value="EQ" /><el-option label="IN" value="IN" /><el-option :label="t('analyticsFilters.exists')" value="EXISTS" />
        </el-select>
        <el-input
          v-if="row.operator === 'EQ'"
          :model-value="row.values[0] || ''"
          :placeholder="t('analyticsFilters.value')"
          @update:model-value="updateEqValue(row, $event)"
          @change="commitSilently"
        />
        <el-select
          v-else-if="row.operator === 'IN'"
          v-model="row.values"
          class="values"
          multiple
          filterable
          allow-create
          default-first-option
          :reserve-keyword="false"
          :placeholder="t('analyticsFilters.values')"
          @change="commitSilently"
        />
        <div v-else class="exists-placeholder">{{ t('analyticsFilters.existsHelp') }}</div>
        <el-button link type="danger" @click="remove(index)">{{ t('buttons.delete') }}</el-button>
      </div>
    </div>
    <span v-else class="empty-hint">{{ t('analyticsFilters.empty') }}</span>
  </div>
</template>

<style scoped>
.analytics-property-filters { margin: -4px 0 18px; padding: 14px 16px; background: #fff; border: 1px solid #e5e5e7; border-radius: 12px; }
.filter-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.filter-heading div { display: flex; align-items: baseline; gap: 10px; }
.filter-heading span, .empty-hint { color: #6e6e73; font-size: 12px; }
.filter-rows { display: grid; gap: 8px; margin-top: 12px; }
.filter-row { display: grid; grid-template-columns: minmax(220px, 1.2fr) 100px minmax(180px, 1fr) auto; align-items: center; gap: 8px; }
.exists-placeholder { color: #6e6e73; font-size: 12px; }
.values { width: 100%; }
@media (max-width: 760px) { .filter-row { grid-template-columns: 1fr; } .filter-heading div { flex-direction: column; gap: 2px; } }
</style>
