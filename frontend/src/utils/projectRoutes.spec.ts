import { describe, expect, it } from 'vitest'
import { projectIdFromParam, projectRoute } from './projectRoutes'

describe('project routes', () => {
  it('builds canonical routes without query-string project state', () => {
    expect(projectRoute('sample_app', 'counters')).toEqual({
      name: 'counters',
      params: { projectId: 'sample_app' },
    })
  })

  it('rejects malformed route project ids', () => {
    expect(projectIdFromParam('sample_app')).toBe('sample_app')
    expect(projectIdFromParam('Sample App')).toBe('')
    expect(projectIdFromParam(['sample_app'])).toBe('')
  })
})
