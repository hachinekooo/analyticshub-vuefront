<template>
  <div class="admin-container">
    <div class="header-card">
      <div>
        <h1 class="header-title">{{ t('metrics.title') }}</h1>
        <p class="header-subtitle">{{ t('metrics.subtitle') }}</p>
      </div>
      <div class="header-actions">
        <el-button-group class="nav-group">
          <el-button :type="isProjectsRoute ? 'primary' : 'default'" @click="goProjects">
            <el-icon class="el-icon--left"><FolderOpened /></el-icon>
            {{ t('nav.projects') }}
          </el-button>
          <el-button :type="isMetricsRoute ? 'primary' : 'default'" @click="goMetrics">
            <el-icon class="el-icon--left"><TrendCharts /></el-icon>
            {{ t('nav.metrics') }}
          </el-button>
        </el-button-group>
        <LanguageToggle />
        <el-button type="primary" :loading="refreshing" @click="refreshAll">
          <el-icon class="el-icon--left"><Refresh /></el-icon>
          {{ t('buttons.refresh') }}
        </el-button>
      </div>
    </div>

    <div class="content-card">
      <el-form :model="filters" label-position="top" class="filter-form">
        <el-row :gutter="16">
          <el-col :span="6">
            <el-form-item :label="t('filters.project')">
              <el-select v-model="filters.projectId" :placeholder="t('filters.selectProject')" filterable clearable>
                <el-option
                  v-for="project in projects"
                  :key="project.id"
                  :label="`${project.projectName} (${project.projectId})`"
                  :value="project.projectId"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item :label="t('filters.dateRange')">
              <el-date-picker
                v-model="filters.dateRange"
                type="daterange"
                :range-separator="t('filters.rangeSeparator')"
                :start-placeholder="t('filters.startDate')"
                :end-placeholder="t('filters.endDate')"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                unlink-panels
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('filters.granularity')" v-if="activeTab === 'trends'">
              <el-select v-model="filters.granularity">
                <el-option :label="t('filters.daily')" value="day" />
                <el-option :label="t('filters.hourly')" value="hour" />
              </el-select>
            </el-form-item>
            <el-form-item :label="t('filters.topLimit')" v-else-if="activeTab === 'topEvents'">
              <el-input-number v-model="filters.topEventsLimit" :min="1" :max="50" style="width: 100%" />
            </el-form-item>
            <el-form-item :label="t('filters.eventType')" v-else-if="activeTab === 'events'">
              <el-input v-model="filters.eventType" :placeholder="t('filters.placeholders.eventType')" clearable />
            </el-form-item>
            <el-form-item :label="t('filters.deviceId')" v-else-if="activeTab === 'devices'">
              <el-input v-model="filters.deviceId" :placeholder="t('filters.placeholders.deviceId')" clearable />
            </el-form-item>
            <el-form-item :label="t('filters.sessionId')" v-else-if="activeTab === 'sessions'">
              <el-input v-model="filters.sessionId" :placeholder="t('filters.placeholders.sessionId')" clearable />
            </el-form-item>
            <el-form-item :label="t('filters.metricType')" v-else-if="activeTab === 'traffic'">
              <el-input v-model="filters.metricType" :placeholder="t('filters.placeholders.metricType')" clearable />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="16" v-if="activeTab === 'events' || activeTab === 'devices' || activeTab === 'sessions' || activeTab === 'traffic'">
          <el-col :span="6" v-if="activeTab !== 'devices'">
            <el-form-item :label="t('filters.userId')">
              <el-input v-model="filters.userId" :placeholder="t('filters.placeholders.userId')" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6" v-if="activeTab === 'events' || activeTab === 'sessions' || activeTab === 'traffic'">
            <el-form-item :label="t('filters.deviceId')">
              <el-input v-model="filters.deviceId" :placeholder="t('filters.placeholders.deviceId')" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6" v-if="activeTab === 'traffic'">
            <el-form-item :label="t('filters.sessionId')">
              <el-input v-model="filters.sessionId" :placeholder="t('filters.placeholders.sessionId')" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6" v-if="activeTab === 'devices'">
            <el-form-item :label="t('filters.apiKey')">
              <el-input v-model="filters.apiKey" :placeholder="t('filters.placeholders.apiKey')" clearable />
            </el-form-item>
          </el-col>
          <el-col :span="6" v-if="activeTab === 'devices'">
            <el-form-item :label="t('filters.banStatus')">
              <el-select v-model="filters.isBanned" clearable>
                <el-option :label="t('status.banned')" value="true" />
                <el-option :label="t('status.normal')" value="false" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </div>

    <el-tabs v-model="activeTab" class="metrics-tabs">
      <el-tab-pane :label="t('metrics.overview')" name="overview">
        <div class="content-card" v-loading="overviewLoading">
          <div v-if="overview" class="overview-grid">
            <div class="overview-item">
              <p>{{ t('metrics.overviewItems.devicesTotal') }}</p>
              <h3>{{ formatNumber(overview.devicesTotal) }}</h3>
            </div>
            <div class="overview-item">
              <p>{{ t('metrics.overviewItems.devicesActive') }}</p>
              <h3>{{ formatNumber(overview.devicesActive) }}</h3>
            </div>
            <div class="overview-item">
              <p>{{ t('metrics.overviewItems.usersActive') }}</p>
              <h3>{{ formatNumber(overview.usersActive) }}</h3>
            </div>
            <div class="overview-item">
              <p>{{ t('metrics.overviewItems.sessionsTotal') }}</p>
              <h3>{{ formatNumber(overview.sessionsTotal) }}</h3>
            </div>
            <div class="overview-item">
              <p>{{ t('metrics.overviewItems.eventsTotal') }}</p>
              <h3>{{ formatNumber(overview.eventsTotal) }}</h3>
            </div>
            <div class="overview-item">
              <p>{{ t('metrics.overviewItems.avgSessionDuration') }}</p>
              <h3>{{ formatDuration(overview.avgSessionDurationMs) }}</h3>
            </div>
            <div class="overview-item">
              <p>{{ t('metrics.overviewItems.avgEventsPerSession') }}</p>
              <h3>{{ overview.avgEventsPerSession.toFixed(2) }}</h3>
            </div>
          </div>
          <div v-else class="empty-state">{{ t('metrics.overviewEmpty') }}</div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('metrics.trends')" name="trends">
        <div class="content-card" v-loading="trendsLoading">
          <div v-if="trends && trends.points.length" class="trend-chart">
            <div class="chart-legend">
              <span class="legend-dot events"></span> {{ t('metrics.chart.events') }}
              <span class="legend-dot sessions"></span> {{ t('metrics.chart.sessions') }}
            </div>
            <svg viewBox="0 0 100 40" preserveAspectRatio="none" class="trend-svg">
              <path :d="trendPath('events')" class="trend-line events" />
              <path :d="trendPath('sessions')" class="trend-line sessions" />
            </svg>
            <div class="chart-meta">
              <span>
                {{ t('metrics.chart.range') }}: {{ formatDate(trends.rangeStart) }} - {{ formatDate(trends.rangeEnd) }}
              </span>
              <span>
                {{ t('metrics.chart.granularity') }}:
                {{ trends.granularity === 'day' ? t('filters.daily') : t('filters.hourly') }}
              </span>
            </div>
          </div>
          <div v-else class="empty-state">{{ t('metrics.noTrendData') }}</div>

          <el-table
            v-if="trends && trends.points.length"
            :data="trends.points"
            style="width: 100%"
            class="table-space"
          >
            <el-table-column prop="time" :label="t('tables.time')" min-width="160">
              <template #default="{ row }">{{ formatDateTime(row.time) }}</template>
            </el-table-column>
            <el-table-column prop="events" :label="t('tables.events')" min-width="120" />
            <el-table-column prop="sessions" :label="t('tables.sessions')" min-width="120" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('metrics.topEvents')" name="topEvents">
        <div class="content-card" v-loading="topEventsLoading">
          <el-table :data="topEvents?.items || []" style="width: 100%">
            <el-table-column prop="eventType" :label="t('tables.eventType')" min-width="180" />
            <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
          </el-table>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('metrics.events')" name="events">
        <div class="content-card" v-loading="eventsLoading">
          <el-table :data="events.items" style="width: 100%">
            <el-table-column prop="eventType" :label="t('tables.eventType')" min-width="160" />
            <el-table-column prop="eventTimestamp" :label="t('tables.eventTime')" min-width="180">
              <template #default="{ row }">{{ formatTimestamp(row.eventTimestamp) }}</template>
            </el-table-column>
            <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="220" show-overflow-tooltip />
            <el-table-column prop="userId" :label="t('tables.userId')" min-width="120" show-overflow-tooltip />
            <el-table-column prop="sessionId" :label="t('tables.sessionId')" min-width="220" show-overflow-tooltip />
            <el-table-column prop="properties" :label="t('tables.properties')" min-width="220">
              <template #default="{ row }">
                <span class="mono">{{ formatJson(row.properties) }}</span>
              </template>
            </el-table-column>
          </el-table>
          <div class="table-footer">
            <el-pagination
              background
              layout="prev, pager, next, sizes, total"
              :total="events.total"
              :page-size="events.pageSize"
              :current-page="events.page"
              :page-sizes="[20, 50, 100, 200]"
              @current-change="handleEventsPageChange"
              @size-change="handleEventsSizeChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('metrics.devices')" name="devices">
        <div class="content-card" v-loading="devicesLoading">
          <el-table :data="devices.items" style="width: 100%">
            <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="220" show-overflow-tooltip />
            <el-table-column prop="deviceModel" :label="t('tables.model')" min-width="140" />
            <el-table-column prop="osVersion" :label="t('tables.osVersion')" min-width="120" />
            <el-table-column prop="appVersion" :label="t('tables.appVersion')" min-width="120" />
            <el-table-column prop="isBanned" :label="t('tables.status')" min-width="100">
              <template #default="{ row }">
                <el-tag :type="row.isBanned ? 'danger' : 'success'">
                  {{ row.isBanned ? t('status.banned') : t('status.normal') }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="lastActiveAt" :label="t('tables.lastActive')" min-width="180">
              <template #default="{ row }">{{ formatDateTime(row.lastActiveAt) }}</template>
            </el-table-column>
          </el-table>
          <div class="table-footer">
            <el-pagination
              background
              layout="prev, pager, next, sizes, total"
              :total="devices.total"
              :page-size="devices.pageSize"
              :current-page="devices.page"
              :page-sizes="[20, 50, 100, 200]"
              @current-change="handleDevicesPageChange"
              @size-change="handleDevicesSizeChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('metrics.sessions')" name="sessions">
        <div class="content-card" v-loading="sessionsLoading">
          <el-table :data="sessions.items" style="width: 100%">
            <el-table-column prop="sessionId" :label="t('tables.sessionId')" min-width="220" show-overflow-tooltip />
            <el-table-column prop="userId" :label="t('tables.userId')" min-width="120" show-overflow-tooltip />
            <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="220" show-overflow-tooltip />
            <el-table-column prop="sessionStartTime" :label="t('tables.startTime')" min-width="180">
              <template #default="{ row }">{{ formatDateTime(row.sessionStartTime) }}</template>
            </el-table-column>
            <el-table-column prop="sessionDurationMs" :label="t('tables.duration')" min-width="120">
              <template #default="{ row }">{{ formatDuration(row.sessionDurationMs) }}</template>
            </el-table-column>
            <el-table-column prop="eventCount" :label="t('tables.events')" min-width="100" />
          </el-table>
          <div class="table-footer">
            <el-pagination
              background
              layout="prev, pager, next, sizes, total"
              :total="sessions.total"
              :page-size="sessions.pageSize"
              :current-page="sessions.page"
              :page-sizes="[20, 50, 100, 200]"
              @current-change="handleSessionsPageChange"
              @size-change="handleSessionsSizeChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane :label="t('metrics.traffic')" name="traffic">
        <div class="content-card" v-loading="trafficLoading">
          <el-table :data="traffic.items" style="width: 100%">
            <el-table-column prop="metricType" :label="t('tables.metricType')" min-width="160" />
            <el-table-column prop="pagePath" :label="t('tables.page')" min-width="160" show-overflow-tooltip />
            <el-table-column prop="referrer" :label="t('tables.referrer')" min-width="120" show-overflow-tooltip />
            <el-table-column prop="metricTimestamp" :label="t('tables.eventTime')" min-width="180">
              <template #default="{ row }">{{ formatTimestamp(row.metricTimestamp) }}</template>
            </el-table-column>
            <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="220" show-overflow-tooltip />
            <el-table-column prop="userId" :label="t('tables.userId')" min-width="120" show-overflow-tooltip />
            <el-table-column prop="sessionId" :label="t('tables.sessionId')" min-width="220" show-overflow-tooltip />
          </el-table>
          <div class="table-footer">
            <el-pagination
              background
              layout="prev, pager, next, sizes, total"
              :total="traffic.total"
              :page-size="traffic.pageSize"
              :current-page="traffic.page"
              :page-sizes="[20, 50, 100, 200]"
              @current-change="handleTrafficPageChange"
              @size-change="handleTrafficSizeChange"
            />
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { useI18n } from '@/i18n'
import { getProjects, type Project } from '@/api/admin'
import {
  getDevices,
  getEvents,
  getMetricsOverview,
  getMetricsTrends,
  getSessions,
  getTopEvents,
  getTrafficMetrics,
  type MetricsOverview,
  type MetricsTopEvents,
  type MetricsTrends,
  type PagedResult,
  type DeviceRecord,
  type EventRecord,
  type SessionRecord,
  type TrafficMetricRecord,
} from '@/api/metrics'

type ErrorPayload = {
  error?: { message?: string }
  message?: string
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: ErrorPayload } }
  return e.response?.data?.error?.message || fallback
}

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()

