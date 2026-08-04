<template>
  <div class="admin-container">
    <PageHeader :title="t('metrics.title')" :subtitle="t('metrics.subtitle')" />

    <MetricsControlBar
      :space="activeSpace"
      :spaces="dashboardSpaces"
      :date-range="filters.dateRange"
      :granularity="filters.granularity"
      :user-id="filters.userId"
      :device-id="filters.deviceId"
      :refreshing="refreshing"
      :editing="isLayoutEditable"
      @update:space="activeSpace = $event"
      @update:date-range="filters.dateRange = $event"
      @update:granularity="filters.granularity = $event"
      @update:user-id="filters.userId = $event"
      @update:device-id="filters.deviceId = $event"
      @apply="applyFilters"
      @customize="startLayoutEditing"
    />

    <DashboardEditorPanel
      :visible="isLayoutEditable"
      :available-widgets="availableWidgetTypes"
      :saving="dashboardSaving"
      @add="addWidgetType"
      @reset="resetToDefaultLayout"
      @cancel="cancelLayoutEditing"
      @complete="completeLayoutEditing"
    />

      <div class="workspace-area" :class="{ 'is-editing': isLayoutEditable }">
        <grid-layout
          v-if="layoutVisible"
          v-model:layout="dashboardLayout"
          :col-num="12"
          :row-height="30"
          :is-draggable="isLayoutEditable"
          :is-resizable="isLayoutEditable"
          :vertical-compact="true"
          :use-css-transforms="true"
          @layout-updated="handleResize"
          class="dashboard-grid"
        >
          <grid-item v-for="item in dashboardLayout"
            :key="item.i"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :i="item.i"
            :min-w="item.minW || 2"
            :min-h="item.minH || 2"
            :is-draggable="isLayoutEditable"
            :is-resizable="isLayoutEditable"

            class="grid-item-card" :class="{ 'is-editing': isLayoutEditable }"
          >
            <div class="widget-container">
              <!-- Widget Header with Actions -->
              <div class="widget-header-bar" v-if="isLayoutEditable">
                 <span class="widget-drag-handle"><el-icon><Rank /></el-icon></span>
                 <span class="widget-label">{{ getWidgetLabel(item) }}</span>
                 <span class="widget-resize-hint">{{ t('metrics.customization.resizeHint') }}</span>
                 <el-button
                   v-if="canConfigureWidget(item)"
                   :aria-label="t('metrics.widgetConfig.editAction')"
                   :title="t('metrics.widgetConfig.editAction')"
                   size="small"
                   link
                   @click.stop="openWidgetConfig(item)"
                 >
                   <el-icon><Setting /></el-icon>
                 </el-button>
                 <el-button :aria-label="t('buttons.delete')" :title="t('buttons.delete')" size="small" link type="danger" @click.stop="removeWidget(item.i)">
                   <el-icon><Close /></el-icon>
                 </el-button>
              </div>

              <!-- Widget Content Overlay -->
              <div class="widget-inner">
                <!-- Overview Widget -->
                <div v-if="isWidgetType(item, 'core.overview')" class="widget-content" v-loading="overviewLoading">
                  <div v-if="hasCustomWidgetTitle(item)" class="widget-header">
                    <span>{{ getWidgetLabel(item) }}</span>
                  </div>
                  <div v-if="overview" class="overview-grid-compact">
                    <div v-for="(val, label) in overviewItems" :key="label" class="overview-mini-card">
                       <p class="mini-label">{{ label }}</p>
                       <p class="mini-value">{{ val }}</p>
                    </div>
                  </div>
                  <el-empty v-else :description="t('metrics.noData')" :image-size="60" />
                </div>

                <!-- Trends Widget -->
                <div v-else-if="isWidgetType(item, 'core.trends')" class="widget-content" v-loading="trendsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <div :id="'chart-business-' + item.i" class="echart-container"></div>
                </div>

                <!-- Top Events Widget -->
                <div v-else-if="isWidgetType(item, 'core.topEvents')" class="widget-content" v-loading="topEventsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="topEvents?.items || []" size="small" style="width: 100%">
                      <el-table-column :label="t('tables.eventType')" min-width="160" show-overflow-tooltip>
                        <template #default="{ row }">
                          <div>{{ eventDisplayName(row.eventType) }}</div>
                          <code v-if="eventDisplayName(row.eventType) !== row.eventType">{{ row.eventType }}</code>
                        </template>
                      </el-table-column>
                      <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
                   </el-table>
                </div>

                <!-- Product Funnel Widget -->
                <div v-else-if="isWidgetType(item, 'core.productFunnel')" class="widget-content" v-loading="productFunnelLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-empty v-if="!dashboardAnalyticsConfig.funnel" :description="t('metrics.notConfigured')" :image-size="60" />
                   <el-table v-else :data="productFunnelRows" size="small" style="width: 100%">
                      <el-table-column prop="groupKey" :label="t('tables.group')" min-width="140" show-overflow-tooltip />
                      <el-table-column prop="step" :label="t('tables.step')" min-width="180" show-overflow-tooltip />
                      <el-table-column prop="users" :label="t('tables.users')" min-width="90" />
                      <el-table-column prop="conversionRate" :label="t('tables.conversion')" min-width="110">
                        <template #default="{ row }">{{ formatPercent(row.conversionRate) }}</template>
                      </el-table-column>
                      <el-table-column prop="dropOffRate" :label="t('tables.dropOff')" min-width="100">
                        <template #default="{ row }">{{ formatPercent(row.dropOffRate) }}</template>
                      </el-table-column>
                   </el-table>
                </div>

                <!-- Retention Widget -->
                <div v-else-if="isWidgetType(item, 'core.retention')" class="widget-content" v-loading="retentionLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-empty v-if="!dashboardAnalyticsConfig.retention" :description="t('metrics.notConfigured')" :image-size="60" />
                   <template v-else>
                   <div class="retention-summary">
                     <span>{{ t('tables.cohortUsers') }}</span>
                     <strong>{{ formatNumber(retention?.cohortUsers || 0) }}</strong>
                   </div>
                   <el-table :data="retention?.buckets || []" size="small" style="width: 100%">
                      <el-table-column prop="day" :label="t('tables.day')" min-width="80">
                        <template #default="{ row }">D{{ row.day }}</template>
                      </el-table-column>
                      <el-table-column prop="retainedUsers" :label="t('tables.users')" min-width="100" />
                      <el-table-column prop="retentionRate" :label="t('tables.retention')" min-width="110">
                        <template #default="{ row }">{{ formatPercent(row.retentionRate) }}</template>
                      </el-table-column>
                   </el-table>
                   </template>
                </div>

                <!-- Traffic Trends Widget -->
                <div v-else-if="isWidgetType(item, 'core.trafficTrends')" class="widget-content" v-loading="trafficTrendsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <div :id="'chart-traffic-' + item.i" class="echart-container"></div>
                </div>
                
                <!-- Rankings Widget -->
                 <div v-else-if="isWidgetType(item, 'core.topPages')" class="widget-content">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="topPages" size="small" style="width: 100%">
                      <el-table-column prop="key" :label="t('tables.page')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
                   </el-table>
                </div>

                <!-- Counters Widget -->
                <CounterDisplayWidget
                  v-else-if="isWidgetType(item, 'core.counters')"
                  class="widget-content"
                  :project-id="filters.projectId"
                  :title="getWidgetLabel(item)"
                  :configured-keys="configForWidget('core.counters').keys"
                  :refresh-token="extensionRefreshToken"
                />

                <!-- Traffic Table Widget -->
                <div v-else-if="isWidgetType(item, 'core.traffic')" class="widget-content" v-loading="trafficLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="traffic.items" size="small" style="width: 100%">
                      <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="pagePath" :label="t('tables.page')" min-width="200" show-overflow-tooltip />
                      <el-table-column prop="referrer" :label="t('tables.referrer')" min-width="150" show-overflow-tooltip />
                      <el-table-column prop="metricTimestamp" :label="t('tables.eventTime')" min-width="140">
                         <template #default="{ row }">{{ formatTimestamp(row.metricTimestamp) }}</template>
                      </el-table-column>
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="traffic.total"
                        :page-size="traffic.pageSize"
                        :current-page="traffic.page"
                        @current-change="handleTrafficPageChange"
                      />
                   </div>
                </div>

                <!-- Events Table Widget -->
                <div v-else-if="isWidgetType(item, 'core.events')" class="widget-content" v-loading="eventsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="events.items" size="small" style="width: 100%">
                      <el-table-column :label="t('tables.eventType')" min-width="160" show-overflow-tooltip>
                        <template #default="{ row }">
                          <div>{{ eventDisplayName(row.eventType) }}</div>
                          <code v-if="eventDisplayName(row.eventType) !== row.eventType">{{ row.eventType }}</code>
                        </template>
                      </el-table-column>
                      <el-table-column prop="eventTimestamp" :label="t('tables.eventTime')" min-width="160">
                         <template #default="{ row }">{{ formatTimestamp(row.eventTimestamp) }}</template>
                      </el-table-column>
                      <el-table-column prop="userId" :label="t('tables.userId')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="properties" :label="t('tables.properties')" min-width="200" show-overflow-tooltip>
                         <template #default="{ row }">{{ formatJson(row.properties) }}</template>
                      </el-table-column>
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="events.total"
                        :page-size="events.pageSize"
                        :current-page="events.page"
                        @current-change="handleEventsPageChange"
                      />
                   </div>
                </div>

                <!-- Devices Table Widget -->
                <div v-else-if="isWidgetType(item, 'core.devices')" class="widget-content" v-loading="devicesLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="devices.items" size="small" style="width: 100%">
                      <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="deviceModel" :label="t('tables.model')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="createdAt" :label="t('tables.startTime')" min-width="140">
                         <template #default="{ row }">{{ formatTimestamp(new Date(row.createdAt).getTime()) }}</template>
                      </el-table-column>
                      <el-table-column prop="lastActiveAt" :label="t('tables.lastActive')" min-width="140">
                         <template #default="{ row }">{{ formatTimestamp(new Date(row.lastActiveAt).getTime()) }}</template>
                      </el-table-column>
                      <el-table-column prop="isBanned" :label="t('tables.status')" min-width="100">
                        <template #default="{ row }">
                          <el-tag size="small" :type="row.isBanned ? 'danger' : 'success'">
                            {{ row.isBanned ? t('status.banned') : t('status.normal') }}
                          </el-tag>
                        </template>
                      </el-table-column>
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="devices.total"
                        :page-size="devices.pageSize"
                        :current-page="devices.page"
                        @current-change="handleDevicesPageChange"
                      />
                   </div>
                </div>

                <!-- Sessions Table Widget -->
                <div v-else-if="isWidgetType(item, 'core.sessions')" class="widget-content" v-loading="sessionsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="sessions.items" size="small" style="width: 100%">
                      <el-table-column prop="sessionId" :label="t('tables.sessionId')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="sessionDurationMs" :label="t('tables.duration')" min-width="120">
                         <template #default="{ row }">{{ formatDuration(row.sessionDurationMs) }}</template>
                      </el-table-column>
                      <el-table-column prop="eventCount" :label="t('tables.events')" min-width="120" />
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="sessions.total"
                        :page-size="sessions.pageSize"
                        :current-page="sessions.page"
                        @current-change="handleSessionsPageChange"
                      />
                   </div>
                </div>

                <!-- Trusted build-time extension widget -->
                <div v-else-if="extensionForWidget(item)" class="widget-content">
                  <div class="widget-header">
                    <span>{{ getWidgetLabel(item) }}</span>
                  </div>
                  <component
                    :is="extensionComponent(item)"
                    :project-id="filters.projectId"
                    :widget-id="item.i"
                    :config="extensionConfig(item)"
                    :date-range="extensionDateRange"
                    :locale="locale"
                    :editable="isLayoutEditable"
                    :refresh-token="extensionRefreshToken"
                    @update:config="updateExtensionWidgetConfig(item, $event)"
                  />
                </div>

                <el-empty v-else :description="t('metrics.dashboardUnsupportedWidget')" :image-size="60" />
              </div>
            </div>
          </grid-item>
        </grid-layout>
      </div>

    <el-dialog
      v-model="widgetConfigDialogVisible"
      :title="t('metrics.widgetConfig.dialogTitle', { widget: pendingWidgetLabel })"
      width="620px"
    >
      <el-form :model="widgetConfigForm" label-position="top">
        <div v-if="widgetConfigTargetId" class="widget-size-fields">
          <el-form-item :label="t('metrics.widgetConfig.width')">
            <el-input-number v-model="widgetConfigForm.width" :min="widgetConfigMinWidth" :max="12" />
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.height')">
            <el-input-number v-model="widgetConfigForm.height" :min="widgetConfigMinHeight" :max="40" />
          </el-form-item>
        </div>
        <el-form-item :label="t('metrics.widgetConfig.customTitle')">
          <el-input
            v-model="widgetConfigForm.title"
            maxlength="100"
            clearable
            :placeholder="t('metrics.widgetConfig.customTitlePlaceholder')"
          />
        </el-form-item>

        <template v-if="widgetConfigType === 'core.productFunnel'">
          <el-form-item :label="t('metrics.widgetConfig.funnelSteps')" required>
            <el-select
              v-model="widgetConfigForm.funnelSteps"
              multiple
              filterable
              style="width: 100%"
              :placeholder="t('metrics.widgetConfig.funnelStepsPlaceholder')"
            >
              <el-option
                v-for="definition in activeSemanticDefinitions"
                :key="definition.semanticKey"
                :label="semanticDefinitionLabel(definition)"
                :value="definition.semanticKey"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.groupBy')">
            <el-input
              v-model="widgetConfigForm.groupBy"
              maxlength="80"
              clearable
              :placeholder="t('metrics.widgetConfig.groupByPlaceholder')"
            />
          </el-form-item>
        </template>

        <template v-else-if="widgetConfigType === 'core.retention'">
          <el-form-item :label="t('metrics.widgetConfig.cohortEvent')" required>
            <el-select
              v-model="widgetConfigForm.cohortEvent"
              filterable
              style="width: 100%"
              :placeholder="t('metrics.widgetConfig.eventPlaceholder')"
            >
              <el-option
                v-for="definition in activeSemanticDefinitions"
                :key="definition.semanticKey"
                :label="semanticDefinitionLabel(definition)"
                :value="definition.semanticKey"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.returnEvent')" required>
            <el-select
              v-model="widgetConfigForm.returnEvent"
              filterable
              style="width: 100%"
              :placeholder="t('metrics.widgetConfig.eventPlaceholder')"
            >
              <el-option
                v-for="definition in activeSemanticDefinitions"
                :key="definition.semanticKey"
                :label="semanticDefinitionLabel(definition)"
                :value="definition.semanticKey"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.retentionDays')" required>
            <el-input
              v-model="widgetConfigForm.retentionDaysText"
              :placeholder="t('metrics.widgetConfig.retentionDaysPlaceholder')"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="widgetConfigDialogVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" @click="confirmConfiguredWidget">
          {{ widgetConfigTargetId ? t('buttons.save') : t('metrics.addWidget') }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, readonly, ref, watch } from 'vue'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from '@/i18n'
