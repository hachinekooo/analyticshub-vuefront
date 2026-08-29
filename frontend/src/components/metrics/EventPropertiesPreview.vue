<template>
  <span v-if="!presentation.hasValue" class="event-properties-empty">—</span>
  <section v-else-if="inline" class="property-panel">
    <div v-for="row in rows" :key="row.key" class="property-row">
      <div><strong>{{ row.label }}</strong><code v-if="row.showKey">{{ row.key }}</code></div>
      <span>{{ row.value }}</span>
    </div>
    <el-collapse class="raw-collapse">
      <el-collapse-item :title="t('metrics.eventProperties.rawJson')" name="raw">
        <pre>{{ presentation.formatted }}</pre>
      </el-collapse-item>
    </el-collapse>
  </section>
  <el-popover v-else placement="top-start" trigger="click" :width="560" popper-class="event-properties-popper">
    <template #reference>
      <el-button link type="primary" class="event-properties-reference">
        {{ t('metrics.eventProperties.viewSemantic', { count: rows.length }) }}
        <el-icon aria-hidden="true"><View /></el-icon>
      </el-button>
    </template>
    <section class="event-properties-detail" :aria-label="t('metrics.eventProperties.title')">
      <header><strong>{{ t('metrics.eventProperties.title') }}</strong><span>{{ t('metrics.eventProperties.semanticHint') }}</span></header>
      <div class="property-panel">
        <div v-for="row in rows" :key="row.key" class="property-row">
          <div><strong>{{ row.label }}</strong><code v-if="row.showKey">{{ row.key }}</code></div>
          <span>{{ row.value }}</span>
        </div>
        <el-collapse class="raw-collapse">
          <el-collapse-item :title="t('metrics.eventProperties.rawJson')" name="raw">
            <pre>{{ presentation.formatted }}</pre>
          </el-collapse-item>
        </el-collapse>
      </div>
    </section>
  </el-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { View } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'
import type { AnalyticsPropertyDefinition } from '@/api/semantic'
import { presentEventProperties } from '@/features/metrics/eventPropertiesPresentation'

const props = withDefaults(defineProps<{
  value: Record<string, unknown> | null
  definitions?: AnalyticsPropertyDefinition[]
  inline?: boolean
}>(), { definitions: () => [], inline: false })
const { t, locale } = useI18n()
const presentation = computed(() => presentEventProperties(props.value))
const definitionsByKey = computed(() => new Map(props.definitions.map(item => [item.propertyKey, item])))
const localizedName = (definition: AnalyticsPropertyDefinition | undefined, key: string) => {
  if (!definition) return key
  const preferred = locale.value === 'zh' ? ['zh-CN', 'zh', 'default', 'en'] : ['en', 'default', 'zh-CN', 'zh']
  return preferred.map(item => definition.displayName[item]).find(Boolean) || Object.values(definition.displayName)[0] || key
}
const formatValue = (value: unknown) => {
  if (value === null) return t('metrics.eventProperties.nullValue')
  if (typeof value === 'boolean') return value ? t('metrics.eventProperties.trueValue') : t('metrics.eventProperties.falseValue')
  if (typeof value === 'number') return new Intl.NumberFormat(locale.value, { maximumFractionDigits: 3 }).format(value)
  if (typeof value === 'string') return value || t('metrics.eventProperties.emptyValue')
  return JSON.stringify(value)
}
const rows = computed(() => Object.entries(props.value ?? {}).map(([key, value]) => {
  const label = localizedName(definitionsByKey.value.get(key), key)
  return { key, label, showKey: label !== key, value: formatValue(value) }
}))
</script>

<style scoped>
:global(.event-properties-popper) { max-width: calc(100vw - 32px); }
.event-properties-empty { color: var(--el-text-color-placeholder); }
.event-properties-reference { max-width: 100%; }
.event-properties-detail header { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 10px; border-bottom: 1px solid var(--el-border-color-lighter); }
.event-properties-detail header span { color: var(--el-text-color-secondary); font-size: 12px; }
.property-panel { display: grid; gap: 8px; max-height: min(58vh, 520px); overflow: auto; padding-top: 10px; }
.property-row { display: grid; grid-template-columns: minmax(160px, 1fr) minmax(120px, 1.2fr); gap: 16px; align-items: start; padding: 8px 10px; border-radius: 8px; background: var(--el-fill-color-lighter); }
.property-row > div { display: grid; min-width: 0; gap: 3px; }
.property-row strong { font-size: 13px; }
.property-row code { overflow: hidden; color: var(--el-text-color-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.property-row > span { overflow-wrap: anywhere; text-align: right; }
.raw-collapse pre { max-height: 360px; margin: 0; padding: 12px; overflow: auto; border-radius: 8px; background: var(--el-fill-color-light); font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space: pre-wrap; }
</style>
