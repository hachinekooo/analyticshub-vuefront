<template>
  <span v-if="!presentation.hasValue" class="event-properties-empty">—</span>
  <el-popover
    v-else
    placement="top-start"
    :trigger="['hover', 'focus']"
    :width="520"
    :show-after="220"
    :hide-after="80"
    popper-class="event-properties-popper"
  >
    <template #reference>
      <span
        class="event-properties-reference"
        tabindex="0"
        :aria-label="t('metrics.eventProperties.openComplete')"
      >
        <code>{{ presentation.summary }}</code>
        <el-icon aria-hidden="true"><View /></el-icon>
      </span>
    </template>

    <section class="event-properties-detail" :aria-label="t('metrics.eventProperties.title')">
      <header>
        <strong>{{ t('metrics.eventProperties.title') }}</strong>
        <span>{{ t('metrics.eventProperties.completeHint') }}</span>
      </header>
      <pre>{{ presentation.formatted }}</pre>
    </section>
  </el-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { View } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'
import { presentEventProperties } from '@/features/metrics/eventPropertiesPresentation'

const props = defineProps<{
  value: Record<string, unknown> | null
}>()

const { t } = useI18n()
const presentation = computed(() => presentEventProperties(props.value))
</script>

<style scoped>
:global(.event-properties-popper) {
  max-width: calc(100vw - 32px);
}

.event-properties-empty {
  color: var(--el-text-color-placeholder);
}

.event-properties-reference {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-regular);
  cursor: help;
  outline: none;
}

.event-properties-reference code {
  min-width: 0;
  overflow: hidden;
  font-family: var(--el-font-family);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.event-properties-reference .el-icon {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
}

.event-properties-reference:focus-visible {
  border-radius: 4px;
  outline: 2px solid var(--el-color-primary-light-5);
  outline-offset: 2px;
}

.event-properties-detail header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.event-properties-detail header span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.event-properties-detail pre {
  max-height: min(52vh, 420px);
  margin: 10px 0 0;
  padding: 12px;
  overflow: auto;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  tab-size: 2;
  white-space: pre-wrap;
}
</style>