import { GridLayout, GridItem } from 'vue3-grid-layout-next'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import MetricsControlBar from '@/components/metrics/MetricsControlBar.vue'
import DashboardEditorPanel from '@/components/metrics/DashboardEditorPanel.vue'
import CounterDisplayWidget from '@/features/counters/CounterDisplayWidget.vue'
import { useProjectContextStore } from '@/stores/projectContext'
import { getApiErrorMessage as getErrorMessage } from '@/utils/apiError'
import { projectIdFromParam, projectRoute } from '@/utils/projectRoutes'
import {
  cloneDashboardLayout,
  dashboardSpacesForTemplate,
  type DashboardLayoutItem,
  type DashboardSpaceKey,
} from '@/features/dashboard/projectDashboardTemplate'
import {
  getDashboardWidgetExtension,
  getDashboardWidgetExtensions,
  normalizeDashboardExtensionConfig,
  type DashboardExtensionConfig,
  type DashboardWidgetExtension,
} from '@/extensions/dashboard'
import {
  getEventCatalog,
  getSemanticDefinitions,
  type EventCatalogEntry,
  type SemanticDefinition,
} from '@/api/semantic'
import {
  getProjectDashboards,
  upsertProjectDashboard,
  type AdminDashboard,
  type DashboardDefinition,
  type DashboardWidgetDefinition,
} from '@/api/dashboard'
import {
  Close,
  Rank,
  Setting,
} from '@element-plus/icons-vue'
import {
  getDevices,
  getEvents,
  getMetricsOverview,
  getMetricsTrends,
  getSessions,
  getTopEvents,
  getTrafficMetrics,
  getTrafficTrends,
  getTopPages,
  type MetricsOverview,
  type MetricsTopEvents,
  type MetricsTrends,
  type PagedResult,
  type DeviceRecord,
  type EventRecord,
  type SessionRecord,
  type TrafficMetricRecord,
  type MetricsGranularity,
  type TrafficGranularity,
  type TrafficTrends,
  type TopPageItem,
  getProductFunnel,
  getProductRetention,
  type FunnelResponse,
  type RetentionResponse,
} from '@/api/metrics'

