import { describe, expect, it } from 'vitest'
import { resolveProjectSelection } from './projectSelection'

const projects = [
  { projectId: 'inactive_project', isActive: false },
  { projectId: 'first_active', isActive: true },
  { projectId: 'preferred_active', isActive: true },
]

describe('resolveProjectSelection', () => {
  it('prefers a valid active route project', () => {
    expect(resolveProjectSelection(projects, 'preferred_active', 'first_active').selectedProjectId)
      .toBe('preferred_active')
  })

  it('uses a valid configured project when no route project exists', () => {
    expect(resolveProjectSelection(projects, '', 'preferred_active').selectedProjectId)
      .toBe('preferred_active')
  })

  it('falls back from an invalid route to a valid configured project', () => {
    expect(resolveProjectSelection(projects, 'missing_project', 'preferred_active').selectedProjectId)
      .toBe('preferred_active')
  })

  it('falls back to the first active project when no preference is valid', () => {
    expect(resolveProjectSelection(projects, 'inactive_project').selectedProjectId)
      .toBe('first_active')
  })

  it('returns no selection when there are no active projects', () => {
    expect(resolveProjectSelection([{ projectId: 'inactive', isActive: false }])).toEqual({
      activeProjects: [],
      selectedProjectId: '',
    })
  })
})
