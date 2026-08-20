<template>
  <span class="semantic-event-label">
    <span class="semantic-event-name">{{ visibleName }}</span>
    <MetricHelpIcon v-if="showHelp" :content="helpText" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MetricHelpIcon from '@/components/metrics/MetricHelpIcon.vue'
import { useI18n } from '@/i18n'

const props = withDefaults(defineProps<{
  eventKey: string
  displayName?: Record<string, string> | null
  description?: string | null
  knownBusinessName?: boolean
  showHelp?: boolean
}>(), {
  showHelp: true,
})

const { t, locale } = useI18n()

const localizedName = computed(() => {
  if (!props.displayName) return ''
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  return preferred.map((key) => props.displayName?.[key]).find(Boolean)
    || Object.values(props.displayName)[0]
    || ''
})

const readableFallback = computed(() => {
  const words = props.eventKey
    .replace(/^(core|custom)\./, '')
    .split(/[._:-]+/)
    .filter(Boolean)
  if (words.length === 0) return props.eventKey
  const phrase = words.join(' ')
  return locale.value === 'en'
    ? phrase.charAt(0).toUpperCase() + phrase.slice(1)
    : phrase
})

const visibleName = computed(() => localizedName.value || readableFallback.value)
const hasBusinessName = computed(() => props.knownBusinessName !== false && Boolean(localizedName.value))
const helpText = computed(() => {
  if (!hasBusinessName.value) return t('metrics.semanticLabel.unmappedHelp', { key: props.eventKey })
  const identityHelp = t('metrics.semanticLabel.knownHelp', { key: props.eventKey })
  return props.description?.trim() ? `${props.description.trim()} ${identityHelp}` : identityHelp
})
</script>

<style scoped>
.semantic-event-label {
  display: inline-flex;
  align-items: center;
  max-width: 100%;
  gap: 5px;
}

.semantic-event-name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
