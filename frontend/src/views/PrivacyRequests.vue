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
          <el-button type="primary">
            <el-icon class="el-icon--left"><Tickets /></el-icon>
            {{ t('nav.privacyRequests') }}
          </el-button>
        </el-button-group>
        <LanguageToggle />
        <el-tooltip :content="t('buttons.refresh')" placement="top">
          <el-button type="primary" :loading="loading" circle plain @click="loadRequests">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
    </div>

    <div class="content-card">
      <div class="filter-bar">
        <el-form :model="filters" inline class="filter-form">
          <el-select v-model="filters.projectId" :placeholder="t('filters.selectProject')" filterable style="width: 180px">
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
          <el-select v-model="filters.requestType" clearable :placeholder="t('privacy.filters.type')" style="width: 130px">
            <el-option label="EXPORT" value="EXPORT" />
            <el-option label="DELETE" value="DELETE" />
          </el-select>
          <el-select v-model="filters.processor" clearable :placeholder="t('privacy.filters.processor')" style="width: 150px">
            <el-option label="ANALYTICSHUB" value="ANALYTICSHUB" />
            <el-option label="POSTHOG" value="POSTHOG" />
          </el-select>
          <el-input v-model="filters.userId" clearable :placeholder="t('filters.userId')" style="width: 180px" />
          <el-button type="primary" :loading="loading" @click="loadRequests">
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
        <el-table-column :label="t('buttons.actions')" fixed="right" min-width="180">
          <template #default="{ row }">
            <el-button size="small" link type="primary" @click="openDetail(row)">
              {{ t('privacy.actions.detail') }}
            </el-button>
            <el-button size="small" link type="success" @click="openUpdate(row)">
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

    <el-drawer v-model="detailVisible" :title="t('privacy.detailTitle')" size="560px">
      <div v-if="selectedDetail" class="detail-body">
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
      </div>
    </el-drawer>

    <el-dialog v-model="updateVisible" :title="t('privacy.processTitle')" width="560px">
      <el-form :model="updateForm" label-position="top">
        <el-form-item :label="t('privacy.filters.status')">
          <el-select v-model="updateForm.status" style="width: 100%">
            <el-option v-for="status in privacyStatuses" :key="status" :label="statusLabel(status)" :value="status" />
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
import { getProjects, type Project } from '@/api/admin'
import {
  getPrivacyRequestDetail,
  getPrivacyRequests,
  notifyPrivacyRequestUser,
  updatePrivacyRequest,
  type PrivacyProcessor,
  type PrivacyRequestDetail,
  type PrivacyRequestItem,
  type PrivacyRequestListParams,
  type PrivacyRequestsResponse,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from '@/api/privacy'

type ErrorPayload = {
  error?: { message?: string }
  message?: string
}

const router = useRouter()
const route = useRoute()
const { t } = useI18n()

const isProjectsRoute = computed(() => route.path === '/')
const isMetricsRoute = computed(() => route.path === '/metrics')

const goProjects = () => router.push('/')
const goMetrics = () => router.push('/metrics')

const privacyStatuses: PrivacyRequestStatus[] = ['SUBMITTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED']
const projects = ref<Project[]>([])
const loading = ref(false)
const updating = ref(false)
const notifying = ref(false)
const selectedRequest = ref<PrivacyRequestItem | null>(null)
const selectedDetail = ref<PrivacyRequestDetail | null>(null)
const detailVisible = ref(false)
const updateVisible = ref(false)
const notifyVisible = ref(false)
const resultPayloadText = ref('')

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
  projectId: import.meta.env.VITE_DEFAULT_PROJECT_ID || '',
  dateRange: null as string[] | null,
  page: 1,
  pageSize: 20,
  status: '' as '' | PrivacyRequestStatus,
  requestType: '' as '' | PrivacyRequestType,
  processor: '' as '' | PrivacyProcessor,
  userId: '',
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

const getErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: ErrorPayload } }
  return e.response?.data?.error?.message || fallback
}

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
    projects.value = res.data.data
    const firstProject = projects.value[0]
    if (!filters.projectId && firstProject) {
      filters.projectId = firstProject.projectId
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
}

const loadRequests = async () => {
  if (!filters.projectId) {
    ElMessage.warning(t('errors.selectProject'))
    return
  }

  loading.value = true
  try {
    const params: PrivacyRequestListParams = cleanParams({
      projectId: filters.projectId,
      page: filters.page,
      pageSize: filters.pageSize,
      userId: filters.userId,
      ...rangeParams(),
    })
    if (filters.status) params.status = filters.status
    if (filters.requestType) params.requestType = filters.requestType
    if (filters.processor) params.processor = filters.processor

    const res = await getPrivacyRequests(params)
    Object.assign(requests, res.data.data)
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('privacy.errors.loadFailed')))
  } finally {
    loading.value = false
  }
}

const openDetail = async (row: PrivacyRequestItem) => {
  selectedRequest.value = row
  detailVisible.value = true
  try {
    const res = await getPrivacyRequestDetail(filters.projectId, row.requestId)
    selectedDetail.value = res.data.data
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('privacy.errors.detailFailed')))
  }
}

const openUpdate = async (row: PrivacyRequestItem) => {
  selectedRequest.value = row
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
  notifyForm.subject = `Privacy request update: ${row.requestId}`
  notifyForm.message = ''
  notifyForm.operator = row.operator || ''
  notifyVisible.value = true
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
  updating.value = true
  try {
    const resultPayload = parseResultPayload()
    await updatePrivacyRequest(filters.projectId, selectedRequest.value.requestId, cleanParams({
      status: updateForm.status,
      operator: updateForm.operator,
      operatorNote: updateForm.operatorNote,
      resultPayload,
      notifyUser: updateForm.notifyUser,
      notificationMessage: updateForm.notificationMessage,
    }))
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
  if (!notifyForm.subject.trim() || !notifyForm.message.trim()) {
    ElMessage.warning(t('privacy.errors.notifyRequired'))
    return
  }

  notifying.value = true
  try {
    await notifyPrivacyRequestUser(filters.projectId, selectedRequest.value.requestId, cleanParams({
      subject: notifyForm.subject,
      message: notifyForm.message,
      operator: notifyForm.operator,
    }))
    ElMessage.success(t('privacy.messages.notified'))
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

@media (max-width: 960px) {
  .header-card {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
