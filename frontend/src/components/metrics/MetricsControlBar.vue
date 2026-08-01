<script setup lang="ts">
import type { MetricsGranularity } from '@/api/metrics'
import type { TrafficPlatform } from '@/utils/metricsFilters'
import { useI18n } from '@/i18n'

defineProps<{
  space: 'operations' | 'technical'
  dateRange: string[] | null
  granularity: MetricsGranularity
  platform: TrafficPlatform
  userId: string
  deviceId: string
  refreshing: boolean
}>()

const emit = defineEmits<{
  'update:space': [value: 'operations' | 'technical']
  'update:dateRange': [value: string[] | null]
  'update:granularity': [value: MetricsGranularity]
  'update:userId': [value: string]
  'update:deviceId': [value: string]
  apply: []
  customize: []
  selectPlatform: [value: TrafficPlatform]
}>()

const { t } = useI18n()
</script>

<template>
  <section class="control-card">
    <div class="control-toolbar">
      <div class="view-switcher">
        <span class="control-label">{{ t('metrics.workspace') }}</span>
        <div class="segmented-control">
          <button
            type="button"
            :class="{ 'is-active': space === 'operations' }"
            :aria-pressed="space === 'operations'"
            @click="emit('update:space', 'operations')"
          >
            {{ t('metrics.spaces.operations') }}
          </button>
          <button
            type="button"
            :class="{ 'is-active': space === 'technical' }"
            :aria-pressed="space === 'technical'"
            @click="emit('update:space', 'technical')"
          >
            {{ t('metrics.spaces.technical') }}
          </button>
        </div>
      </div>
      <div class="control-actions">
        <el-button type="primary" :loading="refreshing" @click="emit('apply')">
          <el-icon class="el-icon--left"><Refresh /></el-icon>
          {{ t('buttons.applyFilters') }}
        </el-button>
        <el-button @click="emit('customize')">
          <el-icon class="el-icon--left"><Setting /></el-icon>
          {{ t('metrics.customization.open') }}
        </el-button>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-heading">{{ t('metrics.commonFilters') }}</div>
      <el-form inline label-position="top" class="filter-form">
        <el-form-item :label="t('filters.dateRange')">
          <el-date-picker
            :model-value="dateRange"
            type="daterange"
            unlink-panels
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            :start-placeholder="t('filters.startDate')"
            :end-placeholder="t('filters.endDate')"
            :range-separator="t('filters.rangeSeparator')"
            clearable
            @update:model-value="emit('update:dateRange', $event)"
          />
        </el-form-item>
        <el-form-item v-if="space === 'operations'" :label="t('filters.granularity')">
          <el-select
            :model-value="granularity"
            style="width: 130px"
            @update:model-value="emit('update:granularity', $event)"
          >
            <el-option :label="t('filters.hourly')" value="hour" />
            <el-option :label="t('filters.daily')" value="day" />
          </el-select>
        </el-form-item>
      </el-form>
    </div>

    <div v-if="space === 'technical'" class="filter-section technical-filters">
      <div class="filter-heading">{{ t('metrics.detailFilters') }}</div>
      <el-form inline label-position="top" class="filter-form">
        <el-form-item :label="t('filters.platform')">
          <div class="segmented-control platform-control">
            <button
              type="button"
              :class="{ 'is-active': platform === 'web' }"
              :aria-pressed="platform === 'web'"
              @click="emit('selectPlatform', 'web')"
            >
              {{ t('filters.platformWeb') }}
            </button>
            <button
              type="button"
              :class="{ 'is-active': platform === 'app' }"
              :aria-pressed="platform === 'app'"
              @click="emit('selectPlatform', 'app')"
            >
              {{ t('filters.platformApp') }}
            </button>
          </div>
        </el-form-item>
        <el-form-item :label="t('filters.userId')">
          <el-input
            :model-value="userId"
            clearable
            :placeholder="t('filters.placeholders.userId')"
            @update:model-value="emit('update:userId', $event)"
          />
        </el-form-item>
        <el-form-item :label="t('filters.deviceId')">
          <el-input
            :model-value="deviceId"
            clearable
            :placeholder="t('filters.placeholders.deviceId')"
            @update:model-value="emit('update:deviceId', $event)"
          />
        </el-form-item>
      </el-form>
      <p>{{ t('metrics.detailFilterHelp') }}</p>
    </div>
  </section>
</template>

<style scoped>
.control-card {
  overflow: hidden;
  margin-bottom: 22px;
  background: white;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  box-shadow: 0 8px 30px rgba(15, 23, 42, 0.04);
}
.control-toolbar,
.view-switcher,
.control-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.control-toolbar { justify-content: space-between; padding: 16px 18px; }
.control-label,
.filter-heading { color: var(--el-text-color-secondary); font-size: 12px; font-weight: 700; }
.segmented-control { display: flex; gap: 3px; padding: 3px; background: var(--el-fill-color); border-radius: 10px; }
.segmented-control button {
  min-width: 92px;
  padding: 8px 12px;
  color: var(--el-text-color-secondary);
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
.segmented-control button.is-active { color: var(--el-color-primary); font-weight: 700; background: white; box-shadow: 0 1px 4px rgba(15, 23, 42, 0.1); }
.filter-section { padding: 14px 18px; border-top: 1px solid var(--el-border-color-lighter); }
.technical-filters { background: var(--el-color-primary-light-9); }
.filter-heading { margin-bottom: 10px; color: var(--el-text-color-primary); }
.filter-form { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.filter-form :deep(.el-form-item) { margin: 0; }
.filter-form :deep(.el-form-item__label) { height: auto; padding-bottom: 6px; line-height: 1.2; }
.filter-form :deep(.el-input) { width: 180px; }
.filter-form :deep(.el-date-editor) { width: 290px; }
.technical-filters p { margin: 10px 0 0; color: var(--el-text-color-secondary); font-size: 12px; }
@media (max-width: 760px) {
  .control-toolbar { align-items: flex-start; flex-direction: column; }
  .control-actions { width: 100%; }
  .control-actions :deep(.el-button) { flex: 1; }
  .filter-form,
  .filter-form :deep(.el-form-item),
  .filter-form :deep(.el-form-item__content),
  .filter-form :deep(.el-input),
  .filter-form :deep(.el-date-editor) { width: 100%; }
}
</style>
