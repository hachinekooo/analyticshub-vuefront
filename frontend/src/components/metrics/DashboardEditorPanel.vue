<script setup lang="ts">
import { useI18n } from '@/i18n'

type WidgetOption = { type: string; label: string }

defineProps<{
  visible: boolean
  availableWidgets: WidgetOption[]
  saving: boolean
}>()

const emit = defineEmits<{
  add: [type: string]
  reset: []
  cancel: []
  complete: []
}>()

const { t } = useI18n()
</script>

<template>
  <section v-if="visible" class="editor-panel">
    <div class="editor-toolbar">
      <div>
        <h2>{{ t('metrics.customization.editingTitle') }}</h2>
        <p>{{ t('metrics.customization.dragHelp') }}</p>
      </div>
      <div class="editor-actions">
        <el-button @click="emit('reset')">
          <el-icon class="el-icon--left"><Brush /></el-icon>
          {{ t('metrics.resetLayout') }}
        </el-button>
        <el-button @click="emit('cancel')">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="emit('complete')">
          <el-icon class="el-icon--left"><Finished /></el-icon>
          {{ t('buttons.finishEditing') }}
        </el-button>
      </div>
    </div>

    <div v-if="availableWidgets.length" class="widget-library">
      <span class="library-label">{{ t('metrics.customization.library') }}</span>
      <button
        v-for="widget in availableWidgets"
        :key="widget.type"
        type="button"
        @click="emit('add', widget.type)"
      >
        <el-icon><Plus /></el-icon>
        <span>{{ widget.label }}</span>
      </button>
    </div>
  </section>
</template>

<style scoped>
.editor-panel {
  margin-bottom: 16px;
  padding: 15px 18px;
  color: #1d1d1f;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.editor-toolbar,
.editor-actions,
.widget-library { display: flex; align-items: center; gap: 10px; }
.editor-toolbar { justify-content: space-between; }
h2 { margin: 0 0 4px; font-size: 16px; letter-spacing: -0.01em; }
p { margin: 0; color: #6e6e73; font-size: 12px; line-height: 1.45; }
.editor-actions { flex-wrap: wrap; justify-content: flex-end; }
.widget-library { margin-top: 13px; padding-top: 12px; border-top: 1px solid rgba(0, 0, 0, 0.07); flex-wrap: wrap; }
.library-label { margin-right: 2px; color: #6e6e73; font-size: 12px; font-weight: 600; }
.widget-library button {
  display: inline-flex;
  align-items: center;
  min-height: 34px;
  gap: 7px;
  padding: 6px 10px;
  color: #0066cc;
  border: 1px solid rgba(0, 113, 227, 0.22);
  border-radius: 8px;
  background: white;
  cursor: pointer;
}
.widget-library button:hover { border-color: #0071e3; background: #f0f7ff; }
@media (max-width: 760px) {
  .editor-toolbar { align-items: flex-start; flex-direction: column; }
  .editor-actions { width: 100%; justify-content: flex-start; }
}
</style>
