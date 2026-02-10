<template>
  <div class="admin-container">
    <div class="header-card">
      <div class="header-main">
        <div class="header-main-left">
          <div>
            <h1 class="header-title">{{ t('metrics.title') }}</h1>
            <p class="header-subtitle">{{ t('metrics.subtitle') }}</p>
          </div>
          
        </div>
        <div class="header-actions">
          <div class="custom-segmented-control">
            <div 
              class="segment-item" 
              :class="{ 'is-active': activeSpace === 'operations' }"
              @click="activeSpace = 'operations'"
            >
              {{ t('metrics.spaces.operations') }}
            </div>
            <div 
              class="segment-item" 
              :class="{ 'is-active': activeSpace === 'technical' }"
              @click="activeSpace = 'technical'"
            >
              {{ t('metrics.spaces.technical') }}
            </div>
          </div>
          <div class="divider-vertical"></div>
          <LanguageToggle />
          
          <el-tooltip :content="t('metrics.resetLayout')" placement="top">
            <el-button @click="resetToDefaultLayout" circle plain>
              <el-icon><Brush /></el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip :content="t('buttons.refresh')" placement="top">
            <el-button type="primary" :loading="refreshing" @click="refreshAll" circle plain>
              <el-icon><Refresh /></el-icon>
            </el-button>
          </el-tooltip>

          <el-tooltip :content="t('buttons.edit')" placement="top">
            <el-button @click="isLayoutEditable = !isLayoutEditable" :type="isLayoutEditable ? 'warning' : 'default'" circle plain>
              <el-icon><Setting /></el-icon>
            </el-button>
          </el-tooltip>
        </div>
      </div>
      
      <div class="filter-bar-compact">
        <el-form :model="filters" inline class="compact-form">
          <el-select v-model="filters.projectId" :placeholder="t('filters.selectProject')" filterable style="width: 160px">
            <el-option
              v-for="project in projects"
              :key="project.id"
              :label="project.projectName"
              :value="project.projectId"
            />
          </el-select>
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            unlink-panels
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
          <el-select v-model="filters.granularity" style="width: 100px" v-if="activeSpace === 'operations'">
            <el-option :label="t('filters.daily')" value="day" />
            <el-option :label="t('filters.hourly')" value="hour" />
          </el-select>
          
          <template v-if="activeSpace === 'technical'">
             <el-input v-model="filters.userId" :placeholder="t('filters.userId')" clearable style="width: 120px" />
             <el-input v-model="filters.deviceId" :placeholder="t('filters.deviceId')" clearable style="width: 120px" />
             <el-select v-model="filters.platform" style="width: 100px">
                <el-option :label="t('filters.platformWeb')" value="web" />
                <el-option :label="t('filters.platformApp')" value="app" />
             </el-select>
          </template>
        </el-form>
      </div>
    </div>

      <div class="workspace-area">
        <grid-layout
          v-if="layoutVisible && dashboardLayout.length > 0"
          :key="activeSpace"
          v-model:layout="dashboardLayout"
          :col-num="12"
          :row-height="30"
          :is-draggable="isLayoutEditable"
          :is-resizable="isLayoutEditable"
          :vertical-compact="true"
          :use-css-transforms="true"
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
                 <span class="widget-label">{{ getWidgetLabel(item.i) }}</span>
                 <el-button size="small" link type="danger" @click="removeWidget(item.i)">
                   <el-icon><Close /></el-icon>
                 </el-button>
              </div>

              <!-- Widget Content Overlay -->
              <div class="widget-inner">
                <!-- Overview Widget -->
                <div v-if="item.i.startsWith('overview')" class="widget-content" v-loading="overviewLoading">
                  <div v-if="overview" class="overview-grid-compact">
                    <div v-for="(val, label) in overviewItems" :key="label" class="overview-mini-card">
                       <p class="mini-label">{{ label }}</p>
                       <p class="mini-value">{{ val }}</p>
                    </div>
                  </div>
                  <el-empty v-else description="No Data" :image-size="60" />
                </div>

                <!-- Trends Widget -->
                <div v-else-if="item.i.startsWith('trends')" class="widget-content" v-loading="trendsLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.trends') }}</span>
                   </div>
                   <div v-if="trends && trends.points.length" class="trend-chart-full">
                      <div class="chart-legend">
                        <span class="legend-dot events"></span> {{ t('metrics.chart.events') }}
                        <span class="legend-dot sessions"></span> {{ t('metrics.chart.sessions') }}
                      </div>
                      <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="trend-svg">
                        <path :d="trendPath('events')" class="trend-line events" />
                        <path :d="trendPath('sessions')" class="trend-line sessions" />
                      </svg>
                   </div>
                </div>

                <!-- Top Events Widget -->
                <div v-else-if="item.i.startsWith('topEvents')" class="widget-content" v-loading="topEventsLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.topEvents') }}</span>
                   </div>
                   <el-table :data="topEvents?.items || []" size="small" style="width: 100%">
                      <el-table-column prop="eventType" :label="t('tables.eventType')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
                   </el-table>
                </div>

                <!-- Traffic Trends Widget -->
                <div v-else-if="item.i.startsWith('trafficTrends')" class="widget-content" v-loading="trafficTrendsLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.chart.pageViews') }} / {{ t('metrics.chart.visitors') }}</span>
                   </div>
                   <div v-if="trafficTrends && trafficTrends.points.length" class="trend-chart-full">
                      <div class="chart-legend">
                        <span class="legend-dot events"></span> {{ t('metrics.chart.pageViews') }}
                        <span class="legend-dot sessions"></span> {{ t('metrics.chart.visitors') }}
                      </div>
                      <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="trend-svg">
                        <path :d="trendPath('pageViews')" class="trend-line events" />
                        <path :d="trendPath('visitors')" class="trend-line sessions" />
                      </svg>
                   </div>
                </div>
                
                <!-- Rankings Widget -->
                 <div v-else-if="item.i.startsWith('rankings')" class="widget-content">
                   <div class="widget-header">
                      <span>{{ t('metrics.topPages') }}</span>
                   </div>
                   <el-table :data="topPages" size="small" style="width: 100%">
                      <el-table-column prop="pagePath" :label="t('tables.page')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
                   </el-table>
                </div>

                <!-- Counters Widget -->
                <div v-else-if="item.i.startsWith('counters')" class="widget-content" v-loading="countersLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.counters') }}</span>
                   </div>
                   <el-table :data="counters" size="small" style="width: 100%">
                      <el-table-column prop="key" :label="t('tables.key')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="value" :label="t('tables.value')" min-width="120" />
                      <el-table-column :label="t('buttons.actions')" min-width="120">
                        <template #default="{ row }">
                          <el-button-group>
                            <el-button size="small" type="primary" link icon="Plus" @click="handleIncrementCounter(row)" />
                            <el-button size="small" type="success" link icon="Edit" @click="showEditCounterDialog(row)" />
                          </el-button-group>
                        </template>
                      </el-table-column>
                   </el-table>
                </div>

                <!-- Traffic Table Widget -->
                <div v-else-if="item.i.startsWith('traffic')" class="widget-content" v-loading="trafficLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.traffic') }}</span>
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
                        small
                        layout="prev, pager, next"
                        :total="traffic.total"
                        :page-size="traffic.pageSize"
                        :current-page="traffic.page"
                        @current-change="handleTrafficPageChange"
                      />
                   </div>
                </div>

                <!-- Events Table Widget -->
                <div v-else-if="item.i.startsWith('events')" class="widget-content" v-loading="eventsLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.events') }}</span>
                   </div>
                   <el-table :data="events.items" size="small" style="width: 100%">
                      <el-table-column prop="eventType" :label="t('tables.eventType')" min-width="120" show-overflow-tooltip />
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
                        small
                        layout="prev, pager, next"
                        :total="events.total"
                        :page-size="events.pageSize"
                        :current-page="events.page"
                        @current-change="handleEventsPageChange"
                      />
                   </div>
                </div>

                <!-- Devices Table Widget -->
                <div v-else-if="item.i.startsWith('devices')" class="widget-content" v-loading="devicesLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.devices') }}</span>
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
                        small
                        layout="prev, pager, next"
                        :total="devices.total"
                        :page-size="devices.pageSize"
                        :current-page="devices.page"
                        @current-change="handleDevicesPageChange"
                      />
                   </div>
                </div>

                <!-- Sessions Table Widget -->
                <div v-else-if="item.i.startsWith('sessions')" class="widget-content" v-loading="sessionsLoading">
                   <div class="widget-header">
                      <span>{{ t('metrics.sessions') }}</span>
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
                        small
                        layout="prev, pager, next"
                        :total="sessions.total"
                        :page-size="sessions.pageSize"
                        :current-page="sessions.page"
                        @current-change="handleSessionsPageChange"
                      />
                   </div>
                </div>
              </div>
            </div>
          </grid-item>
        </grid-layout>
      </div>

    <!-- Counter Edit Dialog -->
    <el-dialog v-model="counterDialogVisible" :title="t('metrics.counters')" width="400px">
      <el-form :model="counterForm" label-position="top">
        <el-form-item :label="t('tables.key')">
          <el-input v-model="counterForm.key" disabled />
        </el-form-item>
        <el-form-item :label="t('tables.value')">
          <el-input-number v-model="counterForm.value" style="width: 100%" />
        </el-form-item>
        <el-form-item :label="t('tables.isPublic')">
          <el-switch v-model="counterForm.isPublic" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="counterDialogVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" @click="handleSaveCounter">{{ t('buttons.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useI18n } from '@/i18n'
import { GridLayout, GridItem } from 'vue3-grid-layout-next'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { getProjects, type Project } from '@/api/admin'
import {
  Brush,
  Refresh,
  Setting,
  Close,
  Rank,
} from '@element-plus/icons-vue'
import {
  getDevices,
  getEvents,
  getMetricsOverview,
  getMetricsTrends,
  getSessions,
  getTopEvents,
  getTrafficMetrics,
  getTrafficSummary,
  getTrafficTrends,
  getTopPages,
  getTopReferrers,
  incrementCounter,
  setCounter,
  type MetricsOverview,
  type MetricsTopEvents,
  type MetricsTrends,
  type PagedResult,
  type DeviceRecord,
  type EventRecord,
  type SessionRecord,
  type TrafficMetricRecord,
  type TrafficSummary,
  type CounterItem,
  type TrafficTrends,
  type TopPageItem,
  type TopReferrerItem,
  getCounters,
} from '@/api/metrics'

// --- 1. Types & Interfaces ---
type ErrorPayload = {
  error?: { message?: string }
  message?: string
}

interface DashboardItem {
  x: number;
  y: number;
  w: number;
  h: number;
  i: string;
  minW?: number;
  minH?: number;
}

// --- 2. State & Basic Setup ---
const route = useRoute()
const { t, locale } = useI18n()

const routeProjectId = computed(() => {
  const value = route.query.projectId
  return typeof value === 'string' ? value : ''
})

const projects = ref<Project[]>([])
const refreshing = ref(false)
const isLayoutEditable = ref(false)
const activeSpace = ref<'operations' | 'technical'>('operations')
const dashboardLayout = ref<DashboardItem[]>([])

// Filters & Params
const filters = reactive({
  projectId: import.meta.env.VITE_DEFAULT_PROJECT_ID || '',
  dateRange: null as string[] | null,
  granularity: 'day' as 'day' | 'hour',
  topEventsLimit: 10,
  eventType: '',
  userId: '',
  deviceId: '',
  sessionId: '',
  apiKey: '',
  isBanned: '',
  metricType: '',
  platform: 'web' as 'web' | 'app',
})

// Metrics Data Collections
const overview = ref<MetricsOverview | null>(null)
const trends = ref<MetricsTrends | null>(null)
const topEvents = ref<MetricsTopEvents | null>(null)
const trafficTrends = ref<TrafficTrends | null>(null)
const topPages = ref<TopPageItem[]>([])
const topReferrers = ref<TopReferrerItem[]>([])
const trafficSummary = ref<TrafficSummary | null>(null)
const counters = ref<CounterItem[]>([])

// Paged Results
const events = reactive<PagedResult<EventRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
const devices = reactive<PagedResult<DeviceRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
const sessions = reactive<PagedResult<SessionRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })
const traffic = reactive<PagedResult<TrafficMetricRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 50, total: 0, items: [] })

