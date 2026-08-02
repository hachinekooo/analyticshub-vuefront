export type ProjectSection = 'dashboard' | 'semantics' | 'counters' | 'privacy'

const sectionRouteNames: Record<ProjectSection, string> = {
  dashboard: 'metrics',
  semantics: 'semantics',
  counters: 'counters',
  privacy: 'privacy-requests',
}

/** Builds the canonical project-scoped admin route. */
export const projectRoute = (projectId: string, section: ProjectSection = 'dashboard') => ({
  name: sectionRouteNames[section],
  params: { projectId },
})

/** Returns a validated project id from a Vue Router param. */
export const projectIdFromParam = (value: unknown) =>
  typeof value === 'string' && /^[a-z0-9_-]{1,50}$/.test(value) ? value : ''
