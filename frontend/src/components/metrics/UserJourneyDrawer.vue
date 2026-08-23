<template>
  <el-drawer
    v-model="visible"
    :size="'min(720px, 94vw)'"
    :destroy-on-close="false"
    class="user-journey-drawer"
  >
    <template #header>
      <div class="journey-heading">
        <div>
          <h2>{{ t('metrics.userJourney.title') }}</h2>
          <p>{{ t('metrics.userJourney.subtitle') }}</p>
        </div>
        <el-tag v-if="journey" effect="plain">
          {{ t(`metrics.userJourney.subject.${journey.subjectType}`) }}
        </el-tag>
      </div>
    </template>

    <div class="journey-toolbar">
      <el-radio-group
        :model-value="windowKey"
        size="small"
        :aria-label="t('metrics.userJourney.windowLabel')"
        @update:model-value="updateWindow"
      >
        <el-radio-button
          v-for="option in USER_JOURNEY_WINDOWS"
          :key="option.key"
          :value="option.key"
        >
          {{ t(`metrics.userJourney.windows.${option.key}`) }}
        </el-radio-button>
      </el-radio-group>
      <div class="journey-toolbar-actions">
        <el-button
          size="small"
          :aria-expanded="detailsExpanded"
          @click="detailsExpanded = !detailsExpanded"
        >
          {{ detailsExpanded
            ? t('metrics.userJourney.collapseDetails')
            : t('metrics.userJourney.expandDetails') }}
        </el-button>
        <el-button size="small" :loading="loading" @click="emit('reload')">
          {{ t('buttons.refresh') }}
        </el-button>
      </div>
    </div>

    <div v-if="journey" class="journey-summary">
      <div class="journey-summary-identity">
        <span>{{ t('metrics.userJourney.identity') }}</span>
        <code>{{ journey.resolvedActorId || anchorEvent?.deviceId || '—' }}</code>
      </div>
      <div>
        <span>{{ t('metrics.userJourney.eventCount') }}</span>
        <strong>{{ journey.total }}</strong>
      </div>
      <div class="journey-summary-range">
        <span>{{ t('metrics.userJourney.range') }}</span>
        <strong>{{ formatRange(journey.rangeStart, journey.rangeEnd) }}</strong>
      </div>
    </div>

    <el-alert
      v-if="journey?.truncated"
      type="warning"
      :closable="false"
      show-icon
      :title="t('metrics.userJourney.truncated', { total: journey.total })"
      class="journey-limit-alert"
    />

    <div v-loading="loading" class="journey-content">
      <el-empty
        v-if="!loading && (!journey || journey.items.length === 0)"
        :description="t('metrics.userJourney.empty')"
        :image-size="72"
      />

      <el-timeline v-else-if="journey">
        <el-timeline-item
          v-for="(event, index) in journey.items"
          :key="event.eventId"
          :timestamp="formatTimestamp(event.eventTimestamp)"
          :type="event.eventId === journey.anchorEventId ? 'primary' : undefined"
          :hollow="event.eventId !== journey.anchorEventId"
          placement="top"
        >
          <article
            class="journey-event"
            :class="{ 'is-anchor': event.eventId === journey.anchorEventId }"
          >
            <header>
              <el-tag
                class="journey-event-order"
                size="small"
                effect="plain"
                :aria-label="t('metrics.userJourney.sequence', { position: index + 1 })"
                :title="t('metrics.userJourney.sequence', { position: index + 1 })"
              >
                #{{ index + 1 }}
              </el-tag>
              <SemanticEventLabel v-bind="presentEvent(event.eventType)" :show-help="false" />
              <el-tag v-if="event.eventId === journey.anchorEventId" size="small" type="primary">
                {{ t('metrics.userJourney.selectedEvent') }}
              </el-tag>
            </header>
            <div class="journey-event-meta">
              <el-tag size="small" effect="plain">
                {{ identityScopeLabel(event.identityScope) }}
              </el-tag>
              <span v-if="event.sessionId">
                {{ t('metrics.userJourney.session') }}
                <code :title="event.sessionId">{{ compactIdentifier(event.sessionId) }}</code>
              </span>
            </div>
            <pre v-if="detailsExpanded && event.properties" class="journey-event-properties">{{
              formattedPropertiesByEvent.get(event.eventId)
            }}</pre>
            <el-button
              v-else-if="detailsExpanded && event.propertiesDeferred && event.propertiesLoadable"
              class="journey-deferred-properties"
              size="small"
              :loading="propertiesLoadingEventIds.includes(event.eventId)"
              @click="emit('loadProperties', event.eventId)"
            >
              {{ t('metrics.userJourney.loadCompleteProperties') }}
            </el-button>
            <p
              v-else-if="detailsExpanded && event.propertiesDeferred"
              class="journey-properties-unavailable"
            >
              {{ t('metrics.userJourney.propertiesTooLarge', {
                size: formatByteCount(event.propertiesBytes),
              }) }}
            </p>
          </article>
        </el-timeline-item>
      </el-timeline>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElRadioButton, ElRadioGroup } from 'element-plus'
