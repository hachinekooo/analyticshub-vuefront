export type UserJourneyWindow = 'nearby' | 'twoHours' | 'day' | 'week'

export interface UserJourneyWindowOption {
  key: UserJourneyWindow
  beforeMinutes: number
  afterMinutes: number
}

export const USER_JOURNEY_WINDOWS: readonly UserJourneyWindowOption[] = [
  { key: 'nearby', beforeMinutes: 15, afterMinutes: 15 },
  { key: 'twoHours', beforeMinutes: 60, afterMinutes: 60 },
  { key: 'day', beforeMinutes: 12 * 60, afterMinutes: 12 * 60 },
  { key: 'week', beforeMinutes: 3 * 24 * 60 + 12 * 60, afterMinutes: 3 * 24 * 60 + 12 * 60 },
]

export const journeyWindowOption = (key: UserJourneyWindow): UserJourneyWindowOption =>
  USER_JOURNEY_WINDOWS.find((option) => option.key === key) ?? USER_JOURNEY_WINDOWS[1]!

export const buildUserJourneyQuery = (input: {
  projectId: string
  anchorEventId: string
  window: UserJourneyWindow
}) => {
  const window = journeyWindowOption(input.window)
  return {
    projectId: input.projectId,
    anchorEventId: input.anchorEventId,
    beforeMinutes: window.beforeMinutes,
    afterMinutes: window.afterMinutes,
  }
}