use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

// --- 1. Types & Interfaces ---
type DashboardItem = DashboardLayoutItem

interface DashboardAnalyticsConfig {
  funnel?: {
    steps: string[]
    groupBy?: string
  }
  retention?: {
    cohortEvent: string
    returnEvent: string
    days: number[]
  }
}

// --- 2. State & Basic Setup ---
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const projectContext = useProjectContextStore()
const { activeProjects: projects, selectedProjectId, selectedProject } = storeToRefs(projectContext)

const routeProjectId = computed(() => {
  return projectIdFromParam(route.params.projectId)
})

const refreshing = ref(false)
const isLayoutEditable = ref(false)
const dashboardSpaces = computed(() => dashboardSpacesForTemplate(
  selectedProject.value?.analysisTemplate ?? 'app',
))
const activeSpace = ref<DashboardSpaceKey>(dashboardSpaces.value[0]!.key)
const dashboardLayout = ref<DashboardItem[]>([])
const serverDashboards = ref<AdminDashboard[]>([])
const dashboardSaving = ref(false)
const layoutBeforeEditing = ref<DashboardItem[] | null>(null)

// Filters & Params
const filters = reactive({
  projectId: '',
  dateRange: null as string[] | null,
  granularity: 'day' as MetricsGranularity,
  topEventsLimit: 10,
  eventType: '',
  userId: '',
  deviceId: '',
  sessionId: '',
  apiKey: '',
  isBanned: '',
})
const extensionRefreshToken = ref(0)

type MetricsRequestSnapshot = Readonly<{
  dateRange: readonly string[] | null
  granularity: MetricsGranularity
  topEventsLimit: number
  eventType: string
  userId: string
  deviceId: string
  sessionId: string
  apiKey: string
  isBanned: string
  eventsPage: number
  devicesPage: number
  sessionsPage: number
  trafficPage: number
}>

type ProjectRequestContext = {
  projectId: string
  projectGeneration: number
  requestGeneration: number
  snapshot: MetricsRequestSnapshot
}
type AppliedMetricsFilters = Omit<MetricsRequestSnapshot,
  'eventsPage' | 'devicesPage' | 'sessionsPage' | 'trafficPage'>

let projectContextGeneration = 0
let metricsRequestGeneration = 0
const captureFilterSnapshot = (): AppliedMetricsFilters => ({
  dateRange: Array.isArray(filters.dateRange) ? [...filters.dateRange] : null,
  granularity: filters.granularity,
  topEventsLimit: filters.topEventsLimit,
  eventType: filters.eventType,
  userId: filters.userId,
  deviceId: filters.deviceId,
  sessionId: filters.sessionId,
  apiKey: filters.apiKey,
  isBanned: filters.isBanned,
})
// `filters` is the editable form state; requests only read this committed snapshot.
// This prevents half-entered filters from triggering competing request batches.
const appliedFilters = ref<AppliedMetricsFilters>(captureFilterSnapshot())
const extensionDateRange = computed<readonly [string, string] | null>(() =>
  Array.isArray(appliedFilters.value.dateRange) && appliedFilters.value.dateRange.length === 2
    ? [appliedFilters.value.dateRange[0]!, appliedFilters.value.dateRange[1]!] as const
    : null,
)
const commitFilterSnapshot = () => {
  appliedFilters.value = captureFilterSnapshot()
}
const captureMetricsSnapshot = (): MetricsRequestSnapshot => ({
  ...appliedFilters.value,
  eventsPage: events.page,
  devicesPage: devices.page,
  sessionsPage: sessions.page,
  trafficPage: traffic.page,
})
const captureProjectContext = (): ProjectRequestContext => ({
  projectId: filters.projectId,
  projectGeneration: projectContextGeneration,
  requestGeneration: metricsRequestGeneration,
  snapshot: captureMetricsSnapshot(),
})
const beginRefreshContext = () => {
  metricsRequestGeneration += 1
  return captureProjectContext()
}
const isCurrentProjectScope = (context: ProjectRequestContext) =>
  context.projectGeneration === projectContextGeneration
  && context.projectId === filters.projectId
const isCurrentProjectContext = (context: ProjectRequestContext) =>
  isCurrentProjectScope(context) && context.requestGeneration === metricsRequestGeneration

// Metrics Data Collections
const overview = ref<MetricsOverview | null>(null)
const trends = ref<MetricsTrends | null>(null)
const topEvents = ref<MetricsTopEvents | null>(null)
const trafficTrends = ref<TrafficTrends | null>(null)
const topPages = ref<TopPageItem[]>([])
const productFunnel = ref<FunnelResponse | null>(null)
const retention = ref<RetentionResponse | null>(null)
const dashboardAnalyticsConfig = ref<DashboardAnalyticsConfig>({})
const semanticEventCatalog = ref<EventCatalogEntry[]>([])
const semanticDefinitions = ref<SemanticDefinition[]>([])

// Paged Results
const events = reactive<PagedResult<EventRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
const devices = reactive<PagedResult<DeviceRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
const sessions = reactive<PagedResult<SessionRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
const traffic = reactive<PagedResult<TrafficMetricRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })

// Dialogs & Form
const widgetConfigDialogVisible = ref(false)
const widgetConfigType = ref('')
const widgetConfigTargetId = ref('')
const widgetConfigForm = reactive({
  title: '',
  width: 6,
  height: 8,
  funnelSteps: [] as string[],
  groupBy: '',
  cohortEvent: '',
  returnEvent: '',
  retentionDaysText: '1, 7, 30',
})
const widgetConfigTarget = computed(() =>
  dashboardLayout.value.find((item) => item.i === widgetConfigTargetId.value),
)
const widgetConfigMinWidth = computed(() => widgetConfigTarget.value?.minW || 2)
const widgetConfigMinHeight = computed(() => widgetConfigTarget.value?.minH || 2)
const activeSemanticDefinitions = computed(() => semanticDefinitions.value
  .filter((definition) => definition.isActive)
  .sort((left, right) => left.semanticKey.localeCompare(right.semanticKey)))

// Loading States
const overviewLoading = ref(false)
const trendsLoading = ref(false)
const topEventsLoading = ref(false)
const eventsLoading = ref(false)
const devicesLoading = ref(false)
const sessionsLoading = ref(false)
const trafficLoading = ref(false)
const trafficTrendsLoading = ref(false)
const topPagesLoading = ref(false)
const productFunnelLoading = ref(false)
const retentionLoading = ref(false)

// --- 3. Utility Functions ---
const cleanParams = <T extends Record<string, unknown>>(params: T): T => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  ) as T
}

const rangeParams = (snapshot: MetricsRequestSnapshot = captureMetricsSnapshot()) => {
  if (Array.isArray(snapshot.dateRange) && snapshot.dateRange.length === 2) {
    return { from: snapshot.dateRange[0], to: snapshot.dateRange[1] }
  }
  return {}
}

const semanticEventByRawKey = computed(() => {
  const entries = new Map<string, EventCatalogEntry>()
  for (const entry of semanticEventCatalog.value) {
    entries.set(entry.rawKey, entry)
    if (entry.mapped && entry.semanticKey && !entries.has(entry.semanticKey)) {
      entries.set(entry.semanticKey, entry)
    }
  }
  return entries
})

const eventDisplayName = (rawKey: string) => {
  const names = semanticEventByRawKey.value.get(rawKey)?.displayName
  if (!names) return rawKey
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  for (const key of preferred) {
    if (names[key]) return names[key]
  }
  return Object.values(names)[0] || rawKey
}
const semanticDefinitionLabel = (definition: SemanticDefinition) => {
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  const name = preferred.map((key) => definition.displayName[key]).find(Boolean)
    || Object.values(definition.displayName)[0]
  return name ? `${name} · ${definition.semanticKey}` : definition.semanticKey
}

const requireProject = () => {
  if (!filters.projectId) {
    ElMessage.warning(t('errors.selectProject'))
    return false
  }
  return true
}
// --- 4. Layout Management ---
const activeSpaceDefinition = computed(() =>
  dashboardSpaces.value.find((space) => space.key === activeSpace.value) ?? dashboardSpaces.value[0]!,
)

