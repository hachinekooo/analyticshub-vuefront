import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getProjects, type Project } from '@/api/admin'
import { resolveProjectSelection } from '@/utils/projectSelection'

export const useProjectContextStore = defineStore('project-context', () => {
  const projects = ref<Project[]>([])
  const selectedProjectId = ref('')
  const loading = ref(false)
  const loaded = ref(false)
  let activeLoad: Promise<void> | null = null

  const activeProjects = computed(() => projects.value.filter((project) => project.isActive))
  const selectedProject = computed(() =>
    activeProjects.value.find((project) => project.projectId === selectedProjectId.value) ?? null,
  )

  const selectProject = (projectId: string) => {
    if (!projectId) {
      selectedProjectId.value = ''
      return
    }
    if (activeProjects.value.some((project) => project.projectId === projectId)) {
      selectedProjectId.value = projectId
    }
  }

  const reload = (preferredProjectId = selectedProjectId.value) => {
    if (activeLoad) {
      return activeLoad.then(() => {
        if (preferredProjectId) selectProject(preferredProjectId)
      })
    }
    loading.value = true
    activeLoad = (async () => {
      const response = await getProjects()
      projects.value = response.data.data
      const selection = resolveProjectSelection(
        projects.value,
        preferredProjectId,
        import.meta.env.VITE_DEFAULT_PROJECT_ID || '',
      )
      selectedProjectId.value = selection.selectedProjectId
      loaded.value = true
    })()
    return activeLoad.finally(() => {
      loading.value = false
      activeLoad = null
    })
  }

  const ensureLoaded = async (preferredProjectId = '') => {
    if (!loaded.value) {
      await reload(preferredProjectId)
      return
    }
    if (preferredProjectId) selectProject(preferredProjectId)
  }

  return {
    projects,
    activeProjects,
    selectedProject,
    selectedProjectId,
    loading,
    loaded,
    ensureLoaded,
    reload,
    selectProject,
  }
})
