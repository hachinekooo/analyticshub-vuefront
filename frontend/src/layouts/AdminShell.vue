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
const { activeProjects, loading, selectedProjectId } = storeToRefs(projectContext)

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
    <header class="shell-header">
      <button class="brand" type="button" @click="navigate('/', false)">
        <span class="brand-mark">AH</span>
        <span>
          <strong>AnalyticsHub</strong>
        </span>
      </button>

      <nav class="shell-nav" :aria-label="t('shell.mainNavigation')">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="nav-item"
          :class="{ 'is-active': route.path === item.path }"
          :disabled="item.projectScoped && !selectedProjectId"
          @click="navigate(item.path, item.projectScoped)"
        >
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="header-actions">
        <div v-if="projectScoped" class="project-context">
          <span class="project-context-label">{{ t('shell.currentProject') }}</span>
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
        </div>
        <LanguageToggle />
      </div>
    </header>

    <main class="shell-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell {
  min-height: 100vh;
  background: #f5f5f7;
}

.shell-header {
  position: sticky;
  top: 0;
  z-index: 2000;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 0 max(24px, calc((100vw - 1500px) / 2));
  color: #1d1d1f;
  background: rgba(250, 250, 252, 0.94);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: saturate(180%) blur(20px);
}

.brand {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 10px;
  padding: 8px 10px 8px 0;
  color: inherit;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.brand-mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  color: white;
  font-size: 13px;
  font-weight: 700;
  background: #0071e3;
  border-radius: 9px;
}

.brand strong { display: block; font-size: 15px; letter-spacing: -0.01em; }

.shell-nav { display: flex; align-items: stretch; align-self: stretch; margin-left: 24px; }

.nav-item {
  display: flex;
  align-items: center;
  margin: 0;
  padding: 0 15px;
  color: #515154;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  cursor: pointer;
}
.nav-item:hover:not(:disabled) { color: #0071e3; }
.nav-item.is-active { color: #1d1d1f; font-weight: 600; border-bottom-color: #0071e3; }
.nav-item:disabled { opacity: 0.4; cursor: not-allowed; }

.header-actions,
.project-context {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-actions { margin-left: auto; }
.project-context-label { color: #6e6e73; font-size: 12px; white-space: nowrap; }
.project-switcher { width: min(310px, 30vw); }
.shell-content { min-width: 0; padding: 36px 32px 56px; }

@media (max-width: 1080px) {
  .shell-header { flex-wrap: wrap; padding: 8px 20px; }
  .shell-nav { order: 3; width: 100%; height: 42px; margin: 4px 0 -8px; overflow-x: auto; }
  .nav-item { flex: 1; justify-content: center; min-width: max-content; }
  .project-switcher { width: min(300px, 38vw); }
  .shell-content { padding: 22px 16px; }
}

@media (max-width: 600px) {
  .brand > span:last-child,
  .project-context-label { display: none; }
  .header-actions { min-width: 0; }
  .project-switcher { width: min(230px, 55vw); }
}
</style>