const widgetLabelKeys: Record<string, string> = {
  'core.overview': 'metrics.overview',
  'core.trends': 'metrics.trends',
  'core.topEvents': 'metrics.topEvents',
  'core.productFunnel': 'metrics.productFunnel',
  'core.retention': 'metrics.retention',
  'core.trafficTrends': 'metrics.trafficTrends',
  'core.topPages': 'metrics.topPages',
  'core.counters': 'metrics.counters',
  'core.events': 'metrics.events',
  'core.devices': 'metrics.devices',
  'core.sessions': 'metrics.sessions',
  'core.traffic': 'metrics.traffic',
}

const pendingWidgetLabel = computed(() => {
  const key = widgetConfigType.value ? widgetLabelKeys[widgetConfigType.value] : ''
  return key ? t(key) : ''
})

const removeWidget = (id: string) => {
  const removed = dashboardLayout.value.find((item) => item.i === id)
  const removedType = removed ? resolvedWidgetType(removed) : null
  dashboardLayout.value = dashboardLayout.value.filter(item => item.i !== id)
  if (removedType === 'core.productFunnel') {
    const next = { ...dashboardAnalyticsConfig.value }
    delete next.funnel
    dashboardAnalyticsConfig.value = next
  }
  if (removedType === 'core.retention') {
    const next = { ...dashboardAnalyticsConfig.value }
    delete next.retention
    dashboardAnalyticsConfig.value = next
  }
}

const resetToDefaultLayout = () => {
  dashboardLayout.value = cloneDashboardLayout(activeSpaceDefinition.value.defaultLayout)
}

const startLayoutEditing = () => {
  if (isLayoutEditable.value) return
  layoutBeforeEditing.value = JSON.parse(JSON.stringify(dashboardLayout.value))
  isLayoutEditable.value = true
}

const cancelLayoutEditing = () => {
  if (layoutBeforeEditing.value) {
    dashboardLayout.value = JSON.parse(JSON.stringify(layoutBeforeEditing.value))
    syncAnalyticsConfigFromLayout()
  }
  layoutBeforeEditing.value = null
  isLayoutEditable.value = false
}

const availableWidgetTypes = computed(() => {
  const present = new Set(dashboardLayout.value.map((item) => resolvedWidgetType(item)))
  const coreWidgets = activeSpaceDefinition.value.widgetTemplates
    .filter((item) => item.type && !present.has(item.type))
    .map((item) => ({
      type: item.type as string,
      label: t(widgetLabelKeys[item.type as string] || 'metrics.dashboardUnsupportedWidget'),
    }))
  const extensionWidgets = getDashboardWidgetExtensions(activeSpace.value)
    .filter((extension) => !present.has(extension.type))
    .map((extension) => ({
      type: extension.type,
      label: extensionDisplayName(extension),
    }))
  return [...coreWidgets, ...extensionWidgets]
})
const appendExtensionWidget = (type: string) => {
  const extension = getDashboardWidgetExtension(type)
  if (!extension || !extension.spaces.includes(activeSpace.value)) return
  if (dashboardLayout.value.some((item) => resolvedWidgetType(item) === type)) return
  const nextY = dashboardLayout.value.reduce(
    (bottom, item) => Math.max(bottom, item.y + item.h),
    0,
  )
  const config = extension.defaultConfig === undefined
    ? undefined
    : normalizeDashboardExtensionConfig(extension, extension.defaultConfig) || undefined
  if (extension.configRequired && config === undefined) return
  const idPrefix = extension.type.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)
  dashboardLayout.value.push({
    i: `${idPrefix}_${Date.now()}`,
    type: extension.type,
    x: 0,
    y: nextY,
    w: extension.defaultLayout.w,
    h: extension.defaultLayout.h,
    minW: extension.defaultLayout.minW,
    minH: extension.defaultLayout.minH,
    config,
  })
}

const appendWidgetType = (type: string, config?: Record<string, unknown>) => {
  if (dashboardLayout.value.some((item) => resolvedWidgetType(item) === type)) return
  const template = activeSpaceDefinition.value.widgetTemplates.find((item) => item.type === type)
  if (!template) return
  const nextY = dashboardLayout.value.reduce(
    (bottom, item) => Math.max(bottom, item.y + item.h),
    0,
  )
  dashboardLayout.value.push({
    ...JSON.parse(JSON.stringify(template)),
    i: `${template.i.replace(/_default$/, '')}_${Date.now()}`,
    x: 0,
    y: nextY,
    config,
  })
  if (type === 'core.productFunnel' && Array.isArray(config?.steps)) {
    dashboardAnalyticsConfig.value = {
      ...dashboardAnalyticsConfig.value,
      funnel: {
        steps: config.steps as string[],
        groupBy: typeof config.groupBy === 'string' ? config.groupBy : undefined,
      },
    }
  }
  if (type === 'core.retention'
    && typeof config?.cohortEvent === 'string'
    && typeof config.returnEvent === 'string'
    && Array.isArray(config.days)) {
    dashboardAnalyticsConfig.value = {
      ...dashboardAnalyticsConfig.value,
      retention: {
        cohortEvent: config.cohortEvent,
        returnEvent: config.returnEvent,
        days: config.days as number[],
      },
    }
  }
  nextTick(() => void refreshAll())
}

const resetWidgetConfigForm = () => {
  Object.assign(widgetConfigForm, {
    title: '',
    width: 6,
    height: 8,
    funnelSteps: [],
    groupBy: '',
    cohortEvent: '',
    returnEvent: '',
    retentionDaysText: '1, 7, 30',
  })
}

const canConfigureWidget = (item: DashboardItem) => {
  const type = resolvedWidgetType(item)
  return Boolean(type && !getDashboardWidgetExtension(type))
}

const openWidgetConfig = (item: DashboardItem) => {
  const type = resolvedWidgetType(item)
  if (!type || getDashboardWidgetExtension(type)) return
  resetWidgetConfigForm()
  widgetConfigTargetId.value = item.i
  widgetConfigType.value = type
  widgetConfigForm.title = typeof item.config?.title === 'string' ? item.config.title : ''
  widgetConfigForm.width = item.w
  widgetConfigForm.height = item.h
  if (type === 'core.productFunnel') {
    widgetConfigForm.funnelSteps = Array.isArray(item.config?.steps)
      ? item.config.steps.filter((step): step is string => typeof step === 'string')
      : []
    widgetConfigForm.groupBy = typeof item.config?.groupBy === 'string' ? item.config.groupBy : ''
  }
  if (type === 'core.retention') {
    widgetConfigForm.cohortEvent = typeof item.config?.cohortEvent === 'string' ? item.config.cohortEvent : ''
    widgetConfigForm.returnEvent = typeof item.config?.returnEvent === 'string' ? item.config.returnEvent : ''
    widgetConfigForm.retentionDaysText = Array.isArray(item.config?.days)
      ? item.config.days.filter((day): day is number => Number.isInteger(day)).join(', ')
      : '1, 7, 30'
  }
  widgetConfigDialogVisible.value = true
  if (type === 'core.productFunnel' || type === 'core.retention') void loadSemanticDefinitions()
}

const addWidgetType = (type: string) => {
  if (dashboardLayout.value.some((item) => resolvedWidgetType(item) === type)) return
  if (getDashboardWidgetExtension(type)) {
    appendExtensionWidget(type)
    return
  }
  if (type === 'core.productFunnel' || type === 'core.retention') {
    resetWidgetConfigForm()
    widgetConfigTargetId.value = ''
    widgetConfigType.value = type
    widgetConfigDialogVisible.value = true
    void loadSemanticDefinitions()
    return
  }
  appendWidgetType(type)
}

const validAnalyticsKey = (value: string, maxLength = 100) => {
  const normalized = value.trim()
  return normalized.length <= maxLength && /^[A-Za-z0-9_.:-]+$/.test(normalized)
}

