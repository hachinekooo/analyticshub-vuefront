<template>
  <div class="admin-container">
    <PageHeader :title="t('dashboard.title')" :subtitle="t('dashboard.subtitle')" />

    <div class="content-card">
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading" :size="50"><Loading /></el-icon>
      </div>

      <div v-else class="project-grid">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          :class="{ clickable: project.isActive, disabled: !project.isActive }"
          :role="project.isActive ? 'button' : undefined"
          @click="openProjectMetrics(project)"
        >
          <div class="project-header">
            <div class="project-info">
              <h3>{{ project.projectName }}</h3>
              <p>
                {{ t('dashboard.labels.id') }}: {{ project.projectId }} |
                {{ t('dashboard.labels.db') }}: {{ project.dbName }} |
                {{ t('dashboard.labels.schema') }}: {{ project.dbSchema }} |
                {{ t('dashboard.labels.prefix') }}: {{ project.tablePrefix }}
              </p>
            </div>
            <div>
              <el-tag :type="project.isActive ? 'success' : 'info'" size="large" effect="light">
                {{ project.isActive ? t('status.active') : t('status.inactive') }}
              </el-tag>
              <el-tag class="template-tag" size="small" effect="plain">
                {{ t(`projectTemplates.${project.analysisTemplate}`) }}
              </el-tag>
            </div>
          </div>

          <div v-if="project.health" class="health-status">
            <span class="health-badge" :class="project.health.connected ? 'success' : 'error'">
              <el-icon v-if="project.health.connected"><Check /></el-icon>
              <el-icon v-else><Close /></el-icon>
              {{ t('status.connection') }}
            </span>
            <span class="health-badge" :class="project.health.tables?.devices ? 'success' : 'warning'">
              {{ project.health.tables?.devices ? '✓' : '✗' }} {{ t('status.devices') }}
            </span>
            <span class="health-badge" :class="project.health.tables?.events ? 'success' : 'warning'">
              {{ project.health.tables?.events ? '✓' : '✗' }} {{ t('status.events') }}
            </span>
            <span class="health-badge" :class="project.health.tables?.sessions ? 'success' : 'warning'">
              {{ project.health.tables?.sessions ? '✓' : '✗' }} {{ t('status.sessions') }}
            </span>
            <span class="health-badge" :class="project.health.tables?.traffic_metrics ? 'success' : 'warning'">
              {{ project.health.tables?.traffic_metrics ? '✓' : '✗' }} {{ t('status.traffic') }}
            </span>
            <span
              v-if="project.health.connected"
              class="health-badge"
              :class="project.health.schemaCurrent ? 'success' : 'warning'"
              :title="project.health.historyTable || undefined"
            >
              {{ t('dashboard.labels.schema') }}:
              {{ project.health.schemaVersion ? `v${project.health.schemaVersion}` : '-' }}
              <template v-if="project.health.pendingMigrations > 0">
                (+{{ project.health.pendingMigrations }})
              </template>
            </span>
          </div>

          <div class="action-buttons" @click.stop>
            <el-button size="small" @click="handleCheckHealth(project)" :loading="project.healthLoading" plain>
              <el-icon class="el-icon--left"><View /></el-icon> {{ t('buttons.checkStatus') }}
            </el-button>
            <el-button size="small" type="success" @click="handleInitDatabase(project)"
                v-if="project.health?.connected && !project.health.schemaCurrent" plain>
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
            {{ project.isActive ? t('dashboard.viewMetrics') : t('dashboard.inactiveHint') }}
            <el-icon v-if="project.isActive" class="card-footer-icon"><ArrowRight /></el-icon>
          </div>
        </div>
        <button type="button" class="new-project-card" @click="showAddDialog">
          <el-icon :size="24"><Plus /></el-icon>
          <strong>{{ t('buttons.addProject') }}</strong>
          <span>{{ t('dashboard.newProjectHint') }}</span>
        </button>
      </div>
    </div>

    <ProjectFormDialog
      v-model="dialogVisible"
      :project="editingProject"
      :saving="saving"
      @submit="saveProject"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import ProjectFormDialog from '@/components/projects/ProjectFormDialog.vue'
import { useI18n } from '@/i18n'
import { useProjectContextStore } from '@/stores/projectContext'
import { getApiErrorMessage as getErrorMessage } from '@/utils/apiError'
import { projectRoute } from '@/utils/projectRoutes'
import { 
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
const saving = ref(false)
const editingProject = ref<Project | null>(null)

const router = useRouter()
const projectContext = useProjectContextStore()
const { t } = useI18n()

const openProjectMetrics = (project: Project) => {
  if (!project.isActive) return
  router.push(projectRoute(project.projectId))
}

const loadProjects = async () => {
  loading.value = true
  try {
    await projectContext.ensureLoaded()
    projects.value = projectContext.projects.map((project) => ({
      ...project,
      health: null,
      healthLoading: false,
    }))
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
      tables: {},
      allTablesExist: false,
      schemaCurrent: false,
      migrationHistoryValid: false,
      schemaVersion: null,
      pendingMigrations: 0,
      historyTable: null,
      errorCode: null,
      error: null,
    }
  } finally {
    project.healthLoading = false
  }
}

const showAddDialog = () => {
  editingProject.value = null
  dialogVisible.value = true
}

const handleEditProject = (project: Project) => {
  editingProject.value = project
  dialogVisible.value = true
}

const saveProject = async (payload: Partial<Project>) => {
  saving.value = true
  let preferredProjectId = projectContext.selectedProjectId
  let createdProjectId = ''
  try {
    if (editingProject.value) {
      await updateProject(editingProject.value.id, payload)
      preferredProjectId = editingProject.value.projectId
      ElMessage.success(t('messages.projectUpdated'))
    } else {
      const response = await createProject(payload)
      createdProjectId = response.data.data.projectId
      preferredProjectId = createdProjectId
      ElMessage.success(t('messages.projectCreated'))
    }
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.saveProjectFailed')))
    saving.value = false
    return
  }
  try {
    await projectContext.reload(preferredProjectId)
    await loadProjects()
    if (createdProjectId) await router.push(projectRoute(createdProjectId))
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  } finally {
    saving.value = false
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
    ElMessage.success(res.data.data.message || t('messages.initSuccess'))
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
  } catch (error) {
    if (error !== 'cancel') {
        ElMessage.error(getErrorMessage(error, t('messages.deletionFailed')))
    }
    return
  }
  try {
    await projectContext.reload(projectContext.selectedProjectId)
    await loadProjects()
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
  color: #1d1d1f;
}

.content-card {
  background: transparent;
}

.loading-state {
  text-align: center;
  padding: 80px 0;
  color: #86868b;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
  gap: 14px;
}

.project-card {
  min-height: 210px;
  background: #ffffff;
  border-radius: 12px;
  padding: 18px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: transform 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
}

.project-card.clickable {
  cursor: pointer;
}
.project-card.disabled { opacity: 0.72; }

.project-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.06);
  border-color: #8fc7ff;
}

.template-tag { display: flex; margin-top: 6px; }

.new-project-card {
  display: grid;
  place-items: center;
  align-content: center;
  min-height: 210px;
  gap: 7px;
  padding: 22px;
  color: #0066cc;
  text-align: center;
  border: 1.5px dashed #8bbce8;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
}
.new-project-card:hover { border-color: #0071e3; background: rgba(255, 255, 255, 0.5); }
.new-project-card strong { font-size: 16px; }
.new-project-card span { color: #6e6e73; font-size: 12px; }

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
