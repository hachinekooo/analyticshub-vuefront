import { ref } from 'vue'
import {
  getEventJourney,
  getEventProperties,
  type EventJourney,
  type EventRecord,
} from '@/api/metrics'
import { buildUserJourneyQuery, type UserJourneyWindow } from './userJourney'

type UserJourneyLoadFailure = 'journey' | 'properties'

export interface UseUserJourneyOptions {
  projectId: () => string
  onLoadFailure: (error: unknown, kind: UserJourneyLoadFailure) => void
}

/**
 * 管理单次用户旅程的请求与页面生命周期。
 * 页面只负责打开抽屉；本组合函数负责丢弃切换项目、锚点或关闭抽屉后的过期响应。
 */
export const useUserJourney = ({ projectId, onLoadFailure }: UseUserJourneyOptions) => {
  const visible = ref(false)
  const loading = ref(false)
  const anchor = ref<EventRecord | null>(null)
  const journey = ref<EventJourney | null>(null)
  const windowKey = ref<UserJourneyWindow>('twoHours')
  const propertiesLoadingEventIds = ref<string[]>([])
  let requestGeneration = 0

  const load = async () => {
    const requestAnchor = anchor.value
    const requestProjectId = projectId()
    if (!requestAnchor || !requestProjectId) return

    const generation = ++requestGeneration
    loading.value = true
    try {
      const response = await getEventJourney(buildUserJourneyQuery({
        projectId: requestProjectId,
        anchorEventId: requestAnchor.eventId,
        window: windowKey.value,
      }))
      if (generation !== requestGeneration
        || requestProjectId !== projectId()
        || requestAnchor.eventId !== anchor.value?.eventId) return
      journey.value = response.data.data
    } catch (error) {
      if (generation === requestGeneration) onLoadFailure(error, 'journey')
    } finally {
      if (generation === requestGeneration) loading.value = false
    }
  }

  const open = (event: EventRecord) => {
    requestGeneration += 1
    anchor.value = event
    journey.value = null
    windowKey.value = 'twoHours'
    propertiesLoadingEventIds.value = []
    visible.value = true
    void load()
  }

  const loadProperties = async (eventId: string) => {
    const requestJourney = journey.value
    const requestProjectId = projectId()
    if (!requestJourney || !requestProjectId || propertiesLoadingEventIds.value.includes(eventId)) return

    const generation = requestGeneration
    propertiesLoadingEventIds.value = [...propertiesLoadingEventIds.value, eventId]
    try {
      const response = await getEventProperties({ projectId: requestProjectId, eventId })
      if (generation !== requestGeneration
        || requestProjectId !== projectId()
        || requestJourney.anchorEventId !== journey.value?.anchorEventId) return
      journey.value = {
        ...journey.value,
        items: journey.value.items.map(item => item.eventId === eventId
          ? { ...item, properties: response.data.data.properties, propertiesDeferred: false }
          : item),
      }
    } catch (error) {
      if (generation === requestGeneration) onLoadFailure(error, 'properties')
    } finally {
      if (generation === requestGeneration) {
        propertiesLoadingEventIds.value = propertiesLoadingEventIds.value
          .filter(loadingEventId => loadingEventId !== eventId)
      }
    }
  }

  const setVisible = (nextVisible: boolean) => {
    visible.value = nextVisible
    if (nextVisible) return
    requestGeneration += 1
    loading.value = false
    propertiesLoadingEventIds.value = []
  }

  const updateWindow = (nextWindow: UserJourneyWindow) => {
    if (windowKey.value === nextWindow) return
    windowKey.value = nextWindow
    journey.value = null
    void load()
  }

  const clearProjectState = () => {
    setVisible(false)
    anchor.value = null
    journey.value = null
    windowKey.value = 'twoHours'
  }

  return {
    visible,
    loading,
    anchor,
    journey,
    windowKey,
    propertiesLoadingEventIds,
    load,
    open,
    loadProperties,
    setVisible,
    updateWindow,
    clearProjectState,
  }
}