const confirmConfiguredWidget = () => {
  const type = widgetConfigType.value
  if (!type) return
  const config: Record<string, unknown> = {}
  const title = widgetConfigForm.title.trim()
  if (title) config.title = title

  if (type === 'core.productFunnel') {
    const steps = [...new Set(widgetConfigForm.funnelSteps.map((step) => step.trim()).filter(Boolean))]
    if (steps.length < 2 || steps.length > 12 || steps.some((step) => !validAnalyticsKey(step))) {
      ElMessage.warning(t('metrics.widgetConfig.invalidFunnelSteps'))
      return
    }
    const groupBy = widgetConfigForm.groupBy.trim()
    if (groupBy && !validAnalyticsKey(groupBy, 80)) {
      ElMessage.warning(t('metrics.widgetConfig.invalidGroupBy'))
      return
    }
    config.steps = steps
    if (groupBy) config.groupBy = groupBy
  } else if (type === 'core.retention') {
    const cohortEvent = widgetConfigForm.cohortEvent.trim()
    const returnEvent = widgetConfigForm.returnEvent.trim()
    const dayValues = widgetConfigForm.retentionDaysText
      .split(/[\s,，]+/)
      .filter(Boolean)
      .map((value) => Number(value))
    const days = [...new Set(dayValues)].sort((left, right) => left - right)
    if (!validAnalyticsKey(cohortEvent) || !validAnalyticsKey(returnEvent)) {
      ElMessage.warning(t('metrics.widgetConfig.invalidRetentionEvents'))
      return
    }
    if (days.length < 1 || days.length > 30
      || days.some((day) => !Number.isInteger(day) || day < 0 || day > 90)) {
      ElMessage.warning(t('metrics.widgetConfig.invalidRetentionDays'))
      return
    }
    config.cohortEvent = cohortEvent
    config.returnEvent = returnEvent
    config.days = days
  }

  widgetConfigDialogVisible.value = false
  if (widgetConfigTargetId.value) {
    const item = dashboardLayout.value.find((candidate) => candidate.i === widgetConfigTargetId.value)
    if (item) {
      item.config = config
      item.w = Math.min(12, Math.max(item.minW || 2, widgetConfigForm.width))
      item.h = Math.min(40, Math.max(item.minH || 2, widgetConfigForm.height))
      item.x = Math.min(item.x, 12 - item.w)
    }
    syncAnalyticsConfigFromLayout()
    widgetConfigTargetId.value = ''
    void nextTick(() => refreshAll())
    return
  }
  appendWidgetType(type, config)
}

const applyServerDashboard = (dashboard: AdminDashboard) => {
  const widgets = dashboard.definition?.widgets
  if (!Array.isArray(widgets)) return false
  dashboardLayout.value = widgets.map((widget) => ({
    i: widget.id,
    type: widget.type,
    config: widget.config ? JSON.parse(JSON.stringify(widget.config)) : undefined,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW,
    minH: widget.layout.minH,
  }))

  const config: DashboardAnalyticsConfig = {}
  for (const widget of widgets) {
    if (widget.type === 'core.productFunnel' && Array.isArray(widget.config?.steps)) {
      const steps = widget.config.steps.filter((step): step is string => typeof step === 'string')
      if (steps.length >= 2) {
        config.funnel = {
          steps,
          groupBy: typeof widget.config.groupBy === 'string' ? widget.config.groupBy : undefined,
        }
      }
    }
    if (widget.type === 'core.retention'
      && typeof widget.config?.cohortEvent === 'string'
      && typeof widget.config.returnEvent === 'string'
      && Array.isArray(widget.config.days)) {
      config.retention = {
        cohortEvent: widget.config.cohortEvent,
        returnEvent: widget.config.returnEvent,
        days: widget.config.days.filter((day): day is number => Number.isInteger(day)),
      }
    }
  }
  dashboardAnalyticsConfig.value = config
  return true
}

const syncAnalyticsConfigFromLayout = () => {
  const next: DashboardAnalyticsConfig = { ...dashboardAnalyticsConfig.value }
  const funnel = dashboardLayout.value.find((item) => resolvedWidgetType(item) === 'core.productFunnel')
  if (!funnel) {
    delete next.funnel
  } else if (Array.isArray(funnel.config?.steps)) {
    next.funnel = {
      steps: funnel.config.steps.filter((step): step is string => typeof step === 'string'),
      groupBy: typeof funnel.config.groupBy === 'string' ? funnel.config.groupBy : undefined,
    }
  }
  const retentionWidget = dashboardLayout.value.find((item) => resolvedWidgetType(item) === 'core.retention')
  if (!retentionWidget) {
    delete next.retention
  } else if (typeof retentionWidget.config?.cohortEvent === 'string'
    && typeof retentionWidget.config.returnEvent === 'string'
    && Array.isArray(retentionWidget.config.days)) {
    next.retention = {
      cohortEvent: retentionWidget.config.cohortEvent,
      returnEvent: retentionWidget.config.returnEvent,
      days: retentionWidget.config.days.filter((day): day is number => Number.isInteger(day)),
    }
  }
  dashboardAnalyticsConfig.value = next
}

let layoutLoadGeneration = 0

const loadLayout = async () => {
  const generation = ++layoutLoadGeneration
  const projectId = filters.projectId
  const space = activeSpace.value
  const spaceDefinition = dashboardSpaces.value.find((item) => item.key === space)
  if (!spaceDefinition) return
  dashboardAnalyticsConfig.value = {}
  if (projectId) {
    try {
      const response = await getProjectDashboards(projectId)
      if (generation !== layoutLoadGeneration
        || filters.projectId !== projectId
        || activeSpace.value !== space) return
      serverDashboards.value = response.data.data
      const dashboard = serverDashboards.value.find(
        (item) => item.dashboardKey === space && item.isActive,
      )
      if (dashboard && applyServerDashboard(dashboard)) return
    } catch (error) {
      if (generation !== layoutLoadGeneration
        || filters.projectId !== projectId
        || activeSpace.value !== space) return
      serverDashboards.value = []
      dashboardLayout.value = []
      ElMessage.error(getErrorMessage(error, t('metrics.dashboardLoadFailed')))
      return
    }
  }
  if (generation !== layoutLoadGeneration
    || filters.projectId !== projectId
    || activeSpace.value !== space) return
  dashboardLayout.value = cloneDashboardLayout(spaceDefinition.defaultLayout)
  syncAnalyticsConfigFromLayout()
}

const widgetTypeFromId = (id: string) => {
  if (id.startsWith('trafficTrends')) return 'core.trafficTrends'
  if (id.startsWith('productFunnel')) return 'core.productFunnel'
  if (id.startsWith('topEvents')) return 'core.topEvents'
  if (id.startsWith('rankings')) return 'core.topPages'
  if (id.startsWith('overview')) return 'core.overview'
  if (id.startsWith('trends')) return 'core.trends'
  if (id.startsWith('retention')) return 'core.retention'
  if (id.startsWith('counters')) return 'core.counters'
  if (id.startsWith('events')) return 'core.events'
  if (id.startsWith('devices')) return 'core.devices'
  if (id.startsWith('sessions')) return 'core.sessions'
  if (id.startsWith('traffic')) return 'core.traffic'
  return null
}

const resolvedWidgetType = (item: DashboardItem) => item.type || widgetTypeFromId(item.i)
const isWidgetType = (item: DashboardItem, type: string) => resolvedWidgetType(item) === type
const emptyExtensionConfig = Object.freeze({}) as DashboardExtensionConfig
type ExtensionWidgetBinding = Readonly<{
  extension: DashboardWidgetExtension
  config: DashboardExtensionConfig
}>
type ExtensionWidgetBindingCache = {
  type: string | null
  space: DashboardSpaceKey
  sourceConfig: unknown
  binding?: ExtensionWidgetBinding
}
const extensionWidgetBindingCache = new WeakMap<DashboardItem, ExtensionWidgetBindingCache>()
const extensionBindingForWidget = (item: DashboardItem): ExtensionWidgetBinding | undefined => {
  const type = resolvedWidgetType(item)
  const sourceConfig = item.config
  const cached = extensionWidgetBindingCache.get(item)
  if (cached?.type === type && cached.space === activeSpace.value
    && cached.sourceConfig === sourceConfig) {
    return cached.binding
  }

  const extension = getDashboardWidgetExtension(type)
  let binding: ExtensionWidgetBinding | undefined
  if (extension?.spaces.includes(activeSpace.value)) {
    const normalizedConfig = sourceConfig === undefined
      ? (extension.configRequired ? null : emptyExtensionConfig)
      : normalizeDashboardExtensionConfig(extension, sourceConfig)
    if (normalizedConfig) {
      binding = {
        extension,
        config: normalizedConfig === emptyExtensionConfig
          ? emptyExtensionConfig
          : readonly(normalizedConfig as object) as DashboardExtensionConfig,
      }
    }
  }
  extensionWidgetBindingCache.set(item, {
    type,
    space: activeSpace.value,
    sourceConfig,
    binding,
  })
  return binding
}
const extensionForWidget = (item: DashboardItem) => extensionBindingForWidget(item)?.extension
const extensionComponent = (item: DashboardItem) =>
  extensionForWidget(item)?.component || 'div'
