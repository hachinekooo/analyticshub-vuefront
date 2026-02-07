<template>
  <div class="admin-container">
    <div class="header-card">
      <div>
        <h1 class="header-title">{{ t('dashboard.title') }}</h1>
        <p class="header-subtitle">{{ t('dashboard.subtitle') }}</p>
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
        <el-button type="primary" size="large" @click="showAddDialog" class="add-btn">
          <el-icon class="el-icon--left"><Plus /></el-icon>
          {{ t('buttons.addProject') }}
        </el-button>
      </div>
    </div>

    <div class="content-card">
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading" :size="50"><Loading /></el-icon>
      </div>

      <div v-else-if="projects.length === 0" class="empty-state">
        <el-icon :size="64"><FolderOpened /></el-icon>
        <p>{{ t('dashboard.empty') }}</p>
      </div>

      <div v-else class="project-grid">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card clickable"
          role="button"
          @click="openProjectMetrics(project)"
        >
          <div class="project-header">
            <div class="project-info">
              <h3>{{ project.projectName }}</h3>
              <p>
                {{ t('dashboard.labels.id') }}: {{ project.projectId }} |
                {{ t('dashboard.labels.db') }}: {{ project.dbName }} |
                {{ t('dashboard.labels.prefix') }}: {{ project.tablePrefix }}
              </p>
            </div>
            <div>
              <el-tag :type="project.isActive ? 'success' : 'info'" size="large" effect="light">
                {{ project.isActive ? t('status.active') : t('status.inactive') }}
              </el-tag>
            </div>
          </div>

          <div v-if="project.health" class="health-status">
            <span class="health-badge" :class="project.health.connected ? 'success' : 'error'">
              <el-icon v-if="project.health.connected"><Check /></el-icon>
              <el-icon v-else><Close /></el-icon>
              {{ t('status.connection') }}
            </span>
            <span class="health-badge" :class="project.health.tables.devices ? 'success' : 'warning'">
              {{ project.health.tables.devices ? '✓' : '✗' }} {{ t('status.devices') }}
            </span>
            <span class="health-badge" :class="project.health.tables.events ? 'success' : 'warning'">
              {{ project.health.tables.events ? '✓' : '✗' }} {{ t('status.events') }}
            </span>
            <span class="health-badge" :class="project.health.tables.sessions ? 'success' : 'warning'">
              {{ project.health.tables.sessions ? '✓' : '✗' }} {{ t('status.sessions') }}
            </span>
            <span class="health-badge" :class="project.health.tables.trafficMetrics ? 'success' : 'warning'">
              {{ project.health.tables.trafficMetrics ? '✓' : '✗' }} {{ t('status.traffic') }}
            </span>
          </div>

          <div class="action-buttons" @click.stop>
            <el-button size="small" @click="handleCheckHealth(project)" :loading="project.healthLoading" plain>
              <el-icon class="el-icon--left"><View /></el-icon> {{ t('buttons.checkStatus') }}
            </el-button>
            <el-button size="small" type="success" @click="handleInitDatabase(project)"
                v-if="project.health && !project.health.allTablesExist" plain>
              <el-icon class="el-icon--left"><CirclePlus /></el-icon> {{ t('buttons.initTables') }}
            </el-button>
            <el-button size="small" type="primary" @click="handleEditProject(project)" plain>
              <el-icon class="el-icon--left"><Edit /></el-icon> {{ t('buttons.edit') }}
            </el-button>
            <el-button size="small" type="danger" @click="handleDeleteProject(project)"
                v-if="project.projectId !== 'analytics-system'" plain>
              <el-icon class="el-icon--left"><Delete /></el-icon> {{ t('buttons.delete') }}
            </el-button>
          </div>
          <div class="card-footer">
            {{ t('dashboard.viewMetrics') }}
            <el-icon class="card-footer-icon"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? t('dialogs.editProject') : t('dialogs.addProject')"
      width="600px"
      custom-class="project-dialog"
    >
      <el-form :model="form" label-position="top" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
             <el-form-item :label="t('form.projectId')">
              <el-input v-model="form.projectId" :disabled="isEdit" :placeholder="t('form.placeholders.projectId')" />
            </el-form-item>
          </el-col>
           <el-col :span="12">
            <el-form-item :label="t('form.projectName')">
              <el-input v-model="form.projectName" :placeholder="t('form.placeholders.projectName')" />
            </el-form-item>
          </el-col>
        </el-row>
       
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item :label="t('form.dbHost')">
              <el-input v-model="form.dbHost" :placeholder="t('form.placeholders.dbHost')" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('form.port')">
              <el-input-number v-model="form.dbPort" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
             <el-form-item :label="t('form.dbName')">
              <el-input v-model="form.dbName" :placeholder="t('form.placeholders.dbName')" />
            </el-form-item>
          </el-col>
           <el-col :span="12">
            <el-form-item :label="t('form.tablePrefix')">
              <el-input v-model="form.tablePrefix" :placeholder="t('form.placeholders.tablePrefix')" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item :label="t('form.username')">
              <el-input v-model="form.dbUser" :placeholder="t('form.placeholders.username')" />
            </el-form-item>
          </el-col>
           <el-col :span="12">
            <el-form-item :label="t('form.password')">
              <el-input v-model="form.dbPassword" type="password" show-password
                :placeholder="isEdit ? t('form.placeholders.passwordEdit') : t('form.placeholders.password')" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item :label="t('form.status')">
          <el-switch
            v-model="form.isActive"
            :active-text="t('status.active')"
            :inactive-text="t('status.inactive')"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">{{ t('buttons.cancel') }}</el-button>
          <el-button type="primary" @click="saveProject">{{ t('buttons.save') }}</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { useI18n } from '@/i18n'