// Dialogs & Form
const counterDialogVisible = ref(false)
const counterForm = reactive({ key: '', value: 0, isPublic: true })

// Loading States
const countersLoading = ref(false)
const overviewLoading = ref(false)
const trendsLoading = ref(false)
const topEventsLoading = ref(false)
const eventsLoading = ref(false)
const devicesLoading = ref(false)
const sessionsLoading = ref(false)
const trafficLoading = ref(false)
const trafficTrendsLoading = ref(false)
const topPagesLoading = ref(false)
const topReferrersLoading = ref(false)

// --- 3. Utility Functions ---
const getErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: ErrorPayload } }
  return e.response?.data?.error?.message || fallback
}

const cleanParams = <T extends Record<string, unknown>>(params: T): T => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  ) as T
}

const rangeParams = () => {
  if (Array.isArray(filters.dateRange) && filters.dateRange.length === 2) {
    return { from: filters.dateRange[0], to: filters.dateRange[1] }
  }
  return {}
}

const requireProject = () => {
  if (!filters.projectId) {
    ElMessage.warning(t('errors.selectProject'))
    return false
  }
  return true
}
// --- 4. Layout Management ---
const defaultLayouts: Record<'operations' | 'technical', DashboardItem[]> = {
  operations: [
    { x: 0, y: 0, w: 12, h: 4, i: 'overview_default' , minW: 6, minH: 3 },
    { x: 0, y: 4, w: 8, h: 10, i: 'trends_default' , minW: 4, minH: 6 },
    { x: 8, y: 4, w: 4, h: 10, i: 'topEvents_default' , minW: 3, minH: 6 },
    { x: 0, y: 14, w: 6, h: 10, i: 'trafficTrends_default' , minW: 4, minH: 6 },
    { x: 6, y: 14, w: 6, h: 10, i: 'rankings_default' , minW: 4, minH: 6 },
    { x: 0, y: 24, w: 12, h: 8, i: 'counters_default' , minW: 4, minH: 4 },
  ],
  technical: [
    { x: 0, y: 0, w: 6, h: 12, i: 'events_default', minW: 4, minH: 8 },
    { x: 6, y: 0, w: 6, h: 12, i: 'traffic_default', minW: 4, minH: 8 },
    { x: 0, y: 12, w: 6, h: 10, i: 'devices_default', minW: 4, minH: 6 },
    { x: 6, y: 12, w: 6, h: 10, i: 'sessions_default', minW: 4, minH: 6 },
  ],
}