const isProjectsRoute = computed(() => route.path === '/')
const isMetricsRoute = computed(() => route.path === '/metrics')

const goProjects = () => router.push('/')
const goMetrics = () => router.push('/metrics')

const routeProjectId = computed(() => {
  const value = route.query.projectId
  return typeof value === 'string' ? value : ''
})

const projects = ref<Project[]>([])
const activeTab = ref('overview')
const refreshing = ref(false)

const filters = reactive({
  projectId: '',
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
})

const overview = ref<MetricsOverview | null>(null)
const trends = ref<MetricsTrends | null>(null)
const topEvents = ref<MetricsTopEvents | null>(null)

const events = reactive<PagedResult<EventRecord>>({
  projectId: '',
  rangeStart: '',
  rangeEnd: '',
  page: 1,
  pageSize: 50,
  total: 0,
  items: [],
})

const devices = reactive<PagedResult<DeviceRecord>>({
  projectId: '',
  rangeStart: '',
  rangeEnd: '',
  page: 1,
  pageSize: 50,
  total: 0,
  items: [],
})

const sessions = reactive<PagedResult<SessionRecord>>({
  projectId: '',
  rangeStart: '',
  rangeEnd: '',
  page: 1,
  pageSize: 50,
  total: 0,
  items: [],
})

