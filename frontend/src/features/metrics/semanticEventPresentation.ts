export interface SemanticEventPresentation {
  eventKey: string
  displayName?: Record<string, string> | null
  description?: string | null
  knownBusinessName?: boolean
}

export const uniqueSemanticEvents = (
  events: readonly SemanticEventPresentation[],
): SemanticEventPresentation[] => {
  const seen = new Set<string>()
  return events.filter((event) => {
    if (seen.has(event.eventKey)) return false
    seen.add(event.eventKey)
    return true
  })
}
