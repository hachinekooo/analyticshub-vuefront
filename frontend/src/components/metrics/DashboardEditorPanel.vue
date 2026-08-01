<script setup lang="ts">
import { useI18n } from '@/i18n'

type WidgetOption = { type: string; label: string }

defineProps<{
  visible: boolean
  currentWidgets: WidgetOption[]
  availableWidgets: WidgetOption[]
  customWidgetCount: number
  saving: boolean
}>()

const emit = defineEmits<{
  add: [type: string]
  reset: []
  save: []
  finish: []
}>()

const { t } = useI18n()
</script>

<template>
  <section v-if="visible" class="editor-panel">
    <div class="editor-intro">
      <div>
        <span class="eyebrow">{{ t('metrics.customization.eyebrow') }}</span>
        <h2>{{ t('metrics.customization.title') }}</h2>
        <p>{{ t('metrics.customization.description') }}</p>
      </div>
      <div class="editor-actions">
        <el-button @click="emit('reset')">
          <el-icon class="el-icon--left"><Brush /></el-icon>
          {{ t('metrics.resetLayout') }}
        </el-button>
        <el-button type="primary" :loading="saving" @click="emit('save')">
          <el-icon class="el-icon--left"><Finished /></el-icon>
          {{ t('metrics.saveDashboard') }}
        </el-button>
        <el-button type="primary" plain @click="emit('finish')">
          {{ t('buttons.finishEditing') }}
        </el-button>
      </div>
    </div>

    <div class="editor-grid">
      <div class="editor-section">
        <h3>{{ t('metrics.customization.current') }}</h3>
        <p>{{ t('metrics.customization.dragHelp') }}</p>
        <div class="widget-tags">
          <el-tag v-for="widget in currentWidgets" :key="widget.type" effect="plain">
            {{ widget.label }}
          </el-tag>
        </div>
      </div>
      <div class="editor-section">
        <h3>{{ t('metrics.customization.library') }}</h3>
        <p>{{ t('metrics.customization.registered', { count: customWidgetCount }) }}</p>
        <p class="extension-help">{{ t('metrics.customization.extensionHelp') }}</p>
        <div v-if="availableWidgets.length" class="widget-library">
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
        <el-empty v-else :description="t('metrics.customization.allAdded')" :image-size="48" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor-panel {
  margin-bottom: 16px;
  padding: 16px 18px;
  color: #1d1d1f;
  background: rgba(255, 255, 255, 0.94);
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.editor-intro,
.editor-actions,
.editor-grid,
.widget-tags { display: flex; gap: 12px; }
.editor-intro { align-items: flex-start; justify-content: space-between; }
.editor-actions { flex-wrap: wrap; }
.eyebrow { color: #0071e3; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; }
h2 { margin: 4px 0; color: #1d1d1f; font-size: 19px; letter-spacing: -0.01em; }
h3 { margin: 0 0 6px; color: #1d1d1f; font-size: 13px; }
p { margin: 0; color: #6e6e73; font-size: 12px; line-height: 1.5; }
.editor-grid { margin-top: 14px; }
.editor-section { flex: 1; min-width: 0; padding: 13px 14px; background: #f5f5f7; border: 1px solid rgba(0, 0, 0, 0.06); border-radius: 10px; }
.widget-tags { margin-top: 12px; flex-wrap: wrap; }
.widget-library { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 12px; }
.extension-help { margin-top: 4px; }
.widget-library button { display: flex; align-items: center; gap: 8px; padding: 9px 10px; color: #0066cc; text-align: left; border: 1px solid rgba(0, 113, 227, 0.22); border-radius: 8px; background: white; cursor: pointer; }
.widget-library button:hover { border-color: #0071e3; background: #f0f7ff; }
@media (max-width: 900px) {
  .editor-intro,
  .editor-grid { flex-direction: column; }
}
</style>