const traffic = reactive<PagedResult<TrafficMetricRecord>>({
  projectId: '',
  rangeStart: '',
  rangeEnd: '',
  page: 1,
  pageSize: 50,
  total: 0,
  items: [],
})

const overviewLoading = ref(false)
const trendsLoading = ref(false)
const topEventsLoading = ref(false)
const eventsLoading = ref(false)
const devicesLoading = ref(false)
const sessionsLoading = ref(false)
const trafficLoading = ref(false)

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

const loadOverview = async () => {
  if (!requireProject()) return
  overviewLoading.value = true
  try {
    const res = await getMetricsOverview(cleanParams({ projectId: filters.projectId, ...rangeParams() }))
    overview.value = res.data.data
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
    const res = await getMetricsTrends(
      cleanParams({
        projectId: filters.projectId,
        granularity: filters.granularity,
        ...rangeParams(),
      })
    )
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
    const res = await getTopEvents(
      cleanParams({
        projectId: filters.projectId,
        limit: filters.topEventsLimit,
        ...rangeParams(),
      })
    )
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
    const res = await getEvents(
      cleanParams({
        projectId: filters.projectId,
        page: events.page,
        pageSize: events.pageSize,
        eventType: filters.eventType,
        userId: filters.userId,
        deviceId: filters.deviceId,
        ...rangeParams(),
      })
    )
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
    const res = await getDevices(
      cleanParams({
        projectId: filters.projectId,
        page: devices.page,
        pageSize: devices.pageSize,
        deviceId: filters.deviceId,
        apiKey: filters.apiKey,
        isBanned: filters.isBanned === '' ? undefined : filters.isBanned === 'true',
        ...rangeParams(),
      })
    )
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
    const res = await getSessions(
      cleanParams({
        projectId: filters.projectId,
        page: sessions.page,
        pageSize: sessions.pageSize,
        sessionId: filters.sessionId,
        userId: filters.userId,
        deviceId: filters.deviceId,
        ...rangeParams(),
      })
    )
    Object.assign(sessions, res.data.data)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.sessionsFailed')))
  } finally {
    sessionsLoading.value = false
  }
}

