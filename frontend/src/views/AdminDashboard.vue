<template>
  <div class="admin-container">
    <div class="header-card">
      <h1 class="header-title">📊 Analytics System</h1>
      <el-button type="primary" size="large" @click="showAddDialog" class="add-btn">
        <el-icon class="el-icon--left"><Plus /></el-icon>
        Add Project
      </el-button>
    </div>

    <div class="content-card">
      <div v-if="loading" class="loading-state">
        <el-icon class="is-loading" :size="50"><Loading /></el-icon>
      </div>

      <div v-else-if="projects.length === 0" class="empty-state">
        <el-icon :size="64"><FolderOpened /></el-icon>
        <p>No projects found. Click the button above to add one.</p>
      </div>

      <div v-else class="project-grid">
        <div v-for="project in projects" :key="project.id" class="project-card">
          <div class="project-header">
            <div class="project-info">
              <h3>{{ project.project_name }}</h3>
              <p>ID: {{ project.project_id }} | DB: {{ project.db_name }} | Prefix: {{ project.table_prefix }}</p>
            </div>
            <div>
              <el-tag :type="project.is_active ? 'success' : 'info'" size="large" effect="light">
                {{ project.is_active ? 'Active' : 'Inactive' }}
              </el-tag>
            </div>
          </div>

          <div v-if="project.health" class="health-status">
            <span class="health-badge" :class="project.health.connected ? 'success' : 'error'">
              <el-icon v-if="project.health.connected"><Check /></el-icon>
              <el-icon v-else><Close /></el-icon>
              Connection
            </span>
            <span class="health-badge" :class="project.health.tables.devices ? 'success' : 'warning'">
              {{ project.health.tables.devices ? '✓' : '✗' }} Devices
            </span>
            <span class="health-badge" :class="project.health.tables.events ? 'success' : 'warning'">
              {{ project.health.tables.events ? '✓' : '✗' }} Events
            </span>
            <span class="health-badge" :class="project.health.tables.sessions ? 'success' : 'warning'">
              {{ project.health.tables.sessions ? '✓' : '✗' }} Sessions
            </span>
            <span class="health-badge" :class="project.health.tables.traffic_metrics ? 'success' : 'warning'">
              {{ project.health.tables.traffic_metrics ? '✓' : '✗' }} Traffic
            </span>
          </div>

          <div class="action-buttons">
            <el-button size="small" @click="handleCheckHealth(project)" :loading="project.healthLoading" plain>
              <el-icon class="el-icon--left"><View /></el-icon> Check Status
            </el-button>
            <el-button size="small" type="success" @click="handleInitDatabase(project)"
                v-if="project.health && !project.health.allTablesExist" plain>
              <el-icon class="el-icon--left"><CirclePlus /></el-icon> Init Tables
            </el-button>
            <el-button size="small" type="primary" @click="handleEditProject(project)" plain>
              <el-icon class="el-icon--left"><Edit /></el-icon> Edit
            </el-button>
            <el-button size="small" type="danger" @click="handleDeleteProject(project)"
                v-if="project.project_id !== 'analytics-system'" plain>
              <el-icon class="el-icon--left"><Delete /></el-icon> Delete
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? 'Edit Project' : 'Add Project'" width="600px" custom-class="project-dialog">
      <el-form :model="form" label-position="top" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
             <el-form-item label="Project ID">
              <el-input v-model="form.project_id" :disabled="isEdit" placeholder="e.g. memobox" />
            </el-form-item>
          </el-col>
           <el-col :span="12">
            <el-form-item label="Project Name">
              <el-input v-model="form.project_name" placeholder="e.g. MemoBox" />
            </el-form-item>
          </el-col>
        </el-row>
       
        <el-row :gutter="20">
          <el-col :span="16">
            <el-form-item label="Database Host">
              <el-input v-model="form.db_host" placeholder="localhost" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item label="Port">
              <el-input-number v-model="form.db_port" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
             <el-form-item label="Database Name">
              <el-input v-model="form.db_name" placeholder="e.g. memobox" />
            </el-form-item>
          </el-col>
           <el-col :span="12">
            <el-form-item label="Table Prefix">
              <el-input v-model="form.table_prefix" placeholder="analytics_" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="Username">
              <el-input v-model="form.db_user" placeholder="root" />
            </el-form-item>
          </el-col>
           <el-col :span="12">
            <el-form-item label="Password">
              <el-input v-model="form.db_password" type="password" show-password
                :placeholder="isEdit ? 'Leave empty to keep unchanged' : 'Password'" />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="Status">
          <el-switch v-model="form.is_active" active-text="Active" inactive-text="Inactive" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">Cancel</el-button>
          <el-button type="primary" @click="saveProject">Save</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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

const getEmptyForm = (): Partial<Project> => ({
  project_id: '',
  project_name: '',
  db_host: 'localhost',
  db_port: 5432,
  db_name: '',
  db_user: 'postgres',
  db_password: '',
  table_prefix: 'analytics_',
  is_active: true,
})

const form = ref(getEmptyForm())

const loadProjects = async () => {
  loading.value = true
  try {
    const res = await getProjects()
    projects.value = res.data.data.map((p: any) => ({ ...p, health: null, healthLoading: false }))
    // Check health for all
    projects.value.forEach(p => handleCheckHealth(p))
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error?.message || 'Failed to load projects')
  } finally {
    loading.value = false
  }
}

const handleCheckHealth = async (project: Project) => {
  project.healthLoading = true
  try {
    const res = await checkProjectHealth(project.id)
    project.health = res.data.data
  } catch (error) {
    project.health = { 
      connected: false, 
      tables: { devices: false, events: false, sessions: false, traffic_metrics: false }, 
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { db_password, ...rest } = project
  // We don't want to show the encrypted password or undefined, leave it empty for user to input new one if needed
  form.value = { ...rest, db_password: '' }
  dialogVisible.value = true
}

const saveProject = async () => {
  try {
    if (isEdit.value) {
      if (form.value.id) {
        await updateProject(form.value.id, form.value)
        ElMessage.success('Project updated successfully')
      }
    } else {
      await createProject(form.value)
      ElMessage.success('Project created successfully')
    }
    dialogVisible.value = false
    loadProjects()
  } catch (error: any) {
    ElMessage.error(error.response?.data?.error?.message || 'Failed to save project')
  }
}

const handleInitDatabase = async (project: Project) => {
  try {
    await ElMessageBox.confirm(
      `Initialize database for ${project.project_name}? This will create analytics tables.`,
      'Confirm Initialization',
      { confirmButtonText: 'Initialize', cancelButtonText: 'Cancel', type: 'warning' }
    )
    
    const res = await initProjectDatabase(project.id)
    ElMessage.success(res.data.message || 'Initialization successful')
    handleCheckHealth(project)
  } catch (error: any) {
      if (error !== 'cancel') {
         ElMessage.error(error.response?.data?.error?.message || 'Initialization failed')
      }
  }
}

const handleDeleteProject = async (project: Project) => {
  try {
    await ElMessageBox.confirm(
      `Are you sure you want to delete ${project.project_name}? Configuration will be removed but data remains.`,
      'Confirm Deletion',
      { confirmButtonText: 'Delete', cancelButtonText: 'Cancel', type: 'warning' }
    )
    
    await deleteProject(project.id)
    ElMessage.success('Project deleted successfully')
    loadProjects()
  } catch (error: any) {
    if (error !== 'cancel') {
        ElMessage.error(error.response?.data?.error?.message || 'Deletion failed')
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
}

.header-title {
  font-size: 34px;
  font-weight: 700;
  color: #1d1d1f;
  letter-spacing: -0.02em;
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