const getWidgetLabel = (id: string) => {
  const type = id.split('_')[0]
  if (type === 'trafficTrends') return t('metrics.chart.pageViews')
  if (type === 'rankings') return t('metrics.topPages')
  return t(`metrics.${type}`)
}

const removeWidget = (id: string) => {
  dashboardLayout.value = dashboardLayout.value.filter(item => item.i !== id)
}

const resetToDefaultLayout = () => {
  dashboardLayout.value = JSON.parse(JSON.stringify(defaultLayouts[activeSpace.value]))
  saveLayout()
}

const saveLayout = () => {
  if (!activeSpace.value || dashboardLayout.value.length === 0) return
  localStorage.setItem(`dashboard_layout_${activeSpace.value}`, JSON.stringify(dashboardLayout.value))
}

const loadLayout = () => {
  const saved = localStorage.getItem(`dashboard_layout_${activeSpace.value}`)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      if (Array.isArray(parsed) && parsed.length > 0) {
        dashboardLayout.value = parsed
      } else {
        dashboardLayout.value = JSON.parse(JSON.stringify(defaultLayouts[activeSpace.value]))
      }
    } catch {
      dashboardLayout.value = JSON.parse(JSON.stringify(defaultLayouts[activeSpace.value]))
    }
  } else {
    dashboardLayout.value = JSON.parse(JSON.stringify(defaultLayouts[activeSpace.value]))
  }
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

  // Add traffic PV/UV if available (usually for Website platform)
  if (trafficSummary.value) {
    return {
      ...base,
      [t('metrics.chart.pageViews')]: formatNumber(trafficSummary.value.pageViews),
      [t('metrics.chart.visitors')]: formatNumber(trafficSummary.value.visitors),
    }
  }

  return base
})

