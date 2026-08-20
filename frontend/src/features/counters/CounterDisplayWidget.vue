<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getCounters, type CounterItem } from '@/api/metrics'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/utils/apiError'

const props = defineProps<{
  projectId: string
  title: string
  configuredKeys?: unknown
  refreshToken: number
}>()

const { locale, t } = useI18n()
const counters = ref<CounterItem[]>([])
const loading = ref(false)

const configuredKeyOrder = computed(() => Array.isArray(props.configuredKeys)
  ? [...new Set(props.configuredKeys.filter((key): key is string => typeof key === 'string'))]
  : null)
const counterByKey = computed(() => new Map(counters.value.map(counter => [counter.key, counter])))
const visibleCounters = computed(() => configuredKeyOrder.value
  ? configuredKeyOrder.value.flatMap(key => counterByKey.value.get(key) ?? [])
  : counters.value)
const unavailableKeys = computed(() => configuredKeyOrder.value?.filter(key => !counterByKey.value.has(key)) ?? [])

const localizedText = (value: Record<string, string> | string | null) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  return preferred.map((key) => value[key]).find(Boolean) || Object.values(value)[0] || ''
}

const load = async () => {
  const projectId = props.projectId
  if (!projectId) {
    counters.value = []
    return
  }
  loading.value = true
  try {
    const response = await getCounters({ projectId })
    if (props.projectId === projectId) counters.value = response.data.data.items
  } catch (error) {
    if (props.projectId === projectId) {
      counters.value = []
      ElMessage.error(getApiErrorMessage(error, t('errors.countersFailed')))
    }
  } finally {
    if (props.projectId === projectId) loading.value = false
  }
}

watch(() => [props.projectId, props.refreshToken], load, { immediate: true })
</script>

<template>
  <section class="counter-display" v-loading="loading">
    <div class="widget-header counter-heading">
      <span>{{ title }}</span>
      <small>{{ t('metrics.counterDashboard.currentScope') }}</small>
    </div>
    <el-alert
      v-if="unavailableKeys.length"
      class="counter-warning"
      type="warning"
      :closable="false"
      :title="t('metrics.counterDashboard.unavailableKeys', { keys: unavailableKeys.join(', ') })"
    />
    <div v-if="visibleCounters.length" class="counter-grid">
      <article v-for="counter in visibleCounters" :key="counter.key" class="counter-card">
        <span class="counter-name">{{ localizedText(counter.displayName) || counter.key }}</span>
        <strong class="counter-value">
          {{ counter.value }}<small v-if="localizedText(counter.unit)">{{ localizedText(counter.unit) }}</small>
        </strong>
      </article>
    </div>
    <el-empty v-else :description="t('metrics.noData')" :image-size="60" />
  </section>
</template>

<style scoped>
.counter-display { height: 100%; }
.counter-heading { align-items: baseline; }
.counter-heading small { color: var(--el-text-color-secondary); font-size: 11px; font-weight: 400; }
.counter-warning { margin-bottom: 10px; }
.counter-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
}
.counter-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  background: var(--el-fill-color-extra-light);
}
.counter-name {
  display: block;
  overflow: hidden;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.counter-value {
  display: block;
  margin-top: 8px;
  color: var(--el-text-color-primary);
  font-size: 28px;
  line-height: 1.2;
}
.counter-value small { margin-left: 4px; font-size: 13px; font-weight: 500; }
</style>
