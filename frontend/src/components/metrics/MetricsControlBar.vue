<script setup lang="ts">
import { computed } from 'vue'
import type { MetricsGranularity } from '@/api/metrics'
import type { DashboardSpaceDefinition, DashboardSpaceKey } from '@/features/dashboard/projectDashboardTemplate'
import { useI18n } from '@/i18n'

const props = defineProps<{
  space: DashboardSpaceKey
  spaces: readonly DashboardSpaceDefinition[]
  dateRange: string[] | null
  granularity: MetricsGranularity
  userId: string
  deviceId: string
  refreshing: boolean
  editing: boolean
}>()

const emit = defineEmits<{
  'update:space': [value: DashboardSpaceKey]
  'update:dateRange': [value: string[] | null]
  'update:granularity': [value: MetricsGranularity]
  'update:userId': [value: string]
  'update:deviceId': [value: string]
  apply: []
  customize: []
}>()

const { t } = useI18n()
const isDetailSpace = computed(() => props.spaces.find((item) => item.key === props.space)?.detailFilters === true)
</script>

<template>
  <section class="control-card">
    <div class="control-toolbar">
      <div class="view-switcher">
        <span class="control-label">{{ t('metrics.workspace') }}</span>
        <div class="segmented-control">
          <button
            v-for="workspace in spaces"
            :key="workspace.key"
            type="button"
            :class="{ 'is-active': space === workspace.key }"
            :aria-pressed="space === workspace.key"
            :disabled="editing"
            @click="emit('update:space', workspace.key)"
          >
            {{ t(workspace.labelKey) }}
          </button>
        </div>
      </div>
      <div class="control-actions">
        <el-button type="primary" :loading="refreshing" @click="emit('apply')">
          <el-icon class="el-icon--left"><Refresh /></el-icon>
          {{ t('buttons.applyFilters') }}
        </el-button>
        <el-button type="primary" plain :disabled="editing" @click="emit('customize')">
          <el-icon class="el-icon--left"><Setting /></el-icon>
          {{ t('metrics.customization.open') }}
        </el-button>
      </div>
    </div>

    <div class="filter-section" :class="{ 'combined-filters': isDetailSpace }">
      <div class="filter-group common-filter-group">
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
          <el-form-item v-if="!isDetailSpace" :label="t('filters.granularity')">
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

      <div v-if="isDetailSpace" class="filter-divider" aria-hidden="true"></div>

      <div v-if="isDetailSpace" class="filter-group detail-filter-group">
        <div class="filter-heading">
          {{ t('metrics.detailFilters') }}
        </div>
        <el-form inline label-position="top" class="filter-form">
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
      </div>
    </div>
  </section>
</template>

<style scoped>
.control-card {
  overflow: hidden;
  margin-bottom: 22px;
  background: white;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
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
.segmented-control { display: flex; gap: 3px; padding: 3px; background: #e8e8ed; border-radius: 9px; }
.segmented-control button {
  min-width: 92px;
  padding: 8px 12px;
  color: var(--el-text-color-secondary);
  border: 0;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
}
.segmented-control button.is-active { color: #1d1d1f; font-weight: 600; background: white; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.14); }
.filter-section { padding: 14px 18px; border-top: 1px solid var(--el-border-color-lighter); }
.combined-filters { display: flex; align-items: stretch; gap: 20px; }
.filter-group { min-width: 0; }
.common-filter-group { flex: 0 0 auto; }
.detail-filter-group { flex: 1; }
.filter-divider { width: 1px; align-self: stretch; background: var(--el-border-color-lighter); }
.filter-heading { margin-bottom: 10px; color: var(--el-text-color-primary); }
.filter-help { margin-left: 8px; color: var(--el-text-color-secondary); font-weight: 400; }
.filter-form { display: flex; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
.filter-form :deep(.el-form-item) { margin: 0; }
.filter-form :deep(.el-form-item__label) { height: auto; padding-bottom: 6px; line-height: 1.2; }
.filter-form :deep(.el-input) { width: 180px; }
.filter-form :deep(.el-date-editor) { width: 290px; }
@media (max-width: 980px) {
  .combined-filters { flex-wrap: wrap; }
  .filter-divider { width: 100%; height: 1px; }
  .detail-filter-group { flex-basis: 100%; }
}
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
