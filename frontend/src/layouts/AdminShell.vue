<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { useI18n } from '@/i18n'
import { useProjectContextStore } from '@/stores/projectContext'
import { getApiErrorMessage as getErrorMessage } from '@/utils/apiError'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const projectContext = useProjectContextStore()
const { activeProjects, loading, selectedProject, selectedProjectId } = storeToRefs(projectContext)

const projectScoped = computed(() => Boolean(route.meta.projectScoped))
const routeProjectId = computed(() => typeof route.query.projectId === 'string' ? route.query.projectId : '')

const navItems = computed(() => [
  { path: '/', label: t('nav.projects'), icon: 'FolderOpened', projectScoped: false },
  { path: '/metrics', label: t('nav.metrics'), icon: 'TrendCharts', projectScoped: true },
  { path: '/semantics', label: t('nav.semantics'), icon: 'CollectionTag', projectScoped: true },
  { path: '/privacy-requests', label: t('nav.privacyRequests'), icon: 'Tickets', projectScoped: true },
])

const navigate = (path: string, requiresProject: boolean) => {
  router.push({
    path,
    query: requiresProject && selectedProjectId.value
      ? { projectId: selectedProjectId.value }
      : {},
  })
}

const changeProject = (projectId: string) => {
  projectContext.selectProject(projectId)
}

watch(routeProjectId, (projectId) => {
  if (projectId) projectContext.selectProject(projectId)
})

watch(selectedProjectId, async (projectId) => {
  if (!projectScoped.value || !projectId || routeProjectId.value === projectId) return
  await router.replace({ path: route.path, query: { ...route.query, projectId } })
})

onMounted(async () => {
  try {
    await projectContext.ensureLoaded(routeProjectId.value)
    if (projectScoped.value && selectedProjectId.value && !routeProjectId.value) {
      await router.replace({ path: route.path, query: { ...route.query, projectId: selectedProjectId.value } })
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
})
</script>

<template>
  <div class="admin-shell">
    <aside class="shell-sidebar">
      <button class="brand" type="button" @click="navigate('/', false)">
        <span class="brand-mark">AH</span>
        <span>
          <strong>AnalyticsHub</strong>
          <small>{{ t('shell.internalCenter') }}</small>
        </span>
      </button>

      <nav class="shell-nav" :aria-label="t('shell.mainNavigation')">
        <template v-for="item in navItems" :key="item.path">
          <div v-if="item.path === '/metrics'" class="nav-section-label">
            {{ t('shell.projectWorkspace') }}
          </div>
          <button
            type="button"
            class="nav-item"
            :class="{ 'is-active': route.path === item.path }"
            :disabled="item.projectScoped && !selectedProjectId"
            @click="navigate(item.path, item.projectScoped)"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </button>
        </template>
      </nav>

      <div class="sidebar-footer">
        <LanguageToggle />
      </div>
    </aside>

    <div class="shell-main">
      <header v-if="projectScoped" class="project-bar">
        <div class="project-context-copy">
          <span>{{ t('shell.currentProject') }}</span>
          <strong>{{ selectedProject?.projectName || t('filters.selectProject') }}</strong>
        </div>
        <el-select
          :model-value="selectedProjectId"
          filterable
          :loading="loading"
          :placeholder="t('filters.selectProject')"
          class="project-switcher"
          @change="changeProject"
        >
          <el-option
            v-for="project in activeProjects"
            :key="project.id"
            :label="`${project.projectName} · ${project.projectId}`"
            :value="project.projectId"
          />
        </el-select>
      </header>

      <main class="shell-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
}

.shell-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding: 22px 16px;
  color: #f5f7fb;
  background: #111827;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  color: inherit;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.brand-mark {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: white;
  font-size: 13px;
  font-weight: 800;
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  border-radius: 11px;
}

.brand strong,
.brand small { display: block; }
.brand strong { font-size: 15px; }
.brand small { margin-top: 2px; color: #94a3b8; font-size: 11px; }

.shell-nav { margin-top: 34px; }
.nav-section-label {
  margin: 26px 10px 8px;
  color: #64748b;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.nav-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 3px 0;
  padding: 11px 12px;
  color: #cbd5e1;
  font-size: 14px;
  text-align: left;
  border: 0;
  border-radius: 10px;
  background: transparent;
  cursor: pointer;
}
.nav-item:hover:not(:disabled) { color: white; background: rgba(255, 255, 255, 0.07); }
.nav-item.is-active { color: white; background: #2563eb; }
.nav-item:disabled { opacity: 0.4; cursor: not-allowed; }

.sidebar-footer { margin-top: auto; padding: 8px; }
.shell-main { min-width: 0; }
.project-bar {
  min-height: 68px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 12px 28px;
  background: rgba(255, 255, 255, 0.92);
  border-bottom: 1px solid var(--el-border-color-lighter);
  backdrop-filter: blur(16px);
}
.project-context-copy span,
.project-context-copy strong { display: block; }
.project-context-copy span { color: var(--el-text-color-secondary); font-size: 11px; }
.project-context-copy strong { margin-top: 3px; font-size: 14px; }
.project-switcher { width: min(360px, 48vw); }
.shell-content { min-width: 0; padding: 32px; }

@media (max-width: 900px) {
  .admin-shell { grid-template-columns: 76px minmax(0, 1fr); }
  .shell-sidebar { padding-inline: 10px; }
  .brand > span:last-child,
  .nav-item span,
  .nav-section-label { display: none; }
  .brand,
  .nav-item { justify-content: center; }
  .shell-content { padding: 22px 16px; }
}

@media (max-width: 600px) {
  .admin-shell { display: block; }
  .shell-sidebar {
    position: static;
    width: 100%;
    height: auto;
    flex-direction: row;
    align-items: center;
    gap: 4px;
  }
  .brand { width: auto; }
  .shell-nav { display: flex; margin: 0 0 0 auto; }
  .nav-item { width: auto; }
  .sidebar-footer { display: none; }
  .project-bar { align-items: flex-start; flex-direction: column; padding: 12px 16px; }
  .project-switcher { width: 100%; }
}
</style>
