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
        <el-button type="success" :loading="saving" @click="emit('save')">
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
  margin-bottom: 22px;
  padding: 20px;
  color: #e2e8f0;
  background: linear-gradient(135deg, #172033, #111827);
  border-radius: 16px;
  box-shadow: 0 16px 38px rgba(15, 23, 42, 0.18);
}
.editor-intro,
.editor-actions,
.editor-grid,
.widget-tags { display: flex; gap: 12px; }
.editor-intro { align-items: flex-start; justify-content: space-between; }
.editor-actions { flex-wrap: wrap; }
.eyebrow { color: #60a5fa; font-size: 11px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; }
h2 { margin: 6px 0; color: white; font-size: 21px; }
h3 { margin: 0 0 6px; color: white; font-size: 14px; }
p { margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.6; }
.editor-grid { margin-top: 20px; }
.editor-section { flex: 1; min-width: 0; padding: 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; }
.widget-tags { margin-top: 12px; flex-wrap: wrap; }
.widget-library { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px; margin-top: 12px; }
.extension-help { margin-top: 4px; }
.widget-library button { display: flex; align-items: center; gap: 8px; padding: 10px; color: #dbeafe; text-align: left; border: 1px solid rgba(96, 165, 250, 0.25); border-radius: 9px; background: rgba(37, 99, 235, 0.12); cursor: pointer; }
.widget-library button:hover { background: rgba(37, 99, 235, 0.28); }
@media (max-width: 900px) {
  .editor-intro,
  .editor-grid { flex-direction: column; }
}
</style>
