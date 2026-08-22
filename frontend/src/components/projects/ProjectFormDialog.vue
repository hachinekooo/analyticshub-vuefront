<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useI18n } from '@/i18n'
import type { Project, ProjectAnalysisTemplate } from '@/api/admin'

const props = defineProps<{
  modelValue: boolean
  project: Project | null
  saving: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  submit: [value: Partial<Project>]
}>()

const { t } = useI18n()
const step = ref(1)
const isEdit = computed(() => Boolean(props.project))
const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const emptyForm = (): Partial<Project> => ({
  projectId: '',
  projectName: '',
  analysisTemplate: 'app',
  dbHost: 'localhost',
  dbPort: 5432,
  dbName: '',
  dbSchema: 'analytics',
  dbUser: '',
  dbPassword: '',
  tablePrefix: 'analytics_',
  isActive: true,
})

const form = reactive<Partial<Project>>(emptyForm())
const templates: Array<{
  value: ProjectAnalysisTemplate
  titleKey: string
  descriptionKey: string
}> = [
  { value: 'app', titleKey: 'projectTemplates.app', descriptionKey: 'projectTemplates.appDescription' },
  { value: 'website', titleKey: 'projectTemplates.website', descriptionKey: 'projectTemplates.websiteDescription' },
  { value: 'webapp', titleKey: 'projectTemplates.webapp', descriptionKey: 'projectTemplates.webappDescription' },
  { value: 'blank', titleKey: 'projectTemplates.blank', descriptionKey: 'projectTemplates.blankDescription' },
]

const reset = () => {
  Object.assign(form, emptyForm(), props.project ? { ...props.project, dbPassword: '' } : {})
  step.value = 1
}

watch(() => props.modelValue, (open) => {
  if (open) reset()
}, { immediate: true })

const validateStep = () => {
  if (step.value === 1 && (!form.projectId?.trim() || !form.projectName?.trim())) {
    ElMessage.warning(t('projectWizard.errors.basicRequired'))
    return false
  }
  if (step.value === 2 && !form.analysisTemplate) {
    ElMessage.warning(t('projectWizard.errors.templateRequired'))
    return false
  }
  if (step.value === 3 && (!form.dbHost?.trim() || !form.dbName?.trim() || !form.dbUser?.trim())) {
    ElMessage.warning(t('projectWizard.errors.databaseRequired'))
    return false
  }
  return true
}

const next = () => {
  if (!validateStep()) return
  if (step.value < 3) {
    step.value += 1
    return
  }
  emit('submit', { ...form })
}