import type { EventJourney, EventRecord } from '@/api/metrics'
import SemanticEventLabel from '@/components/metrics/SemanticEventLabel.vue'
import type { SemanticEventPresentation } from '@/features/metrics/semanticEventPresentation'
import {
  USER_JOURNEY_WINDOWS,
  type UserJourneyWindow,
} from '@/features/metrics/userJourney'
import { useI18n } from '@/i18n'

const props = defineProps<{
  modelValue: boolean
  anchorEvent: EventRecord | null
  journey: EventJourney | null
  loading: boolean
  windowKey: UserJourneyWindow
  propertiesLoadingEventIds: string[]
  presentEvent: (eventKey: string) => SemanticEventPresentation
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:windowKey': [value: UserJourneyWindow]
  reload: []
  loadProperties: [eventId: string]
}>()

const { t, locale } = useI18n()
const detailsExpanded = ref(true)
const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const dateTimeFormatter = computed(() => new Intl.DateTimeFormat(
  locale.value === 'zh' ? 'zh-CN' : 'en',
  { dateStyle: 'medium', timeStyle: 'medium' },
))

const formatTimestamp = (timestamp: number) => dateTimeFormatter.value.format(new Date(timestamp))
const formatRange = (start: string, end: string) =>
  `${dateTimeFormatter.value.format(new Date(start))} – ${dateTimeFormatter.value.format(new Date(end))}`

const byteCountFormatter = computed(() => new Intl.NumberFormat(
  locale.value === 'zh' ? 'zh-CN' : 'en',
  { maximumFractionDigits: 1 },
))
const formatByteCount = (bytes: number) => {
  if (bytes < 1024) return `${byteCountFormatter.value.format(bytes)} B`
  if (bytes < 1024 * 1024) return `${byteCountFormatter.value.format(bytes / 1024)} KB`
  return `${byteCountFormatter.value.format(bytes / (1024 * 1024))} MB`
}

const identityScopeLabel = (scope: string | null) => {
  if (scope === 'anonymous') return t('metrics.analyticsIdentity.anonymous')
  if (scope === 'cloud_account') return t('metrics.analyticsIdentity.cloudAccount')
  return t('metrics.analyticsIdentity.unknown')
}

const compactIdentifier = (value: string) =>
  value.length <= 14 ? value : `${value.slice(0, 6)}…${value.slice(-6)}`

const formattedPropertiesByEvent = computed(() => new Map(
  (props.journey?.items ?? [])
    .filter(event => event.properties)
    .map(event => [event.eventId, JSON.stringify(event.properties, null, 2)]),
))

watch(
  () => [props.modelValue, props.anchorEvent?.eventId] as const,
  ([isVisible]) => {
    if (isVisible) detailsExpanded.value = true
  },
)

const updateWindow = (value: string | number | boolean | undefined) => {
  if (typeof value !== 'string') return
  if (!USER_JOURNEY_WINDOWS.some((option) => option.key === value)) return
  emit('update:windowKey', value as UserJourneyWindow)
}
</script>

<style scoped>
.journey-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding-right: 8px;
}

.journey-heading h2 {
  margin: 0;
  color: var(--el-text-color-primary);
  font-size: 18px;
}

.journey-heading p {
  margin: 5px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.5;
}

.journey-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.journey-toolbar-actions {
  display: flex;
  flex: 0 0 auto;
}

.journey-summary {
  display: grid;
  grid-template-columns: minmax(100px, auto) minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.journey-summary-identity {
  grid-column: 1 / -1;
}

.journey-summary > div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 4px;
}

.journey-summary span {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.journey-summary code,
.journey-summary strong {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.journey-summary .journey-summary-range strong {
  overflow: visible;
  line-height: 1.4;
  text-overflow: clip;
  white-space: normal;
}

.journey-limit-alert {
  margin-bottom: 16px;
}

.journey-content {
  min-height: 180px;
}

:deep(.journey-content .el-timeline-item__timestamp) {
  overflow: visible;
  line-height: 1.4;
  text-overflow: clip;
  white-space: normal;
}

.journey-event {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color);
}

.journey-event.is-anchor {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.journey-event header,
.journey-event-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.journey-event header {
  justify-content: space-between;
}

.journey-event-meta {
  flex-wrap: wrap;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.journey-event-meta code {
  color: var(--el-text-color-regular);
}

.journey-event-properties {
  margin: 0;
  padding: 10px 12px;
  overflow: auto;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  line-height: 1.55;
  overflow-wrap: anywhere;
  tab-size: 2;
  white-space: pre-wrap;
}

.journey-deferred-properties {
  align-self: flex-start;
}

.journey-properties-unavailable {
  margin: 10px 0 0;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

@media (max-width: 640px) {
  .journey-summary {
    grid-template-columns: 1fr;
  }

  .journey-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