const extensionDisplayName = (extension: DashboardWidgetExtension) => {
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  for (const key of preferred) {
    const value = extension.displayName[key]
    if (value) return value
  }
  return Object.values(extension.displayName)[0] || extension.type
}
const extensionConfig = (item: DashboardItem): DashboardExtensionConfig =>
  extensionBindingForWidget(item)?.config || emptyExtensionConfig
const updateExtensionWidgetConfig = (item: DashboardItem, config: unknown) => {
  if (!isLayoutEditable.value || !dashboardLayout.value.some((candidate) => candidate === item)) return
  const extension = extensionForWidget(item)
  if (!extension) return
  const cloned = normalizeDashboardExtensionConfig(extension, config)
  if (!cloned) {
    ElMessage.warning(t('metrics.extension.invalidConfig'))
    return
  }
  item.config = cloned
}
const configForWidget = (type: string): Record<string, unknown> =>
  dashboardLayout.value.find((item) => resolvedWidgetType(item) === type)?.config || {}

const getWidgetLabel = (item: DashboardItem) => {
  if (typeof item.config?.title === 'string' && item.config.title.trim()) {
    return item.config.title.trim()
  }
  const type = resolvedWidgetType(item)
  const extension = getDashboardWidgetExtension(type)
  if (extension) return extensionDisplayName(extension)
  return type && widgetLabelKeys[type] ? t(widgetLabelKeys[type]) : item.i
}

const hasCustomWidgetTitle = (item: DashboardItem) =>
  typeof item.config?.title === 'string' && Boolean(item.config.title.trim())

const widgetConfig = (type: string): Record<string, unknown> | undefined => {
  if (type === 'core.productFunnel' && dashboardAnalyticsConfig.value.funnel) {
    return dashboardAnalyticsConfig.value.funnel
  }
  if (type === 'core.retention' && dashboardAnalyticsConfig.value.retention) {
    return dashboardAnalyticsConfig.value.retention
  }
  return undefined
}

const toServerDefinition = (): DashboardDefinition | null => {
  if (dashboardLayout.value.length > 50) return null
  const widgets: DashboardWidgetDefinition[] = []
  const widgetIds = new Set<string>()
  const widgetTypes = new Set<string>()
  for (const item of dashboardLayout.value) {
    const type = resolvedWidgetType(item)
    if (!type || widgetIds.has(item.i) || widgetTypes.has(type)) return null
    const extension = getDashboardWidgetExtension(type)
    if (!widgetLabelKeys[type] && (!extension || !extension.spaces.includes(activeSpace.value))) {
      return null
    }
    let config = item.config ?? widgetConfig(type)
    if (extension) {
      if (config === undefined && extension.configRequired) return null
      if (config !== undefined) {
        const cloned = normalizeDashboardExtensionConfig(extension, config)
        if (!cloned) return null
        config = cloned
      }
    }
    widgetIds.add(item.i)
    widgetTypes.add(type)
    widgets.push({
      id: item.i,
      type,
      layout: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
      },
      config,
    })
  }
  return {
    schemaVersion: 1,
    defaultRange: appliedFilters.value.dateRange ? 'custom' : '7d',
    widgets,
  }
}

const saveServerDashboard = async () => {
  if (!filters.projectId) return false
  const projectId = filters.projectId
  const space = activeSpace.value
  const definition = toServerDefinition()
  if (!definition) {
    ElMessage.error(t('metrics.dashboardUnsupportedWidget'))
    return false
  }
  const existing = serverDashboards.value.find((item) => item.dashboardKey === space)
  const spaceDefinition = activeSpaceDefinition.value
  dashboardSaving.value = true
  try {
    const response = await upsertProjectDashboard(projectId, space, {
      displayName: spaceDefinition.displayName,
      description: spaceDefinition.description,
      schemaVersion: 1,
      definition,
      expectedRevision: existing?.revision ?? 0,
      isDefault: dashboardSpaces.value[0]?.key === space,
      isActive: true,
    })
    if (filters.projectId !== projectId || activeSpace.value !== space) return false
    const saved = response.data.data
    serverDashboards.value = [
      ...serverDashboards.value.filter((item) => item.dashboardKey !== saved.dashboardKey),
      saved,
    ]
    ElMessage.success(t('metrics.dashboardSaved'))
    return true
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('metrics.dashboardSaveFailed')))
    return false
  } finally {
    dashboardSaving.value = false
  }
}

const completeLayoutEditing = async () => {
  if (!await saveServerDashboard()) return
  layoutBeforeEditing.value = null
  isLayoutEditable.value = false
}

// --- 5. Formatting & Computation ---
const numberFormatter = computed(() =>
  new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US')
)
const formatNumber = (value: number) => numberFormatter.value.format(value)

const formatTimestamp = (value: number) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

const formatDuration = (value: number) => {
  if (!value || value <= 0) return '0s'
  const seconds = Math.floor(value / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return '-'
  return `${(value * 100).toFixed(1)}%`
}

const formatJson = (value: Record<string, unknown> | null) => {
  if (!value) return '-'
  try { return JSON.stringify(value) } catch { return '-' }
}

const overviewItems = computed(() => {
  if (!overview.value) return {}
  const base = {
    [t('metrics.overviewItems.devicesTotal')]: formatNumber(overview.value.devicesTotal),
    [t('metrics.overviewItems.devicesActive')]: formatNumber(overview.value.devicesActive),
    [t('metrics.overviewItems.sessionsTotal')]: formatNumber(overview.value.sessionsTotal),
    [t('metrics.overviewItems.avgSessionDuration')]: formatDuration(overview.value.avgSessionDurationMs),
  }

  return base
})

const productFunnelRows = computed(() => {
  return (productFunnel.value?.groups || []).flatMap(group =>
    group.steps.map(step => ({
      groupKey: group.groupValue || 'all',
      step: step.eventType,
      users: step.users,
      conversionRate: step.conversionRate,
      dropOffRate: step.dropOffRate,
    }))
  )
})

// --- 6. Metric Loading Functions ---
const loadOverview = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  overviewLoading.value = true
  try {
    const params = cleanParams({ projectId: context.projectId, ...rangeParams(context.snapshot) })
    const overviewRes = await getMetricsOverview(params)

    if (!isCurrentProjectContext(context)) return
    overview.value = overviewRes.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.overviewFailed')))
  } finally {
    if (isCurrentProjectContext(context)) overviewLoading.value = false
  }
}