// --- 6. Metric Loading Functions ---
const loadOverview = async () => {
  if (!requireProject()) return
  overviewLoading.value = true
  try {
    const params = cleanParams({ projectId: filters.projectId, ...rangeParams() })
    const [overviewRes, trafficRes] = await Promise.all([
      getMetricsOverview(params),
      filters.platform === 'web' 
        ? getTrafficSummary({ ...params, granularity: filters.granularity }) 
        : Promise.resolve(null)
    ])
    
    overview.value = overviewRes.data.data
    if (trafficRes && 'data' in trafficRes) {
      trafficSummary.value = trafficRes.data.data
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.overviewFailed')))
  } finally {
    overviewLoading.value = false
  }
}

const loadTrends = async () => {
  if (!requireProject()) return
  trendsLoading.value = true
  try {
    const res = await getMetricsTrends(cleanParams({ projectId: filters.projectId, granularity: filters.granularity, ...rangeParams() }))
    trends.value = res.data.data
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.trendsFailed')))
  } finally {
    trendsLoading.value = false
  }
}

const loadTopEvents = async () => {
  if (!requireProject()) return
  topEventsLoading.value = true
  try {
    const res = await getTopEvents(cleanParams({ projectId: filters.projectId, limit: filters.topEventsLimit, ...rangeParams() }))
    topEvents.value = res.data.data
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.topEventsFailed')))
  } finally {
    topEventsLoading.value = false
  }
}

const loadEvents = async () => {
  if (!requireProject()) return
  eventsLoading.value = true
  try {
    const res = await getEvents(cleanParams({ projectId: filters.projectId, page: events.page, pageSize: events.pageSize, eventType: filters.eventType, userId: filters.userId, deviceId: filters.deviceId, ...rangeParams() }))
    Object.assign(events, res.data.data)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.eventsFailed')))
  } finally {
    eventsLoading.value = false
  }
}

const loadDevices = async () => {
  if (!requireProject()) return
  devicesLoading.value = true
  try {
    const res = await getDevices(cleanParams({ projectId: filters.projectId, page: devices.page, pageSize: devices.pageSize, deviceId: filters.deviceId, apiKey: filters.apiKey, isBanned: filters.isBanned === '' ? undefined : filters.isBanned === 'true', ...rangeParams() }))
    Object.assign(devices, res.data.data)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.devicesFailed')))
  } finally {
    devicesLoading.value = false
  }
}

const loadSessions = async () => {
  if (!requireProject()) return
  sessionsLoading.value = true
  try {
    const res = await getSessions(cleanParams({ projectId: filters.projectId, page: sessions.page, pageSize: sessions.pageSize, sessionId: filters.sessionId, userId: filters.userId, deviceId: filters.deviceId, ...rangeParams() }))
    Object.assign(sessions, res.data.data)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.sessionsFailed')))
  } finally {
    sessionsLoading.value = false
  }
}

const loadTrafficTrends = async () => {
  if (!requireProject()) return
  trafficTrendsLoading.value = true
  try {
    const res = await getTrafficTrends(cleanParams({ projectId: filters.projectId, granularity: filters.granularity, ...rangeParams() }))
    trafficTrends.value = res.data.data
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.trafficTrendsFailed')))
  } finally {
    trafficTrendsLoading.value = false
  }
}

const loadTopPages = async () => {
  if (!requireProject()) return
  topPagesLoading.value = true
  try {
    const res = await getTopPages(cleanParams({ projectId: filters.projectId, limit: filters.topEventsLimit, ...rangeParams() }))
    topPages.value = res.data.data
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.topPagesFailed')))
  } finally {
    topPagesLoading.value = false
  }
}

const loadTopReferrers = async () => {
  if (!requireProject()) return
  topReferrersLoading.value = true
  try {
    const res = await getTopReferrers(cleanParams({ projectId: filters.projectId, limit: filters.topEventsLimit, ...rangeParams() }))
    topReferrers.value = res.data.data
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.topReferrersFailed')))
  } finally {
    topReferrersLoading.value = false
  }
}

const loadTraffic = async () => {
  if (!requireProject()) return
  trafficLoading.value = true
  try {
    if (filters.platform === 'web') {
      const summaryRes = await getTrafficSummary(cleanParams({ 
        projectId: filters.projectId, 
        granularity: filters.granularity,
        ...rangeParams() 
      }))
      trafficSummary.value = summaryRes.data.data
      await Promise.all([loadTrafficTrends(), loadTopPages(), loadTopReferrers()])
    } else {
      trafficSummary.value = null; trafficTrends.value = null; topPages.value = []; topReferrers.value = []
    }
    const res = await getTrafficMetrics(cleanParams({ projectId: filters.projectId, page: traffic.page, pageSize: traffic.pageSize, metricType: filters.metricType, userId: filters.userId, deviceId: filters.deviceId, sessionId: filters.sessionId, ...rangeParams() }))
    Object.assign(traffic, res.data.data)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.trafficFailed')))
  } finally {
    trafficLoading.value = false
  }
}

const loadCounters = async () => {
  if (!requireProject()) return
  countersLoading.value = true
  try {
    const res = await getCounters({ projectId: filters.projectId })
    counters.value = res.data.data.items
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.countersFailed')))
  } finally {
    countersLoading.value = false
  }
}

// --- 7. Action Handlers ---
const handleIncrementCounter = async (row: CounterItem) => {
  try {
    await incrementCounter(row.key, { projectId: filters.projectId })
    ElMessage.success(t('buttons.increment') + ' ' + t('messages.initSuccess'))
    await loadCounters()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.networkFailed')))
  }
}

const showEditCounterDialog = (row: CounterItem) => {
  counterForm.key = row.key
  counterForm.value = row.value
  counterForm.isPublic = row.isPublic
  counterDialogVisible.value = true
}

const handleSaveCounter = async () => {
  try {
    await setCounter(counterForm.key, { projectId: filters.projectId, value: counterForm.value, isPublic: counterForm.isPublic })
    ElMessage.success(t('messages.projectUpdated'))
    counterDialogVisible.value = false
    await loadCounters()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.saveProjectFailed')))
  }
}

const resetPages = () => {
  events.page = 1; devices.page = 1; sessions.page = 1; traffic.page = 1
}

const handleEventsPageChange = (page: number) => { events.page = page; loadEvents() }
const handleDevicesPageChange = (page: number) => { devices.page = page; loadDevices() }
const handleSessionsPageChange = (page: number) => { sessions.page = page; loadSessions() }
const handleTrafficPageChange = (page: number) => { traffic.page = page; loadTraffic() }

const refreshAll = async () => {
  if (!requireProject()) return
  refreshing.value = true
  try {
    resetPages()
    const loadPromises: Promise<void>[] = []
    for (const item of dashboardLayout.value) {
      if (item.i.startsWith('overview')) loadPromises.push(loadOverview())
      else if (item.i.startsWith('trends')) loadPromises.push(loadTrends())
      else if (item.i.startsWith('topEvents')) loadPromises.push(loadTopEvents())
      else if (item.i.startsWith('trafficTrends')) loadPromises.push(loadTrafficTrends())
      else if (item.i.startsWith('rankings')) loadPromises.push(loadTopPages())
      else if (item.i.startsWith('counters')) loadPromises.push(loadCounters())
      else if (item.i.startsWith('traffic')) loadPromises.push(loadTraffic())
      else if (item.i.startsWith('events')) loadPromises.push(loadEvents())
      else if (item.i.startsWith('devices')) loadPromises.push(loadDevices())
      else if (item.i.startsWith('sessions')) loadPromises.push(loadSessions())
    }
    await Promise.all(loadPromises)
  } finally {
    refreshing.value = false
  }
}

const trendPath = (type: 'events' | 'sessions' | 'pageViews' | 'visitors') => {
  const data = (type === 'pageViews' || type === 'visitors') ? trafficTrends.value : trends.value
  if (!data || data.points.length < 2) return ''
  const values = data.points.map((p) => {
    if (type === 'events' && 'events' in p) return p.events
    if (type === 'sessions' && 'sessions' in p) return p.sessions
    if (type === 'pageViews' && 'pageViews' in p) return p.pageViews
    if (type === 'visitors' && 'visitors' in p) return p.visitors
    return 0
  })
  const max = Math.max(...values) || 1
  const width = 100, height = 40
  const points = values.map((val, i) => {
    const x = (i / (values.length - 1)) * width
    const y = height - (val / max) * height
    return `${x},${y}`
  })
  return `M ${points.join(' L ')}`
}

const loadProjects = async () => {
  try {
    const res = await getProjects()
    projects.value = res.data.data
    const firstProject = projects.value[0]
    if (routeProjectId.value) filters.projectId = routeProjectId.value
    else if (!filters.projectId && firstProject) filters.projectId = firstProject.projectId
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
}

const layoutVisible = ref(false)

// --- 8. Watchers & Lifecycle ---
watch(activeSpace, async () => {
  layoutVisible.value = false // 1. 强制销毁组件
  isLayoutEditable.value = false
  dashboardLayout.value = []
  
  await nextTick()
  // 增加微小延迟，确保 DOM 容器宽度计算完成，防止布局挤死在左侧
  setTimeout(async () => {
    loadLayout()
    if (filters.projectId) await refreshAll()
    layoutVisible.value = true // 2. 数据准备好后再挂载
  }, 50)
})

watch(() => filters.projectId, async () => {
  resetPages()
  await refreshAll()
})

watch(() => filters.platform, async () => {
  if (filters.platform === 'web') {
    if (!filters.metricType) filters.metricType = 'page_view'
  } else {
    if (!filters.metricType) filters.metricType = 'screen_view'
  }
  traffic.page = 1
  await loadTraffic()
})

watch(dashboardLayout, saveLayout, { deep: true })

onMounted(() => {
  // 使用延迟初始化，避开首帧容器宽度为 0 的问题
  setTimeout(async () => {
    loadLayout()
    await loadProjects()
    if (filters.projectId) await refreshAll()
    layoutVisible.value = true
  }, 100)
})
</script>

<style scoped>
.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 40px 20px;
  color: #1d1d1f;
}

.header-card {
  background: white;
  border-radius: 18px;
  padding: 24px;
  margin-bottom: 24px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.02);
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.filter-bar-compact {
  display: flex;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #f5f5f7;
}

.compact-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 12px;
}