import { 
  getProjects, 
  createProject, 
  updateProject, 
  deleteProject, 
  checkProjectHealth, 
  initProjectDatabase,
  type Project 
} from '@/api/admin'

const projects = ref<Project[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)

const router = useRouter()
const route = useRoute()

const isProjectsRoute = computed(() => route.path === '/')
const isMetricsRoute = computed(() => route.path === '/metrics')

const goProjects = () => router.push('/')
const goMetrics = () => router.push('/metrics')
const { t } = useI18n()

const openProjectMetrics = (project: Project) => {
  router.push({ path: '/metrics', query: { projectId: project.projectId } })
}

type ErrorPayload = {
  error?: { message?: string }
  message?: string
}

const getErrorMessage = (err: unknown, fallback: string) => {
  const e = err as { response?: { data?: ErrorPayload } }
  return e.response?.data?.error?.message || fallback
}

const getEmptyForm = (): Partial<Project> => ({
  projectId: '',
  projectName: '',
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: '',
  dbUser: 'postgres',
  dbPassword: '',
  tablePrefix: 'analytics_',
  isActive: true,
})

const form = ref(getEmptyForm())

const loadProjects = async () => {
  loading.value = true
  try {
    const res = await getProjects()
    projects.value = res.data.data.map((p) => ({ ...p, health: null, healthLoading: false }))
    // Trigger health checks after list load to avoid blocking initial render.
    projects.value.forEach(p => handleCheckHealth(p))
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  } finally {
    loading.value = false
  }
}

const handleCheckHealth = async (project: Project) => {
  project.healthLoading = true
  try {
    const res = await checkProjectHealth(project.id)
    project.health = res.data.data
  } catch {
    // Fallback state keeps UI consistent when the health endpoint fails.
    project.health = { 
      connected: false, 
      tables: { devices: false, events: false, sessions: false, trafficMetrics: false }, 
      allTablesExist: false 
    }
  } finally {
    project.healthLoading = false
  }
}

const showAddDialog = () => {
  isEdit.value = false
  form.value = getEmptyForm()
  dialogVisible.value = true
}

const handleEditProject = (project: Project) => {
  isEdit.value = true
  // Leave password empty so the backend can keep it unchanged.
  form.value = { ...project, dbPassword: '' }
  dialogVisible.value = true
}

const saveProject = async () => {
  try {
    if (isEdit.value) {
      if (form.value.id) {
        await updateProject(form.value.id, form.value)
        ElMessage.success(t('messages.projectUpdated'))
      }
    } else {
      await createProject(form.value)
      ElMessage.success(t('messages.projectCreated'))
    }
    dialogVisible.value = false
    loadProjects()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.saveProjectFailed')))
  }
}

const handleInitDatabase = async (project: Project) => {
  try {
    await ElMessageBox.confirm(
      t('dialogs.confirmInitMessage', { name: project.projectName }),
      t('dialogs.confirmInitTitle'),
      { confirmButtonText: t('dialogs.confirmInitOk'), cancelButtonText: t('buttons.cancel'), type: 'warning' }
    )
    
    const res = await initProjectDatabase(project.id)
    ElMessage.success(res.data.message || t('messages.initSuccess'))
    handleCheckHealth(project)
  } catch (error) {
      if (error !== 'cancel') {
         ElMessage.error(getErrorMessage(error, t('messages.initFailed')))
      }
  }
}

const handleDeleteProject = async (project: Project) => {
  try {
    await ElMessageBox.confirm(
      t('dialogs.confirmDeleteMessage', { name: project.projectName }),
      t('dialogs.confirmDeleteTitle'),
      { confirmButtonText: t('dialogs.confirmDeleteOk'), cancelButtonText: t('buttons.cancel'), type: 'warning' }
    )
    
    await deleteProject(project.id)
    ElMessage.success(t('messages.projectDeleted'))
    loadProjects()
  } catch (error) {
    if (error !== 'cancel') {
        ElMessage.error(getErrorMessage(error, t('messages.deletionFailed')))
    }
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
  padding: 32px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
}

.loading-state, .empty-state {
  text-align: center;
  padding: 80px 0;
  color: #86868b;
}

.empty-state p {
  margin-top: 16px;
  font-size: 17px;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 24px;
}

.project-card {
  background: #ffffff;
  border-radius: 18px;
  padding: 24px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.project-card.clickable {
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
  border-color: rgba(0, 0, 0, 0.0);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.card-footer {
  margin-top: 16px;
  font-size: 12px;
  color: #86868b;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  letter-spacing: 0.02em;
}

.card-footer-icon {
  margin-left: 6px;
  font-size: 12px;
}

.project-card:hover .card-footer {
  color: #0071e3;
}

@media (max-width: 960px) {
  .header-card {
    flex-direction: column;
    align-items: flex-start;
  }
}

.project-info h3 {
  font-size: 20px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #1d1d1f;
}

.project-info p {
  font-size: 13px;
  color: #86868b;
  line-height: 1.4;
}

.health-status {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f5f7;
}

.health-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  background: #f5f5f7;
  color: #86868b;
}

.health-badge.success {
  background: #eafbf1;
  color: #1c7c45;
}

.health-badge.warning {
  background: #fff8e6;
  color: #b7791f;
}

.health-badge.error {
  background: #fef0f0;
  color: #c92a2a;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 24px;
}

.add-btn {
  font-weight: 500;
  border-radius: 99px;
  padding-left: 24px;
  padding-right: 24px;
}

:deep(.el-button) {
  border-radius: 8px;
  font-weight: 500;
}

:deep(.el-button--large) {
  border-radius: 12px;
}

:deep(.el-tag) {
  border-radius: 6px;
  border: none;
}
</style>
