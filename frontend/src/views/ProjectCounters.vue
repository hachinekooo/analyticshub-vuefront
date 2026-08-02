<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import CounterWidget from '@/features/counters/CounterWidget.vue'
import PageHeader from '@/components/PageHeader.vue'
import { useI18n } from '@/i18n'
import { useProjectContextStore } from '@/stores/projectContext'
import { projectIdFromParam } from '@/utils/projectRoutes'

const { t } = useI18n()
const route = useRoute()
const projectContext = useProjectContextStore()
const { activeProjects } = storeToRefs(projectContext)
const projectId = computed(() => projectIdFromParam(route.params.projectId))
const project = computed(() => activeProjects.value.find((item) => item.projectId === projectId.value))
const title = computed(() => project.value
  ? t('counters.pageTitleWithProject', { project: project.value.projectName })
  : t('counters.pageTitle'))

</script>

<template>
  <div class="counter-page">
    <PageHeader :title="title" :subtitle="t('counters.pageSubtitle')" />
    <section class="counter-card">
      <CounterWidget :project-id="projectId" :title="t('metrics.counters')" :refresh-token="0" />
    </section>
  </div>
</template>

<style scoped>
.counter-page { max-width: 1400px; margin: 0 auto; color: #1d1d1f; }
.counter-card {
  padding: 20px;
  background: white;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
</style>
