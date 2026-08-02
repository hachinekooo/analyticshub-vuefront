<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, useRoute, useRouter } from 'vue-router'
import LanguageToggle from '@/components/LanguageToggle.vue'
import { useI18n } from '@/i18n'
import { useProjectContextStore } from '@/stores/projectContext'
import { getApiErrorMessage as getErrorMessage } from '@/utils/apiError'
import {
  projectIdFromParam,
  projectRoute,
  type ProjectSection,
} from '@/utils/projectRoutes'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const projectContext = useProjectContextStore()
const { activeProjects, loading, selectedProject, selectedProjectId } = storeToRefs(projectContext)

const projectScoped = computed(() => Boolean(route.meta.projectScoped))
const routeProjectId = computed(() => projectIdFromParam(route.params.projectId))
const activeSection = computed<ProjectSection>(() => {
  const section = route.meta.projectSection
  return section === 'semantics' || section === 'counters' || section === 'privacy'
    ? section
    : 'dashboard'
})
const projectNavigation = computed(() => [
  { section: 'dashboard' as const, label: t('nav.metrics') },
  { section: 'semantics' as const, label: t('nav.semantics') },
  { section: 'counters' as const, label: t('nav.counters') },
  { section: 'privacy' as const, label: t('nav.privacyRequests') },
])

const openProjects = () => router.push({ name: 'home' })

const openProjectSection = (section: ProjectSection) => {
  if (!selectedProjectId.value) return
  router.push(projectRoute(selectedProjectId.value, section))
}

const changeProject = (projectId: string) => {
  projectContext.selectProject(projectId)
  if (selectedProjectId.value) {
    router.push(projectRoute(selectedProjectId.value, activeSection.value))
  }
}

watch(routeProjectId, (projectId) => {
  if (projectId) projectContext.selectProject(projectId)
})

onMounted(async () => {
  try {
    await projectContext.ensureLoaded(routeProjectId.value)
    if (projectScoped.value && !selectedProject.value) {
      await router.replace({ name: 'home' })
    }
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
})
</script>

<template>
  <div class="admin-shell">
    <header class="shell-header">
      <div class="project-anchor">
        <button
          type="button"
          class="home-button"
          :aria-label="t('nav.projects')"
          :title="t('nav.projects')"
          @click="openProjects"
        >
          <el-icon><FolderOpened /></el-icon>
        </button>

        <el-select
          v-if="projectScoped"
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
            :label="project.projectName"
            :value="project.projectId"
          >
            <div class="project-option">
              <span>{{ project.projectName }}</span>
              <code>{{ project.projectId }}</code>
            </div>
          </el-option>
        </el-select>
        <button v-else type="button" class="projects-label" @click="openProjects">
          {{ t('nav.projects') }}
        </button>
      </div>

      <nav v-if="projectScoped" class="project-nav" :aria-label="t('shell.projectWorkspace')">
        <button
          v-for="item in projectNavigation"
          :key="item.section"
          type="button"
          :class="{ 'is-active': activeSection === item.section }"
          @click="openProjectSection(item.section)"
        >
          {{ item.label }}
        </button>
      </nav>
      <div v-else class="project-nav-placeholder" />

      <div class="header-actions">
        <LanguageToggle />
      </div>
    </header>

    <main class="shell-content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.admin-shell { min-height: 100vh; background: #f5f5f7; }
.shell-header {
  position: sticky;
  top: 0;
  z-index: 2000;
  display: grid;
  grid-template-columns: minmax(230px, 0.8fr) minmax(420px, 2fr) minmax(80px, 0.8fr);
  align-items: center;
  min-height: 58px;
  padding: 0 max(24px, calc((100vw - 1500px) / 2));
  color: #1d1d1f;
  background: rgba(250, 250, 252, 0.94);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  backdrop-filter: saturate(180%) blur(20px);
}
.project-anchor { display: flex; align-items: center; min-width: 0; gap: 8px; }
.home-button,
.projects-label,
.project-nav button {
  min-height: 36px;
  color: #515154;
  border: 0;
  background: transparent;
  cursor: pointer;
}
.home-button {
  display: grid;
  flex: 0 0 36px;
  place-items: center;
  width: 36px;
  padding: 0;
  border-radius: 9px;
  font-size: 18px;
}
.home-button:hover,
.projects-label:hover { color: #0066cc; background: #edf5fc; }
.projects-label { padding: 0 10px; border-radius: 8px; font-weight: 600; }
.project-switcher { width: min(250px, 24vw); }
.project-option { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.project-option code { color: #86868b; font-size: 11px; }
.project-nav { display: flex; align-self: stretch; justify-content: center; min-width: 0; overflow-x: auto; }
.project-nav button {
  flex: 0 0 auto;
  min-width: 82px;
  padding: 0 14px;
  border-bottom: 2px solid transparent;
  font-size: 13px;
  white-space: nowrap;
}
.project-nav button:hover { color: #0071e3; }
.project-nav button.is-active { color: #1d1d1f; border-bottom-color: #0071e3; font-weight: 600; }
.header-actions { display: flex; justify-content: flex-end; }
.shell-content { min-width: 0; padding: 30px 32px 56px; }

@media (max-width: 900px) {
  .shell-header {
    grid-template-columns: minmax(220px, 1fr) auto;
    min-height: 58px;
    padding: 0 16px;
  }
  .project-nav {
    grid-column: 1 / -1;
    grid-row: 2;
    height: 44px;
    margin: 0 -16px;
    border-top: 1px solid rgba(0, 0, 0, 0.06);
  }
  .project-nav-placeholder { display: none; }
  .project-switcher { width: min(260px, 54vw); }
  .shell-content { padding: 22px 16px 48px; }
}
</style>