const back = () => {
  if (step.value > 1) {
    step.value -= 1
  } else {
    visible.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? t('dialogs.editProject') : t('dialogs.addProject')"
    width="680px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div class="wizard-progress" aria-label="Project setup progress">
      <div v-for="index in 3" :key="index" :class="{ active: index === step, done: index < step }">
        <span>{{ index }}</span>
        {{ t(`projectWizard.steps.${index}`) }}
      </div>
    </div>

    <el-form :model="form" label-position="top" class="project-form">
      <section v-if="step === 1">
        <h3>{{ t('projectWizard.basicTitle') }}</h3>
        <p>{{ t('projectWizard.basicDescription') }}</p>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('form.projectName')" required>
              <el-input v-model="form.projectName" :placeholder="t('form.placeholders.projectName')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('form.projectId')" required>
              <el-input v-model="form.projectId" :disabled="isEdit" :placeholder="t('form.placeholders.projectId')" />
            </el-form-item>
          </el-col>
        </el-row>
      </section>

      <section v-else-if="step === 2">
        <h3>{{ t('projectWizard.templateTitle') }}</h3>
        <p>{{ t('projectWizard.templateDescription') }}</p>
        <el-alert
          class="template-guidance"
          type="info"
          :closable="false"
          show-icon
          :title="t(isEdit ? 'projectWizard.templateEditHint' : 'projectWizard.templateCreateHint')"
        />
        <div class="template-grid">
          <button
            v-for="template in templates"
            :key="template.value"
            type="button"
            :class="{ selected: form.analysisTemplate === template.value }"
            :aria-pressed="form.analysisTemplate === template.value"
            @click="form.analysisTemplate = template.value"
          >
            <strong>{{ t(template.titleKey) }}</strong>
            <span>{{ t(template.descriptionKey) }}</span>
          </button>
        </div>
      </section>

      <section v-else>
        <h3>{{ t('projectWizard.databaseTitle') }}</h3>
        <p>{{ t('projectWizard.databaseDescription') }}</p>
        <div class="creation-summary">
          <span>{{ form.projectName }}</span>
          <code>{{ form.projectId }}</code>
          <span>{{ t(`projectTemplates.${form.analysisTemplate}`) }}</span>
        </div>
        <el-row :gutter="16">
          <el-col :span="16">
            <el-form-item :label="t('form.dbHost')" required>
              <el-input v-model="form.dbHost" :placeholder="t('form.placeholders.dbHost')" />
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="t('form.port')">
              <el-input-number v-model="form.dbPort" :min="1" :max="65535" style="width: 100%" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('form.dbName')" required>
              <el-input v-model="form.dbName" :placeholder="t('form.placeholders.dbName')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('form.dbSchema')">
              <el-input v-model="form.dbSchema" :placeholder="t('form.placeholders.dbSchema')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('form.username')" required>
              <el-input v-model="form.dbUser" :placeholder="t('form.placeholders.username')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('form.password')">
              <el-input
                v-model="form.dbPassword"
                type="password"
                show-password
                :placeholder="isEdit ? t('form.placeholders.passwordEdit') : t('form.placeholders.password')"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('form.tablePrefix')">
              <el-input v-model="form.tablePrefix" :placeholder="t('form.placeholders.tablePrefix')" />
            </el-form-item>
          </el-col>
          <el-col v-if="isEdit" :span="12">
            <el-form-item :label="t('form.status')">
              <el-switch v-model="form.isActive" :active-text="t('status.active')" />
            </el-form-item>
          </el-col>
        </el-row>
      </section>
    </el-form>

    <template #footer>
      <div class="wizard-footer">
        <el-button @click="back">
          {{ step === 1 ? t('buttons.cancel') : t('projectWizard.previous') }}
        </el-button>
        <el-button type="primary" :loading="saving" @click="next">
          {{ step === 3 ? t('buttons.save') : t('projectWizard.next') }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.wizard-progress { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 24px; }
.wizard-progress div { padding-top: 10px; color: #86868b; border-top: 3px solid #d8d8dc; font-size: 12px; }
.wizard-progress div.active { color: #0066cc; border-color: #0071e3; font-weight: 600; }
.wizard-progress div.done { color: #397549; border-color: #72b883; }
.wizard-progress span { margin-right: 4px; }
.project-form section { min-height: 310px; }
.project-form h3 { margin: 0 0 6px; font-size: 19px; }
.project-form section > p { margin: 0 0 20px; color: #6e6e73; font-size: 13px; line-height: 1.5; }
.template-guidance { margin: -6px 0 16px; }
.template-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.template-grid button { min-height: 126px; padding: 16px; text-align: left; border: 1px solid #d2d2d7; border-radius: 12px; background: #fafafa; cursor: pointer; }
.template-grid button:hover { border-color: #8fc7ff; }
.template-grid button.selected { border-color: #0071e3; background: #f5faff; box-shadow: 0 0 0 2px rgba(0, 113, 227, 0.12); }
.template-grid strong,
.template-grid span { display: block; }
.template-grid strong { margin-bottom: 7px; color: #1d1d1f; }
.template-grid span { color: #6e6e73; font-size: 12px; line-height: 1.5; }
.creation-summary { display: flex; align-items: center; gap: 8px; margin: -4px 0 18px; padding: 10px 12px; background: #f5f5f7; border-radius: 9px; font-size: 12px; }
.creation-summary code { color: #6e6e73; }
.wizard-footer { display: flex; justify-content: space-between; }
@media (max-width: 640px) {
  .template-grid { grid-template-columns: 1fr; }
  .project-form section { min-height: 0; }
}
</style>