const loadTraffic = async () => {
  if (!requireProject()) return
  trafficLoading.value = true
  try {
    const res = await getTrafficMetrics(
      cleanParams({
        projectId: filters.projectId,
        page: traffic.page,
        pageSize: traffic.pageSize,
        metricType: filters.metricType,
        userId: filters.userId,
        deviceId: filters.deviceId,
        sessionId: filters.sessionId,
        ...rangeParams(),
      })
    )
    Object.assign(traffic, res.data.data)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('errors.trafficFailed')))
  } finally {
    trafficLoading.value = false
  }
}

const refreshAll = async () => {
  if (!requireProject()) return
  refreshing.value = true
  try {
    resetPages()
    await Promise.all([loadOverview(), loadTrends(), loadTopEvents()])
    await loadActiveTab()
  } finally {
    refreshing.value = false
  }
}

const loadActiveTab = async () => {
  if (activeTab.value === 'events') {
    await loadEvents()
  } else if (activeTab.value === 'devices') {
    await loadDevices()
  } else if (activeTab.value === 'sessions') {
    await loadSessions()
  } else if (activeTab.value === 'traffic') {
    await loadTraffic()
  }
}

const resetPages = () => {
  events.page = 1
  devices.page = 1
  sessions.page = 1
  traffic.page = 1
}

