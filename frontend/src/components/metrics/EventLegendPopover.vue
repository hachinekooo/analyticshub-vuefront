<template>
  <el-popover placement="bottom-end" trigger="click" :width="380">
    <template #reference>
      <el-button class="event-legend-trigger" link size="small">
        <el-icon><Collection /></el-icon>
        <span>{{ t('metrics.eventLegend.trigger') }}</span>
        <span class="event-legend-count">{{ uniqueEvents.length }}</span>
      </el-button>
    </template>

    <section class="event-legend" :aria-label="t('metrics.eventLegend.title')">
      <header class="event-legend-header">
        <strong>{{ t('metrics.eventLegend.title') }}</strong>
        <span>{{ t('metrics.eventLegend.pageScope') }}</span>
      </header>
      <div class="event-legend-list">
        <article v-for="event in uniqueEvents" :key="event.eventKey" class="event-legend-item">
          <SemanticEventLabel v-bind="event" :show-help="false" />
          <p v-if="event.description?.trim()" class="event-legend-description">
            {{ event.description.trim() }}
          </p>
          <p v-else-if="event.knownBusinessName === false" class="event-legend-description">
            {{ t('metrics.eventLegend.unmapped') }}
          </p>
          <code class="event-legend-key">{{ event.eventKey }}</code>
        </article>
      </div>
    </section>
  </el-popover>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Collection } from '@element-plus/icons-vue'
import SemanticEventLabel from '@/components/metrics/SemanticEventLabel.vue'
import { useI18n } from '@/i18n'
import {
  uniqueSemanticEvents,
  type SemanticEventPresentation,
} from '@/features/metrics/semanticEventPresentation'

const props = defineProps<{
  events: readonly SemanticEventPresentation[]
}>()

const { t } = useI18n()
const uniqueEvents = computed(() => uniqueSemanticEvents(props.events))
</script>

<style scoped>
.event-legend-trigger {
  min-height: 28px;
  color: var(--el-text-color-secondary);
}

.event-legend-count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
}

.event-legend-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.event-legend-header span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.event-legend-list {
  max-height: 320px;
  overflow-y: auto;
}

.event-legend-item {
  padding: 12px 0;
}

.event-legend-item + .event-legend-item {
  border-top: 1px solid var(--el-border-color-extra-light);
}

.event-legend-description {
  margin: 5px 0 7px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.55;
}

.event-legend-key {
  display: inline-block;
  max-width: 100%;
  padding: 2px 6px;
  overflow: hidden;
  border-radius: 5px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-regular);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