const loadTrends = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const configuredGranularity = configForWidget('core.trends').granularity
  const granularity: MetricsGranularity = configuredGranularity === 'hour' || configuredGranularity === 'day'
    ? configuredGranularity
    : context.snapshot.granularity
  trendsLoading.value = true
  try {
    const res = await getMetricsTrends(cleanParams({ projectId: context.projectId, granularity, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    trends.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.trendsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) trendsLoading.value = false
  }
}

const loadTopEvents = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const config = configForWidget('core.topEvents')
  const configuredLimit = typeof config.limit === 'number' ? config.limit : context.snapshot.topEventsLimit
  const aggregation = config.aggregation === 'raw' ? 'raw' as const : 'semantic' as const
  topEventsLoading.value = true
  try {
    const res = await getTopEvents(cleanParams({
      projectId: context.projectId,
      limit: configuredLimit,
      aggregation,
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    topEvents.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.topEventsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) topEventsLoading.value = false
  }
}

const loadSemanticEventCatalog = async (context: ProjectRequestContext = captureProjectContext()) => {
  try {
    const response = await getEventCatalog(context.projectId)
    if (!isCurrentProjectContext(context)) return
    semanticEventCatalog.value = response.data.data.items
  } catch {
    // Semantic labels are an enhancement; raw event keys remain a safe fallback.
    if (isCurrentProjectContext(context)) semanticEventCatalog.value = []
  }
}

const loadEvents = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const config = configForWidget('core.events')
  const pageSize = typeof config.pageSize === 'number' ? config.pageSize : events.pageSize
  const eventType = typeof config.eventType === 'string' ? config.eventType : context.snapshot.eventType
  eventsLoading.value = true
  try {
    const res = await getEvents(cleanParams({ projectId: context.projectId, page: context.snapshot.eventsPage, pageSize, eventType, userId: context.snapshot.userId, deviceId: context.snapshot.deviceId, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(events, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.eventsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) eventsLoading.value = false
  }
}

const loadDevices = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const config = configForWidget('core.devices')
  const pageSize = typeof config.pageSize === 'number' ? config.pageSize : devices.pageSize
  devicesLoading.value = true
  try {
    const res = await getDevices(cleanParams({ projectId: context.projectId, page: context.snapshot.devicesPage, pageSize, deviceId: context.snapshot.deviceId, apiKey: context.snapshot.apiKey, isBanned: context.snapshot.isBanned === '' ? undefined : context.snapshot.isBanned === 'true', ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(devices, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.devicesFailed')))
  } finally {
    if (isCurrentProjectContext(context)) devicesLoading.value = false
  }
}

const loadSessions = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const config = configForWidget('core.sessions')
  const pageSize = typeof config.pageSize === 'number' ? config.pageSize : sessions.pageSize
  sessionsLoading.value = true
  try {
    const res = await getSessions(cleanParams({ projectId: context.projectId, page: context.snapshot.sessionsPage, pageSize, sessionId: context.snapshot.sessionId, userId: context.snapshot.userId, deviceId: context.snapshot.deviceId, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(sessions, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.sessionsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) sessionsLoading.value = false
  }
}

const loadTrafficTrends = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const configuredGranularity = configForWidget('core.trafficTrends').granularity
  const allowedGranularities: TrafficGranularity[] = ['hour', 'day', 'week', 'month', 'year']
  const granularity: TrafficGranularity = typeof configuredGranularity === 'string'
    && allowedGranularities.includes(configuredGranularity as TrafficGranularity)
    ? configuredGranularity as TrafficGranularity
    : context.snapshot.granularity
  trafficTrendsLoading.value = true
  try {
    const res = await getTrafficTrends(cleanParams({ projectId: context.projectId, granularity, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    trafficTrends.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.trafficTrendsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) trafficTrendsLoading.value = false
  }
}

const loadTopPages = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const configuredLimit = configForWidget('core.topPages').limit
  const limit = typeof configuredLimit === 'number' ? configuredLimit : context.snapshot.topEventsLimit
  topPagesLoading.value = true
  try {
    const res = await getTopPages(cleanParams({ projectId: context.projectId, limit, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    topPages.value = res.data.data.items
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.topPagesFailed')))
  } finally {
    if (isCurrentProjectContext(context)) topPagesLoading.value = false
  }
}

const loadTraffic = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const config = configForWidget('core.traffic')
  const pageSize = typeof config.pageSize === 'number' ? config.pageSize : traffic.pageSize
  trafficLoading.value = true
  try {
    const res = await getTrafficMetrics(cleanParams({ projectId: context.projectId, page: context.snapshot.trafficPage, pageSize, userId: context.snapshot.userId, deviceId: context.snapshot.deviceId, sessionId: context.snapshot.sessionId, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(traffic, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.trafficFailed')))
  } finally {
    if (isCurrentProjectContext(context)) trafficLoading.value = false
  }
}

const loadProductFunnel = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const sourceConfig = dashboardAnalyticsConfig.value.funnel
  const config = sourceConfig ? { steps: [...sourceConfig.steps], groupBy: sourceConfig.groupBy } : undefined
  if (!config) {
    productFunnel.value = null
    return
  }
  productFunnelLoading.value = true
  try {
    const res = await getProductFunnel(cleanParams({
      projectId: context.projectId,
      steps: config.steps.join(','),
      groupBy: config.groupBy,
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    productFunnel.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.productFunnelFailed')))
  } finally {
    if (isCurrentProjectContext(context)) productFunnelLoading.value = false
  }
}

const loadRetention = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const sourceConfig = dashboardAnalyticsConfig.value.retention
  const config = sourceConfig ? { ...sourceConfig, days: [...sourceConfig.days] } : undefined
  if (!config) {
    retention.value = null
    return
  }
  retentionLoading.value = true
  try {
    const res = await getProductRetention(cleanParams({
      projectId: context.projectId,
      cohortEvent: config.cohortEvent,
      returnEvent: config.returnEvent,
      days: config.days.join(','),
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    retention.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.retentionFailed')))
  } finally {
    if (isCurrentProjectContext(context)) retentionLoading.value = false
  }
}

// --- 7. Action Handlers ---
const loadSemanticDefinitions = async () => {
  const projectId = filters.projectId
  if (!projectId) return
  try {
    const response = await getSemanticDefinitions(projectId)
    if (filters.projectId === projectId) semanticDefinitions.value = response.data.data.items
  } catch {
    if (filters.projectId === projectId) semanticDefinitions.value = []
  }
}

const resetPages = () => {
  events.page = 1; devices.page = 1; sessions.page = 1; traffic.page = 1
}

const beginTargetedRequestContext = () => {
  metricsRequestGeneration += 1
  clearLoadingStates()
  return captureProjectContext()
}

const handleEventsPageChange = (page: number) => {
  events.page = page
  void loadEvents(beginTargetedRequestContext())
}
const handleDevicesPageChange = (page: number) => {
  devices.page = page
  void loadDevices(beginTargetedRequestContext())
}
const handleSessionsPageChange = (page: number) => {
  sessions.page = page
  void loadSessions(beginTargetedRequestContext())
}
const handleTrafficPageChange = (page: number) => {
  traffic.page = page
  void loadTraffic(beginTargetedRequestContext())
}

const applyFilters = async () => {
  if (!requireProject()) return
  resetPages()
  commitFilterSnapshot()
  await refreshAll()
}

const refreshAll = async () => {
  if (!requireProject()) return
  extensionRefreshToken.value += 1
  const context = beginRefreshContext()
  const widgetTypes = dashboardLayout.value.map((item) => resolvedWidgetType(item))
  refreshing.value = true
  try {
    const loadPromises: Promise<void>[] = []
    if (widgetTypes.some((type) => type === 'core.topEvents' || type === 'core.events')) {
      loadPromises.push(loadSemanticEventCatalog(context))
    }
    if (widgetTypes.some((type) => type === 'core.productFunnel' || type === 'core.retention')) {
      loadPromises.push(loadSemanticDefinitions())
    }
    for (const type of widgetTypes) {
      if (type === 'core.overview') loadPromises.push(loadOverview(context))
      else if (type === 'core.trends') loadPromises.push(loadTrends(context))
      else if (type === 'core.topEvents') loadPromises.push(loadTopEvents(context))
      else if (type === 'core.trafficTrends') loadPromises.push(loadTrafficTrends(context))
      else if (type === 'core.topPages') loadPromises.push(loadTopPages(context))
      else if (type === 'core.productFunnel') loadPromises.push(loadProductFunnel(context))
      else if (type === 'core.retention') loadPromises.push(loadRetention(context))
      else if (type === 'core.traffic') loadPromises.push(loadTraffic(context))
      else if (type === 'core.events') loadPromises.push(loadEvents(context))
      else if (type === 'core.devices') loadPromises.push(loadDevices(context))
      else if (type === 'core.sessions') loadPromises.push(loadSessions(context))
    }
    await Promise.all(loadPromises)
  } finally {
    if (isCurrentProjectContext(context)) refreshing.value = false
  }
}

const chartInstances: Record<string, ECharts> = {}
let resizeObserver: ResizeObserver | null = null

const initChart = (id: string, theme: string = 'light') => {
  const el = document.getElementById(id)
  if (!el) return null
  
  if (chartInstances[id]) {
    chartInstances[id].dispose()
  }

  // Create chart
  const chart = init(el, theme)
  chartInstances[id] = chart

  // Setup ResizeObserver to handle fluid layouts perfectly
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
  }
  resizeObserver.observe(el)
  
  return chart
}

const handleResize = () => {
  // Use requestAnimationFrame for smoother rendering during transitions
  requestAnimationFrame(() => {
    Object.values(chartInstances).forEach(chart => {
      if (chart) chart.resize()
    })
  })
}

const formatTrendAxisLabel = (value: string, granularity: TrafficGranularity) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const displayLocale = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  if (granularity === 'hour') {
    return date.toLocaleString(displayLocale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  if (granularity === 'month') {
    return date.toLocaleDateString(displayLocale, { year: 'numeric', month: '2-digit' })
  }
  if (granularity === 'year') return String(date.getFullYear())
  return date.toLocaleDateString(displayLocale)
}

const updateBusinessTrendsChart = () => {
  const widget = dashboardLayout.value.find(w => isWidgetType(w, 'core.trends'))
  if (!widget) return
  const id = 'chart-business-' + widget.i
  const chart = chartInstances[id] || initChart(id)
  if (!chart || !trends.value) return

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('metrics.chart.events'), t('metrics.chart.sessions')], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trends.value.points.map((point) => formatTrendAxisLabel(point.time, trends.value!.granularity))
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: t('metrics.chart.events'),
        type: 'line',
        smooth: true,
        data: trends.value.points.map(p => p.events),
        color: '#0071e3',
        areaStyle: { opacity: 0.1 }
      },
      {
        name: t('metrics.chart.sessions'),
        type: 'line',
        smooth: true,
        data: trends.value.points.map(p => p.sessions),
        color: '#ff9500',
        areaStyle: { opacity: 0.1 }
      }
    ]
  }
  chart.setOption(option)
}

const updateTrafficTrendsChart = () => {
  const widget = dashboardLayout.value.find(w => isWidgetType(w, 'core.trafficTrends'))
  if (!widget) return
  const id = 'chart-traffic-' + widget.i
  const chart = chartInstances[id] || initChart(id)
  if (!chart || !trafficTrends.value) return

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('metrics.chart.pageViews'), t('metrics.chart.visitors')], bottom: 0 },
    grid: { left: '3%', right: '4%', bottom: '15%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trafficTrends.value.points.map((point) => formatTrendAxisLabel(point.time, trafficTrends.value!.granularity))
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: t('metrics.chart.pageViews'),
        type: 'line',
        smooth: true,
        data: trafficTrends.value.points.map(p => p.pageViews),
        color: '#34c759',
        areaStyle: { opacity: 0.1 }
      },
      {
        name: t('metrics.chart.visitors'),
        type: 'line',
        smooth: true,
        data: trafficTrends.value.points.map(p => p.visitors),
        color: '#5856d6',
        areaStyle: { opacity: 0.1 }
      }
    ]
  }
  chart.setOption(option)
}



const layoutVisible = ref(false)

const clearLoadingStates = () => {
  overviewLoading.value = false
  trendsLoading.value = false
  topEventsLoading.value = false
  eventsLoading.value = false
  devicesLoading.value = false
  sessionsLoading.value = false
  trafficLoading.value = false
  trafficTrendsLoading.value = false
  topPagesLoading.value = false
  productFunnelLoading.value = false
  retentionLoading.value = false
  refreshing.value = false
}

const clearProjectScopedState = () => {
  overview.value = null
  trends.value = null
  topEvents.value = null
  trafficTrends.value = null
  topPages.value = []
  productFunnel.value = null
  retention.value = null
  semanticEventCatalog.value = []
  semanticDefinitions.value = []
  widgetConfigDialogVisible.value = false
  widgetConfigType.value = ''
  widgetConfigTargetId.value = ''
  Object.assign(events, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
  Object.assign(devices, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
  Object.assign(sessions, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
  Object.assign(traffic, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
  clearLoadingStates()
}

// --- 8. Watchers & Lifecycle ---
let workspaceGeneration = 0
let bootstrapping = true

const alignActiveSpaceToTemplate = () => {
  if (dashboardSpaces.value.some((space) => space.key === activeSpace.value)) return false
  activeSpace.value = dashboardSpaces.value[0]!.key
  return true
}

const disposeWorkspaceCharts = () => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  for (const [id, chart] of Object.entries(chartInstances)) {
    chart.dispose()
    delete chartInstances[id]
  }
}

const resetProjectDetailFilters = () => {
  filters.userId = ''
  filters.deviceId = ''
  filters.sessionId = ''
  filters.apiKey = ''
  filters.isBanned = ''
  filters.eventType = ''
}

const activateWorkspace = async (projectChanged: boolean) => {
  const generation = ++workspaceGeneration
  projectContextGeneration += 1
  metricsRequestGeneration += 1
  const projectId = filters.projectId
  const space = activeSpace.value

  layoutVisible.value = false
  isLayoutEditable.value = false
  layoutBeforeEditing.value = null
  dashboardLayout.value = []
  clearLoadingStates()
  disposeWorkspaceCharts()
  if (projectChanged) {
    serverDashboards.value = []
    clearProjectScopedState()
  }

  if (projectId && routeProjectId.value !== projectId) {
    await router.replace(projectRoute(projectId, 'dashboard'))
  }
  if (generation !== workspaceGeneration
    || projectId !== filters.projectId
    || space !== activeSpace.value) return

  await nextTick()
  await loadLayout()
  if (generation !== workspaceGeneration
    || projectId !== filters.projectId
    || space !== activeSpace.value) return

  resetPages()
  commitFilterSnapshot()
  layoutVisible.value = true
  await nextTick()
  if (projectId) await refreshAll()
  if (generation !== workspaceGeneration
    || projectId !== filters.projectId
    || space !== activeSpace.value) return

  handleResize()
  updateBusinessTrendsChart()
  updateTrafficTrendsChart()
}

watch(activeSpace, () => {
  if (!bootstrapping) void activateWorkspace(false)
})

watch(() => filters.projectId, () => {
  if (bootstrapping) return
  projectContext.selectProject(filters.projectId)
  resetProjectDetailFilters()
  if (alignActiveSpaceToTemplate()) return
  void activateWorkspace(true)
})

watch(selectedProjectId, (projectId) => {
  if (!bootstrapping && projectId && projectId !== filters.projectId) {
    filters.projectId = projectId
  }
})

watch(routeProjectId, (projectId) => {
  if (bootstrapping || !projectId || projectId === filters.projectId) return
  if (projects.value.some((project) => project.projectId === projectId)) {
    filters.projectId = projectId
  }
})

watch(trends, () => nextTick(updateBusinessTrendsChart))
watch(trafficTrends, () => nextTick(updateTrafficTrendsChart))

watch(isLayoutEditable, (val) => {
  if (!val) {
    nextTick(handleResize)
  }
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  try {
    await projectContext.ensureLoaded(routeProjectId.value)
    filters.projectId = selectedProjectId.value
    alignActiveSpaceToTemplate()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
  // Let the project watcher consume the bootstrapping change before enabling it.
  // This keeps the initial page load to one workspace activation and one request batch.
  await nextTick()
  bootstrapping = false
  await activateWorkspace(true)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeWorkspaceCharts()
})
</script>

<style scoped>
.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  color: #1d1d1f;
}

.widget-size-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.widget-size-fields :deep(.el-input-number) { width: 100%; }

.workspace-area {
  width: 100%;
  min-height: calc(100vh - 300px);
  padding: 10px;
  background: transparent;
  border-radius: 12px;
  border: 1px solid transparent;
  display: block;
  box-sizing: border-box;
}
.workspace-area.is-editing {
  background: #f5f5f7;
  border-color: rgba(0, 0, 0, 0.1);
}

.dashboard-grid {
  transition: all 0.3s ease;
}

.grid-item-card {
  background: white;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.3s ease;
}

.grid-item-card.is-editing {
  overflow: visible !important;
  border-color: #0071e3;
  box-shadow: 0 0 0 1px rgba(0, 113, 227, 0.14), 0 4px 16px rgba(0, 0, 0, 0.08);
  z-index: 100;
}

:deep(.vue-resizable-handle) {
  z-index: 1000 !important;
  opacity: 0;
  transition: opacity 0.2s;
}

.grid-item-card.is-editing :deep(.vue-resizable-handle) {
  opacity: 1;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid rgba(0, 113, 227, 0.45);
  border-radius: 7px;
  background:
    linear-gradient(135deg, transparent 44%, #0071e3 45%, #0071e3 52%, transparent 53%) 5px 5px / 12px 12px no-repeat,
    linear-gradient(135deg, transparent 44%, #0071e3 45%, #0071e3 52%, transparent 53%) 9px 9px / 9px 9px no-repeat,
    #ffffff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.18);
  bottom: -7px;
  right: -7px;
  cursor: nwse-resize;
}


.widget-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header-bar {
  min-height: 34px;
  box-sizing: border-box;
  background: #f5f5f7;
  padding: 5px 9px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
}

.widget-drag-handle {
  align-self: stretch;
  min-width: 24px;
  justify-content: center;
  cursor: grab;
  color: #6e6e73;
  display: flex;
  align-items: center;
}
.widget-drag-handle:active { cursor: grabbing; }

.widget-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #1d1d1f;
}

.widget-resize-hint {
  color: #86868b;
  font-size: 11px;
  white-space: nowrap;
}

.widget-inner {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: white;
  display: flex;
  flex-direction: column;
}

.widget-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.widget-header {
  min-height: 32px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

/* Scrollbar for widgets */
.widget-inner::-webkit-scrollbar {
  width: 4px;
}
.widget-inner::-webkit-scrollbar-thumb {
  background: #e4e7ed;
  border-radius: 2px;
}

.echart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  /* Ensure it has a base size for ECharts to bite onto */
  display: block;
}

.widget-footer-mini {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

/* Overview Widget Styling */
.overview-grid-compact {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 4px;
}

.overview-mini-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s;
}

.overview-mini-card:hover {
  background: #e6e8eb;
  transform: translateY(-2px);
}

.mini-label {
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.mini-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
</style>