.workspace-area {
  width: 100%;
  min-height: calc(100vh - 300px);
  padding: 10px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 1px dashed #dcdfe6;
  display: block;
  box-sizing: border-box;
}

.dashboard-grid {
  transition: all 0.3s ease;
}

.grid-item-card {
  background: white;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.3s ease;
}

.grid-item-card.is-editing {
  overflow: visible !important;
  border: 1px solid #409eff;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.15);
  z-index: 100;
}

:deep(.vue-resizable-handle) {
  z-index: 1000 !important;
  opacity: 0;
  transition: opacity 0.2s;
}

.grid-item-card.is-editing :deep(.vue-resizable-handle) {
  opacity: 1;
  background-color: #409eff;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  bottom: 0px;
  right: 0px;
  cursor: nwse-resize;
}


.widget-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header-bar {
  background: #f5f7fa;
  padding: 6px 12px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
}

.widget-drag-handle {
  cursor: move;
  color: #909399;
  display: flex;
  align-items: center;
}

.widget-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #606266;
}

.widget-inner {
  flex: 1;
  overflow: auto;
  padding: 16px;
  background: white;
}

/* Scrollbar for widgets */
.widget-inner::-webkit-scrollbar {
  width: 4px;
}
.widget-inner::-webkit-scrollbar-thumb {
  background: #e4e7ed;
  border-radius: 2px;
}

.header-main-left {
  flex: 1;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-segmented-control {
  display: flex;
  background: #f1f1f1;
  padding: 3px;
  border-radius: 10px;
  user-select: none;
}

.segment-item {
  padding: 6px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #636366;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: center;
  min-width: 80px;
}

.segment-item:hover:not(.is-active) {
  color: #1d1d1f;
  background: rgba(0, 0, 0, 0.05);
}

.segment-item.is-active {
  background: #ffffff;
  color: #0071e3;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}

.divider-vertical {
  width: 1px;
  height: 20px;
  background: #e4e7ed;
  margin: 0 4px;
}

.widget-footer-mini {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.trend-svg {
  width: 100%;
  height: 100px;
  background: #f5f5f7;
  border-radius: 12px;
  margin-top: 10px;
}

.trend-line {
  fill: none;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-line.events {
  stroke: #0071e3;
}

.trend-line.sessions {
  stroke: #ff9500;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-size: 12px;
  margin-bottom: 8px;
}

.legend-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 4px;
}

.legend-dot.events {
  background-color: #0071e3;
}

.legend-dot.sessions {
  background-color: #ff9500;
}

@media (max-width: 960px) {
  .header-main {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
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
