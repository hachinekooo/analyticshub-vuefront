import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const getProjectsMock = vi.hoisted(() => vi.fn())
vi.mock('@/api/admin', () => ({ getProjects: getProjectsMock }))

import { useProjectContextStore } from './projectContext'

const projects = [
  {
    id: 1,
    projectId: 'project_a',
    projectName: 'Project A',
    analysisTemplate: 'app',
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'project_a',
    dbSchema: 'analytics',
    dbUser: 'project_a',
    tablePrefix: 'analytics_',
    isActive: true,
  },
  {
    id: 2,
    projectId: 'project_disabled',
    projectName: 'Disabled',
    analysisTemplate: 'website',
    dbHost: 'localhost',
    dbPort: 5432,
    dbName: 'disabled',
    dbSchema: 'analytics',
    dbUser: 'disabled',
    tablePrefix: 'analytics_',
    isActive: false,
  },
]

describe('projectContext store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    getProjectsMock.mockReset()
    getProjectsMock.mockResolvedValue({ data: { data: projects } })
  })

  it('loads the shared project list once for concurrent page initialization', async () => {
    const store = useProjectContextStore()

    await Promise.all([store.ensureLoaded('project_a'), store.ensureLoaded('project_a')])

    expect(getProjectsMock).toHaveBeenCalledTimes(1)
    expect(store.selectedProjectId).toBe('project_a')
    expect(store.activeProjects).toHaveLength(1)
  })

  it('does not switch the workspace to an inactive or unknown project', async () => {
    const store = useProjectContextStore()
    await store.ensureLoaded('project_a')

    store.selectProject('project_disabled')
    store.selectProject('missing')

    expect(store.selectedProjectId).toBe('project_a')
  })
})
