export interface EventPropertiesPresentation {
  summary: string
  formatted: string
  hasValue: boolean
}

const EMPTY_PRESENTATION: EventPropertiesPresentation = {
  summary: '—',
  formatted: '—',
  hasValue: false,
}

const SUMMARY_LIMIT = 160

export const presentEventProperties = (value: Record<string, unknown> | null): EventPropertiesPresentation => {
  if (!value) return EMPTY_PRESENTATION

  try {
    const compact = JSON.stringify(value)
    const formatted = JSON.stringify(value, null, 2)
    if (!compact || !formatted) return EMPTY_PRESENTATION

    return {
      summary: compact.length > SUMMARY_LIMIT
        ? `${compact.slice(0, SUMMARY_LIMIT - 1)}…`
        : compact,
      formatted,
      hasValue: true,
    }
  } catch {
    return EMPTY_PRESENTATION
  }
}
