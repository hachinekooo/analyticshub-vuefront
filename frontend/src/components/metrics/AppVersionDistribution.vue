<template>
  <section class="version-distribution" aria-labelledby="app-version-title">
    <div class="version-heading">
      <div>
        <h3 id="app-version-title">{{ t('metrics.appVersions.title') }}</h3>
        <p v-if="distribution" class="version-summary">
          {{ t('metrics.appVersions.summary', {
            devices: formatNumber(distribution.activeDevices),
            coverage: formatPercent(distribution.coverageRate),
          }) }}
        </p>
      </div>
      <el-tooltip :content="t('metrics.appVersions.measurementHelp')" placement="top">
        <el-icon
          class="version-help"
          :aria-label="t('metrics.appVersions.measurementHelp')"
          tabindex="0"
        >
          <InfoFilled />
        </el-icon>
      </el-tooltip>
    </div>

    <el-alert
      v-if="failed"
      type="error"
      :title="t('metrics.appVersions.loadFailed')"
      :closable="false"
      show-icon
    />
    <div v-else-if="distribution?.items.length" class="version-table-scroll">
      <table class="version-table">
        <thead>
          <tr>
            <th scope="col">{{ t('metrics.appVersions.version') }}</th>
            <th scope="col">{{ t('metrics.appVersions.build') }}</th>
            <th scope="col" class="numeric-column">{{ t('metrics.appVersions.activeDevices') }}</th>
            <th scope="col">{{ t('metrics.appVersions.share') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in distribution.items" :key="`${item.appVersion}:${item.buildNumber}`">
            <td>{{ item.appVersion === 'unknown' ? t('metrics.appVersions.unknown') : `v${item.appVersion}` }}</td>
            <td>{{ item.buildNumber === 'unknown' ? '—' : item.buildNumber }}</td>
            <td class="numeric-column">{{ formatNumber(item.activeDevices) }}</td>
            <td>
              <div class="version-share">
                <div
                  class="version-meter"
                  role="progressbar"
                  :aria-label="`${formatPercent(item.share)} ${t('metrics.appVersions.share')}`"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuenow="toPercentage(item.share)"
                >
                  <span :style="{ width: `${toPercentage(item.share)}%` }"></span>
                </div>
                <span>{{ formatPercent(item.share) }}</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <el-empty v-else :description="t('metrics.appVersions.noData')" :image-size="52" />
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { InfoFilled } from '@element-plus/icons-vue'
import { useI18n } from '@/i18n'
import type { AppVersionDistribution } from '@/api/metrics'

defineProps<{
  distribution: AppVersionDistribution | null
  failed?: boolean
}>()

const { t, locale } = useI18n()
const numberFormatter = computed(() => new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US'))
const percentFormatter = computed(() => new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US', {
  style: 'percent',
  maximumFractionDigits: 1,
}))

const formatNumber = (value: number) => numberFormatter.value.format(value)
const formatPercent = (value: number) => percentFormatter.value.format(value)
const toPercentage = (value: number) => Math.min(100, Math.max(0, value * 100))
</script>

<style scoped>
.version-distribution {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.version-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.version-heading h3 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.version-summary {
  margin: 4px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.version-help {
  color: var(--el-text-color-secondary);
  cursor: help;
}

.version-share {
  display: grid;
  grid-template-columns: minmax(60px, 1fr) 52px;
  align-items: center;
  gap: 8px;
}

.version-table-scroll {
  overflow-x: auto;
}

.version-table {
  width: 100%;
  min-width: 430px;
  border-collapse: collapse;
  color: var(--el-text-color-regular);
  font-size: 12px;
}

.version-table th,
.version-table td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  text-align: left;
}

.version-table th {
  color: var(--el-text-color-secondary);
  font-weight: 500;
}

.version-table .numeric-column {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.version-meter {
  height: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--el-fill-color);
}

.version-meter span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--el-color-primary);
}

.version-share span {
  color: var(--el-text-color-regular);
  font-variant-numeric: tabular-nums;
  text-align: right;
}
</style>
