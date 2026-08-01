<template>
  <div class="admin-container">
    <div class="header-card">
      <div>
        <h1 class="header-title">{{ t('privacy.title') }}</h1>
        <p class="header-subtitle">{{ t('privacy.subtitle') }}</p>
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
          <el-button :type="isSemanticRoute ? 'primary' : 'default'" @click="goSemantics">
            <el-icon class="el-icon--left"><CollectionTag /></el-icon>
            {{ t('nav.semantics') }}
          </el-button>
          <el-button type="primary">
            <el-icon class="el-icon--left"><Tickets /></el-icon>
            {{ t('nav.privacyRequests') }}
          </el-button>
        </el-button-group>
        <LanguageToggle />
        <el-tooltip :content="t('buttons.refresh')" placement="top">
          <el-button :aria-label="t('buttons.refresh')" type="primary" :loading="loading" circle plain @click="loadRequests">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="content-card">
      <div class="filter-bar">
        <el-form :model="filters" inline class="filter-form">
          <el-select
            v-model="filters.projectId"
            :placeholder="t('filters.selectProject')"
            filterable
            style="width: 180px"
            @change="handleProjectChange"
          >
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
          <el-select v-model="filters.status" clearable :placeholder="t('privacy.filters.status')" style="width: 150px">
            <el-option v-for="status in privacyStatuses" :key="status" :label="statusLabel(status)" :value="status" />
          </el-select>
          <el-switch
            v-model="filters.openOnly"
            :disabled="Boolean(filters.status)"
            :active-text="t('privacy.filters.openOnly')"
          />
          <el-select v-model="filters.requestType" clearable :placeholder="t('privacy.filters.type')" style="width: 130px">
            <el-option label="EXPORT" value="EXPORT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
          <el-select v-model="filters.processor" clearable :placeholder="t('privacy.filters.processor')" style="width: 150px">
            <el-option label="ANALYTICSHUB" value="ANALYTICSHUB" />
            <el-option label="POSTHOG" value="POSTHOG" />
          </el-select>
          <el-input v-model="filters.userId" clearable :placeholder="t('filters.userId')" style="width: 180px" />
          <el-button type="primary" :loading="loading" @click="applyFilters">
            <el-icon class="el-icon--left"><Search /></el-icon>
            {{ t('buttons.refresh') }}
          </el-button>
        </el-form>
      </div>

      <el-table :data="requests.items" v-loading="loading" size="small" class="request-table">
        <el-table-column prop="requestId" :label="t('privacy.tables.requestId')" min-width="210" show-overflow-tooltip />
        <el-table-column prop="requestType" :label="t('privacy.tables.type')" min-width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.requestType === 'DELETE' ? 'danger' : 'primary'" effect="light">
              {{ row.requestType }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="processor" :label="t('privacy.tables.processor')" min-width="130" />
        <el-table-column prop="status" :label="t('tables.status')" min-width="130">
          <template #default="{ row }">
            <el-tag size="small" :type="statusTagType(row.status)" effect="light">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contactEmail" :label="t('privacy.tables.email')" min-width="180" show-overflow-tooltip />
        <el-table-column prop="userId" :label="t('tables.userId')" min-width="150" show-overflow-tooltip />
        <el-table-column prop="requestedAt" :label="t('privacy.tables.requestedAt')" min-width="170">
          <template #default="{ row }">{{ formatDateTime(row.requestedAt) }}</template>
        </el-table-column>
        <el-table-column prop="operator" :label="t('privacy.tables.operator')" min-width="120" show-overflow-tooltip />
        <el-table-column :label="t('buttons.actions')" fixed="right" min-width="280">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openDetail(row)">
              {{ t('privacy.actions.detail') }}
            </el-button>
            <el-button
              v-if="isExecutable(row)"
              size="small"
              link
              :type="row.requestType === 'DELETE' ? 'danger' : 'success'"
              @click="openExecution(row)"
            >
              {{ row.requestType === 'DELETE'
                ? t('privacy.actions.anonymize')
                : t('privacy.actions.export') }}
            </el-button>
            <el-button
              size="small"
              link
              type="success"
              :disabled="isFinalStatus(row.status)"
              @click="openUpdate(row)"
            >
              {{ t('privacy.actions.process') }}
            </el-button>
            <el-button size="small" link type="warning" @click="openNotify(row)">
              {{ t('privacy.actions.notify') }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          layout="total, sizes, prev, pager, next"
          :total="requests.total"
          :page-size="filters.pageSize"
          :current-page="filters.page"
          :page-sizes="[20, 50, 100]"
          @size-change="handlePageSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <el-drawer v-model="detailVisible" :title="t('privacy.detailTitle')" size="620px">
      <div v-loading="detailLoading" class="detail-body">
      <template v-if="selectedDetail">
        <el-descriptions :column="1" border>
          <el-descriptions-item :label="t('privacy.tables.requestId')">{{ selectedDetail.requestId }}</el-descriptions-item>
          <el-descriptions-item :label="t('privacy.tables.type')">{{ selectedDetail.requestType }}</el-descriptions-item>
          <el-descriptions-item :label="t('privacy.tables.processor')">{{ selectedDetail.processor }}</el-descriptions-item>
          <el-descriptions-item :label="t('tables.status')">{{ statusLabel(selectedDetail.status) }}</el-descriptions-item>
          <el-descriptions-item :label="t('privacy.tables.email')">{{ selectedDetail.contactEmail }}</el-descriptions-item>
          <el-descriptions-item :label="t('tables.userId')">{{ selectedDetail.userId }}</el-descriptions-item>
          <el-descriptions-item :label="t('tables.deviceId')">{{ selectedDetail.deviceId }}</el-descriptions-item>
          <el-descriptions-item :label="t('privacy.fields.source')">{{ selectedDetail.source }}</el-descriptions-item>
          <el-descriptions-item :label="t('privacy.fields.note')">{{ selectedDetail.requesterNote || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('privacy.tables.operator')">{{ selectedDetail.operator || '-' }}</el-descriptions-item>
          <el-descriptions-item :label="t('privacy.fields.operatorNote')">{{ selectedDetail.operatorNote || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h3 class="detail-section-title">{{ t('privacy.fields.metadata') }}</h3>
        <pre class="json-block">{{ formatJsonBlock(selectedDetail.metadata) }}</pre>

        <h3 class="detail-section-title">{{ t('privacy.fields.resultPayload') }}</h3>
        <pre class="json-block">{{ formatJsonBlock(selectedDetail.resultPayload) }}</pre>

        <h3 class="detail-section-title">{{ t('privacy.fields.activities') }}</h3>
        <el-timeline v-if="activities.length">
          <el-timeline-item
            v-for="activity in activities"
            :key="activity.activityId"
            :timestamp="formatDateTime(activity.createdAt)"
            placement="top"
          >
            <div class="activity-title">{{ activityLabel(activity.activityType) }}</div>
            <div v-if="activity.fromStatus || activity.toStatus" class="activity-meta">
              {{ activity.fromStatus || '-' }} → {{ activity.toStatus || '-' }}
            </div>
            <div v-if="activity.actor" class="activity-meta">
              {{ t('privacy.tables.operator') }}: {{ activity.actor }}
            </div>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-else :description="t('privacy.fields.noActivities')" :image-size="64" />
      </template>
      </div>
    </el-drawer>

    <el-dialog v-model="updateVisible" :title="t('privacy.processTitle')" width="560px">
      <el-form :model="updateForm" label-position="top">
        <el-form-item :label="t('privacy.filters.status')">
          <el-select v-model="updateForm.status" style="width: 100%">
            <el-option v-for="status in allowedTargetStatuses" :key="status" :label="statusLabel(status)" :value="status" />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('privacy.tables.operator')">
          <el-input v-model="updateForm.operator" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item :label="t('privacy.fields.operatorNote')">
          <el-input v-model="updateForm.operatorNote" type="textarea" :rows="3" maxlength="4000" show-word-limit />
        </el-form-item>
        <el-form-item :label="t('privacy.fields.resultPayload')">
          <el-input v-model="resultPayloadText" type="textarea" :rows="5" :placeholder="t('privacy.placeholders.resultPayload')" />
        </el-form-item>
        <el-form-item>
          <el-switch v-model="updateForm.notifyUser" :active-text="t('privacy.actions.notifyUser')" />
        </el-form-item>
        <el-form-item v-if="updateForm.notifyUser" :label="t('privacy.fields.notificationMessage')">
          <el-input v-model="updateForm.notificationMessage" type="textarea" :rows="3" maxlength="4000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="updateVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" :loading="updating" @click="submitUpdate">{{ t('buttons.save') }}</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="executionVisible" :title="executionDialogTitle" width="600px" destroy-on-close>
      <template v-if="selectedRequest">
        <el-alert
          :title="executionAlertTitle"
          :description="executionAlertDescription"
          :type="selectedRequest.requestType === 'DELETE' ? 'warning' : 'info'"
          show-icon
          :closable="false"
          class="execution-alert"
        />
        <el-descriptions :column="1" border class="execution-subject">
          <el-descriptions-item :label="t('privacy.tables.requestId')">
            {{ selectedRequest.requestId }}
          </el-descriptions-item>
          <el-descriptions-item :label="t('tables.userId')">{{ selectedRequest.userId }}</el-descriptions-item>
          <el-descriptions-item :label="t('tables.deviceId')">{{ selectedRequest.deviceId }}</el-descriptions-item>
        </el-descriptions>
        <el-form :model="executionForm" label-position="top">
          <el-form-item :label="t('privacy.tables.operator')" required>
            <el-input v-model="executionForm.operator" maxlength="64" show-word-limit />
          </el-form-item>
          <el-form-item
            v-if="selectedRequest.requestType === 'DELETE'"
            :label="t('privacy.execution.confirmationLabel')"
            required
          >
            <el-input
              v-model="executionForm.confirmation"
              :placeholder="selectedRequest.requestId"
              autocomplete="off"
            />
          </el-form-item>
        </el-form>
      </template>
      <template #footer>
        <el-button @click="executionVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button
          :type="selectedRequest?.requestType === 'DELETE' ? 'danger' : 'primary'"
          :loading="executing"
          @click="submitExecution"
        >
          {{ selectedRequest?.requestType === 'DELETE'
            ? t('privacy.actions.confirmAnonymize')
            : t('privacy.actions.confirmExport') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="notifyVisible" :title="t('privacy.notifyTitle')" width="520px">
      <el-form :model="notifyForm" label-position="top">
        <el-form-item :label="t('privacy.fields.subject')">
          <el-input v-model="notifyForm.subject" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item :label="t('privacy.fields.message')">
          <el-input v-model="notifyForm.message" type="textarea" :rows="5" maxlength="4000" show-word-limit />
        </el-form-item>
        <el-form-item :label="t('privacy.tables.operator')">
          <el-input v-model="notifyForm.operator" maxlength="64" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="notifyVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" :loading="notifying" @click="submitNotify">{{ t('privacy.actions.send') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { useI18n } from '@/i18n'
import { getApiErrorMessage as getErrorMessage } from '@/utils/apiError'
import { resolveProjectSelection } from '@/utils/projectSelection'
import { getProjects, type Project } from '@/api/admin'
import {
  getPrivacyRequestDetail,
  getPrivacyRequestActivities,
  getPrivacyRequests,
  executePrivacyRequest,
  notifyPrivacyRequestUser,
  updatePrivacyRequest,
  type PrivacyProcessor,
  type PrivacyRequestDetail,
  type PrivacyRequestItem,
  type PrivacyRequestListParams,
  type PrivacyRequestsResponse,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
  type WorkOrderActivity,
} from '@/api/privacy'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const isProjectsRoute = computed(() => route.path === '/')
const isMetricsRoute = computed(() => route.path === '/metrics')
const isSemanticRoute = computed(() => route.path === '/semantics')

const goProjects = () => router.push('/')
const goMetrics = () => router.push({ path: '/metrics', query: filters.projectId ? { projectId: filters.projectId } : {} })
const goSemantics = () => router.push({ path: '/semantics', query: filters.projectId ? { projectId: filters.projectId } : {} })

const privacyStatuses: PrivacyRequestStatus[] = ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']
const projects = ref<Project[]>([])
const loading = ref(false)
const updating = ref(false)
const notifying = ref(false)
const executing = ref(false)
const selectedRequest = ref<PrivacyRequestItem | null>(null)
const selectedProjectId = ref('')
const selectedDetail = ref<PrivacyRequestDetail | null>(null)
const activities = ref<WorkOrderActivity[]>([])
const detailVisible = ref(false)
const detailLoading = ref(false)
const updateVisible = ref(false)
const notifyVisible = ref(false)
const executionVisible = ref(false)
const resultPayloadText = ref('')
let requestGeneration = 0

const requests = reactive<PrivacyRequestsResponse>({
  projectId: '',
  rangeStart: '',
  rangeEnd: '',
  page: 1,
  pageSize: 20,
  total: 0,
  items: [],
})

const filters = reactive({
  projectId: '',
  dateRange: null as string[] | null,
  page: 1,
  pageSize: 20,
  status: '' as '' | PrivacyRequestStatus,
  requestType: '' as '' | PrivacyRequestType,
  processor: '' as '' | PrivacyProcessor,
  userId: '',
  openOnly: true,
})

const updateForm = reactive({
  status: 'IN_PROGRESS' as PrivacyRequestStatus,
  operator: '',
  operatorNote: '',
  notifyUser: false,
  notificationMessage: '',
})

const notifyForm = reactive({
  subject: '',
  message: '',
  operator: '',
})

const executionForm = reactive({
  operator: '',
  confirmation: '',
})

const isFinalStatus = (status: PrivacyRequestStatus) =>
  status === 'COMPLETED' || status === 'REJECTED' || status === 'CANCELLED'

const isExecutable = (request: PrivacyRequestItem) =>
  request.processor === 'ANALYTICSHUB' && !isFinalStatus(request.status)

const allowedTargetStatuses = computed<PrivacyRequestStatus[]>(() => {
  const current = selectedRequest.value?.status
  const requiresDataExecution = selectedRequest.value?.processor === 'ANALYTICSHUB'
  if (current === 'SUBMITTED') {
    return requiresDataExecution
      ? ['IN_PROGRESS', 'REJECTED', 'CANCELLED']
      : ['IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']
  }
  if (current === 'IN_PROGRESS') {
    return requiresDataExecution
      ? ['REJECTED', 'CANCELLED']
      : ['COMPLETED', 'REJECTED', 'CANCELLED']
  }
  return current ? [current] : []
})

const executionDialogTitle = computed(() => selectedRequest.value?.requestType === 'DELETE'
  ? t('privacy.execution.anonymizeTitle')
  : t('privacy.execution.exportTitle'))

const executionAlertTitle = computed(() => selectedRequest.value?.requestType === 'DELETE'
  ? t('privacy.execution.anonymizeAlertTitle')
  : t('privacy.execution.exportAlertTitle'))

const executionAlertDescription = computed(() => selectedRequest.value?.requestType === 'DELETE'
  ? t('privacy.execution.anonymizeDescription')
  : t('privacy.execution.exportDescription'))

const cleanParams = <T extends Record<string, unknown>>(params: T): T => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  ) as T
}

const rangeParams = () => {
  if (Array.isArray(filters.dateRange) && filters.dateRange.length === 2) {
    return { from: filters.dateRange[0], to: filters.dateRange[1] }
  }
  return {}
}

const loadProjects = async () => {
  try {
    const res = await getProjects()
    const routeProjectId = typeof route.query.projectId === 'string' ? route.query.projectId : ''
    const selection = resolveProjectSelection(
      res.data.data,
      routeProjectId,
      import.meta.env.VITE_DEFAULT_PROJECT_ID || '',
    )
    projects.value = selection.activeProjects
    filters.projectId = selection.selectedProjectId
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
}

const clearRequestContext = () => {
  Object.assign(requests, {
    projectId: filters.projectId,
    rangeStart: null,
    rangeEnd: null,
    page: 1,
    pageSize: filters.pageSize,
    total: 0,
    items: [],
  })
  selectedRequest.value = null
  selectedProjectId.value = ''
  selectedDetail.value = null
  activities.value = []
  detailVisible.value = false
  updateVisible.value = false
  notifyVisible.value = false
  executionVisible.value = false
  loading.value = false
  detailLoading.value = false
  updating.value = false
  notifying.value = false
  executing.value = false
}

const handleProjectChange = async () => {
  requestGeneration += 1
  filters.page = 1
  clearRequestContext()
  if (filters.projectId) {
    await router.replace({ path: '/privacy-requests', query: { projectId: filters.projectId } })
    await loadRequests()
  }
}

const loadRequests = async () => {
  if (!filters.projectId) {
    ElMessage.warning(t('errors.selectProject'))
    return
  }

  const projectId = filters.projectId
  const generation = ++requestGeneration
  loading.value = true
  try {
    const params: PrivacyRequestListParams = cleanParams({
      projectId,
      page: filters.page,
      pageSize: filters.pageSize,
      userId: filters.userId,
      openOnly: filters.openOnly,
      ...rangeParams(),
    })
    if (filters.status) params.status = filters.status
    if (filters.requestType) params.requestType = filters.requestType
    if (filters.processor) params.processor = filters.processor

    const res = await getPrivacyRequests(params)
    if (generation !== requestGeneration || filters.projectId !== projectId) return
    Object.assign(requests, res.data.data)
  } catch (error) {
    if (generation === requestGeneration && filters.projectId === projectId) {
      ElMessage.error(getErrorMessage(error, t('privacy.errors.loadFailed')))
    }
  } finally {
    if (generation === requestGeneration && filters.projectId === projectId) loading.value = false
  }
}

const applyFilters = () => {
  filters.page = 1
  loadRequests()
}

const openDetail = async (row: PrivacyRequestItem) => {
  const projectId = requests.projectId || filters.projectId
  selectedRequest.value = row
  selectedProjectId.value = projectId
  selectedDetail.value = null
  activities.value = []
  detailVisible.value = true
  detailLoading.value = true
  try {
    const [detailResponse, activityResponse] = await Promise.all([
      getPrivacyRequestDetail(projectId, row.requestId),
      getPrivacyRequestActivities(projectId, row.requestId),
    ])
    if (selectedProjectId.value !== projectId
      || selectedRequest.value?.requestId !== row.requestId) return
    selectedDetail.value = detailResponse.data.data
    activities.value = activityResponse.data.data
  } catch (error) {
    if (selectedProjectId.value === projectId) {
      ElMessage.error(getErrorMessage(error, t('privacy.errors.detailFailed')))
    }
  } finally {
    if (selectedProjectId.value === projectId) detailLoading.value = false
  }
}

const openUpdate = async (row: PrivacyRequestItem) => {
  if (isFinalStatus(row.status)) return
  selectedRequest.value = row
  selectedProjectId.value = requests.projectId || filters.projectId
  updateForm.status = row.status === 'SUBMITTED' ? 'IN_PROGRESS' : row.status
  updateForm.operator = row.operator || ''
  updateForm.operatorNote = ''
  updateForm.notifyUser = false
  updateForm.notificationMessage = ''
  resultPayloadText.value = ''
  updateVisible.value = true
}

const openNotify = (row: PrivacyRequestItem) => {
  selectedRequest.value = row
  selectedProjectId.value = requests.projectId || filters.projectId
  notifyForm.subject = `Privacy request update: ${row.requestId}`
  notifyForm.message = ''
  notifyForm.operator = row.operator || ''
  notifyVisible.value = true
}

const openExecution = (row: PrivacyRequestItem) => {
  if (!isExecutable(row)) return
  selectedRequest.value = row
  selectedProjectId.value = requests.projectId || filters.projectId
  executionForm.operator = row.operator || ''
  executionForm.confirmation = ''
  executionVisible.value = true
}

const downloadExport = (data: Record<string, unknown>, fileName: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

const submitExecution = async () => {
  if (!selectedRequest.value) return
  const projectId = selectedProjectId.value
  const workOrder = selectedRequest.value
  if (!projectId || !executionForm.operator.trim()) {
    ElMessage.warning(t('privacy.errors.operatorRequired'))
    return
  }
  if (workOrder.requestType === 'DELETE'
    && executionForm.confirmation.trim() !== workOrder.requestId) {
    ElMessage.warning(t('privacy.errors.confirmationMismatch'))
    return
  }

  executing.value = true
  try {
    const response = await executePrivacyRequest(projectId, workOrder.requestId, {
      version: workOrder.version,
      operator: executionForm.operator.trim(),
      confirmation: workOrder.requestType === 'DELETE'
        ? executionForm.confirmation.trim()
        : undefined,
    })
    if (selectedProjectId.value !== projectId || filters.projectId !== projectId) return
    const result = response.data.data
    if (result.exportData && result.downloadFileName) {
      downloadExport(result.exportData, result.downloadFileName)
      ElMessage.success(t('privacy.messages.exported'))
    } else {
      ElMessage.success(t('privacy.messages.anonymized'))
    }
    executionVisible.value = false
    await loadRequests()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('privacy.errors.executionFailed')))
  } finally {
    executing.value = false
  }
}

const parseResultPayload = () => {
  const text = resultPayloadText.value.trim()
  if (!text) return undefined
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    ElMessage.error(t('privacy.errors.invalidJson'))
    throw new Error('invalid result payload json')
  }
}

const submitUpdate = async () => {
  if (!selectedRequest.value) return
  const projectId = selectedProjectId.value
  const requestId = selectedRequest.value.requestId
  if (!projectId) return
  updating.value = true
  try {
    const resultPayload = parseResultPayload()
    await updatePrivacyRequest(projectId, requestId, cleanParams({
      version: selectedRequest.value.version,
      status: updateForm.status,
      operator: updateForm.operator,
      operatorNote: updateForm.operatorNote,
      resultPayload,
      notifyUser: updateForm.notifyUser,
      notificationMessage: updateForm.notificationMessage,
    }))
    if (selectedProjectId.value !== projectId || filters.projectId !== projectId) return
    ElMessage.success(t('privacy.messages.updated'))
    updateVisible.value = false
    loadRequests()
  } catch (error) {
    if ((error as Error).message !== 'invalid result payload json') {
      ElMessage.error(getErrorMessage(error, t('privacy.errors.updateFailed')))
    }
  } finally {
    updating.value = false
  }
}

const submitNotify = async () => {
  if (!selectedRequest.value) return
  const projectId = selectedProjectId.value
  const requestId = selectedRequest.value.requestId
  if (!projectId) return
  if (!notifyForm.subject.trim() || !notifyForm.message.trim()) {
    ElMessage.warning(t('privacy.errors.notifyRequired'))
    return
  }

  notifying.value = true
  try {
    const response = await notifyPrivacyRequestUser(projectId, requestId, cleanParams({
      subject: notifyForm.subject,
      message: notifyForm.message,
      operator: notifyForm.operator,
    }))
    if (selectedProjectId.value !== projectId || filters.projectId !== projectId) return
    ElMessage.success(t('privacy.messages.notificationQueued', {
      notificationId: response.data.data.notificationId,
    }))
    notifyVisible.value = false
    loadRequests()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('privacy.errors.notifyFailed')))
  } finally {
    notifying.value = false
  }
}

const handlePageChange = (page: number) => {
  filters.page = page
  loadRequests()
}

const handlePageSizeChange = (pageSize: number) => {
  filters.pageSize = pageSize
  filters.page = 1
  loadRequests()
}

const statusTagType = (status: PrivacyRequestStatus) => {
  if (status === 'COMPLETED') return 'success'
  if (status === 'REJECTED' || status === 'CANCELLED') return 'danger'
  if (status === 'IN_PROGRESS') return 'warning'
  return 'info'
}

const statusLabel = (status: PrivacyRequestStatus) => t(`privacy.status.${status}`)

const activityLabel = (activityType: string) => {
  const key = `privacy.activities.${activityType}`
  const label = t(key)
  return label === key ? activityType : label
}

const formatDateTime = (value?: string | null) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const formatJsonBlock = (value: unknown) => {
  if (!value) return '-'
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

onMounted(async () => {
  await loadProjects()
  if (filters.projectId) {
    loadRequests()
  }
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
  margin-bottom: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid rgba(0, 0, 0, 0.04);
  gap: 24px;
}

.header-title {
  font-size: 34px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.02em;
}

.header-subtitle {
  color: #86868b;
  font-size: 14px;
  margin: 6px 0 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.content-card {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.filter-bar {
  margin-bottom: 18px;
}

.filter-form {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.request-table {
  width: 100%;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 18px;
}

.detail-body {
  padding-right: 4px;
}

.detail-section-title {
  margin: 24px 0 10px;
  font-size: 14px;
  color: #1d1d1f;
}

.json-block {
  margin: 0;
  padding: 12px;
  background: #f5f5f7;
  border-radius: 8px;
  color: #1d1d1f;
  font-size: 12px;
  line-height: 1.5;
  overflow: auto;
}

.execution-alert {
  margin-bottom: 16px;
}

.execution-subject {
  margin-bottom: 18px;
}

@media (max-width: 1280px) {
  .header-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