watch(activeTab, async () => {
  if (!filters.projectId) return
  await loadActiveTab()
})

watch(
  routeProjectId,
  (value) => {
    if (value && value !== filters.projectId) {
      filters.projectId = value
    }
  },
  { immediate: true }
)

watch(
  () => filters.projectId,
  async () => {
    resetPages()
    await refreshAll()
  }
)

const handleEventsPageChange = (page: number) => {
  events.page = page
  loadEvents()
}

const handleEventsSizeChange = (size: number) => {
  events.pageSize = size
  events.page = 1
  loadEvents()
}

const handleDevicesPageChange = (page: number) => {
  devices.page = page
  loadDevices()
}

const handleDevicesSizeChange = (size: number) => {
  devices.pageSize = size
  devices.page = 1
  loadDevices()
}

const handleSessionsPageChange = (page: number) => {
  sessions.page = page
  loadSessions()
}

const handleSessionsSizeChange = (size: number) => {
  sessions.pageSize = size
  sessions.page = 1
  loadSessions()
}

const handleTrafficPageChange = (page: number) => {
  traffic.page = page
  loadTraffic()
}

const handleTrafficSizeChange = (size: number) => {
  traffic.pageSize = size
  traffic.page = 1
  loadTraffic()
}

const numberFormatter = computed(() =>
  new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US')
)
const formatNumber = (value: number) => numberFormatter.value.format(value)

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString()
}

const formatTimestamp = (value: number) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

const formatDuration = (value: number) => {
  if (!value || value <= 0) return '0s'
  const seconds = Math.floor(value / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

const formatJson = (value: Record<string, unknown> | null) => {
  if (!value) return '-'
  try {
    return JSON.stringify(value)
  } catch {
    return '-'
  }
}

const trendPath = (key: 'events' | 'sessions') => {
  if (!trends.value?.points?.length) return ''
  const values = trends.value.points.map((point) => point[key])
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = max - min || 1
  const step = values.length > 1 ? 100 / (values.length - 1) : 0
  return values
    .map((value, index) => {
      const x = index * step
      const y = 40 - ((value - min) / range) * 40
      return `${index === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
}

const loadProjects = async () => {
  try {
    const res = await getProjects()
    projects.value = res.data.data
    const firstProject = projects.value[0]
    if (routeProjectId.value) {
      filters.projectId = routeProjectId.value
    } else if (!filters.projectId && firstProject) {
      filters.projectId = firstProject.projectId
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
}

onMounted(() => {
  loadProjects()
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
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 18px;
  padding: 32px;
  margin-bottom: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.04);
  gap: 24px;
}

.header-title {
  font-size: 32px;
  font-weight: 700;
  color: #1d1d1f;
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}

.header-subtitle {
  color: #86868b;
  font-size: 14px;
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.content-card {
  background: white;
  border-radius: 24px;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.04);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
}

.metrics-tabs :deep(.el-tabs__header) {
  margin: 0 0 12px;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.overview-item {
  background: #f5f5f7;
  border-radius: 16px;
  padding: 18px;
}

.overview-item p {
  margin: 0 0 6px;
  color: #86868b;
  font-size: 13px;
}

.overview-item h3 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.trend-chart {
  margin-bottom: 16px;
}

.chart-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  color: #86868b;
  margin-bottom: 8px;
}

.legend-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 6px;
}

.legend-dot.events {
  background: #0071e3;
}

.legend-dot.sessions {
  background: #34c759;
}

.trend-svg {
  width: 100%;
  height: 160px;
  background: #f5f5f7;
  border-radius: 16px;
}

.trend-line {
  fill: none;
  stroke-width: 2;
}

.trend-line.events {
  stroke: #0071e3;
}

.trend-line.sessions {
  stroke: #34c759;
}

.chart-meta {
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  color: #86868b;
  font-size: 12px;
}

.table-space {
  margin-top: 16px;
}

.table-footer {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.mono {
  font-family: "SFMono-Regular", Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
}

.empty-state {
  text-align: center;
  color: #86868b;
  padding: 24px 0;
}

@media (max-width: 960px) {
  .header-card {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
