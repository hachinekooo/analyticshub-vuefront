export type SelectableProject = {
  projectId: string
  isActive: boolean
}

/**
 * Selects a project only from the active projects returned by the backend.
 * Build-time defaults and route query values are preferences, never trusted IDs.
 */
export const resolveProjectSelection = <T extends SelectableProject>(
  projects: T[],
  routeProjectId = '',
  configuredProjectId = '',
) => {
  const activeProjects = projects.filter((project) => project.isActive)
  const preferredProjectId = [routeProjectId.trim(), configuredProjectId.trim()]
    .find((candidate) => candidate && activeProjects.some(
      (project) => project.projectId === candidate,
    ))
  const selectedProjectId = preferredProjectId || activeProjects[0]?.projectId || ''

  return { activeProjects, selectedProjectId }
}
