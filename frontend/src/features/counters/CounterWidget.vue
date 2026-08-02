<template>
  <div class="counter-widget" v-loading="loading">
    <div class="widget-header">
      <span>{{ title }}</span>
      <el-button size="small" type="primary" plain @click="showCreateDialog">
        <el-icon class="el-icon--left"><Plus /></el-icon>
        {{ t('metrics.createCounter') }}
      </el-button>
    </div>

    <el-table :data="visibleCounters" size="small" style="width: 100%">
      <el-table-column :label="t('metrics.counterFields.displayName')" min-width="170" show-overflow-tooltip>
        <template #default="{ row }">
          {{ localizedText(row.displayName) || '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="key" :label="t('metrics.counterFields.key')" min-width="190" show-overflow-tooltip>
        <template #default="{ row }"><code>{{ row.key }}</code></template>
      </el-table-column>
      <el-table-column :label="t('tables.value')" min-width="120">
        <template #default="{ row }">
          {{ row.value }}<span v-if="localizedText(row.unit)"> {{ localizedText(row.unit) }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="t('metrics.counterFields.countingPolicy')" min-width="150">
        <template #default="{ row }">
          <template v-if="row.eventTrigger">
            <el-tag size="small" effect="plain">
              {{ t(`metrics.counterFields.historyModes.${row.historyMode}`) }}
            </el-tag>
            <span v-if="row.rebuildOffset" class="counter-offset">
              {{ t('metrics.counterFields.offsetValue', { value: signedNumber(row.rebuildOffset) }) }}
            </span>
          </template>
          <span v-else>{{ t('metrics.counterFields.manualPolicy') }}</span>
        </template>
      </el-table-column>
      <el-table-column :label="t('tables.lastRebuiltAt')" min-width="170">
        <template #default="{ row }">
          {{ row.lastRebuiltAt ? formatTimestamp(row.lastRebuiltAt) : t('metrics.neverRebuilt') }}
        </template>
      </el-table-column>
      <el-table-column :label="t('metrics.counterFields.rebuildEventCount')" min-width="120">
        <template #default="{ row }">{{ row.lastRebuildEventCount ?? '-' }}</template>
      </el-table-column>
      <el-table-column :label="t('buttons.actions')" min-width="170">
        <template #default="{ row }">
          <el-button-group>
            <el-button
              v-if="!row.eventTrigger"
              :aria-label="t('buttons.increment')"
              size="small"
              type="primary"
              link
              :icon="Plus"
              @click="increment(row)"
            />
            <el-button
              :aria-label="t('buttons.edit')"
              size="small"
              type="success"
              link
              :icon="Edit"
              @click="showEditDialog(row)"
            />
            <el-button
              v-if="row.eventTrigger"
              size="small"
              type="warning"
              link
              :icon="Refresh"
              :loading="rebuildingKey === row.key"
              :aria-label="t('buttons.rebuild')"
              :title="t('buttons.rebuild')"
              @click="rebuild(row)"
            />
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      v-model="dialogVisible"
      :title="editingKey ? t('metrics.editCounter') : t('metrics.createCounter')"
      width="760px"
    >
      <el-form :model="form" label-position="top">
        <div class="form-section-heading">
          <strong>{{ t('metrics.counterSections.basic') }}</strong>
          <span>{{ t('metrics.counterSections.basicHelp') }}</span>
        </div>
        <el-form-item :label="t('metrics.counterFields.key')">
          <el-input v-model="form.key" :disabled="Boolean(editingKey)" maxlength="100" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('metrics.counterFields.displayNameZh')">
              <el-input v-model="form.displayNameZh" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('metrics.counterFields.displayNameEn')">
              <el-input v-model="form.displayNameEn" maxlength="200" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('metrics.counterFields.unitZh')">
              <el-input v-model="form.unitZh" maxlength="50" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('metrics.counterFields.unitEn')">
              <el-input v-model="form.unitEn" maxlength="50" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="t('metrics.counterFields.description')">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="1000" show-word-limit />
        </el-form-item>

        <div class="form-section-heading with-divider">
          <strong>{{ t('metrics.counterSections.rule') }}</strong>
          <span>{{ t('metrics.counterSections.ruleHelp') }}</span>
        </div>
        <el-form-item :label="t('metrics.counterFields.triggerMode')">
          <el-select v-model="triggerDraft.mode" style="width: 100%" @change="changeTriggerMode">
            <el-option :label="t('metrics.counterFields.sharedRule')" value="shared" />
            <el-option :label="t('metrics.counterFields.anyOfRule')" value="anyOf" />
          </el-select>
        </el-form-item>
        <template v-if="triggerDraft.mode === 'shared'">
          <el-form-item :label="t('metrics.counterFields.eventType')">
            <el-select
              v-model="triggerDraft.semanticKeys"
              multiple
              filterable
              clearable
              style="width: 100%"
              :placeholder="t('metrics.counterFields.eventTypePlaceholder')"
            >
              <el-option
                v-for="definition in semanticDefinitions"
                :key="definition.semanticKey"
                :label="semanticOptionLabel(definition)"
                :value="definition.semanticKey"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('metrics.counterFields.conditions')">
            <el-input
              v-model="triggerDraft.conditionsText"
              type="textarea"
              :rows="5"
              :placeholder="t('metrics.counterFields.conditionsPlaceholder')"
            />
          </el-form-item>
        </template>
        <template v-else>
          <div class="counter-clause-list">
            <div
              v-for="(clause, clauseIndex) in triggerDraft.clauses"
              :key="clauseIndex"
              class="counter-clause"
            >
              <div class="counter-clause-header">
                <strong>{{ t('metrics.counterFields.clauseLabel', { index: clauseIndex + 1 }) }}</strong>
                <el-button type="danger" link @click="removeClause(clauseIndex)">
                  {{ t('metrics.counterFields.removeClause') }}
                </el-button>
              </div>
              <el-form-item :label="t('metrics.counterFields.clauseEventType')" required>
                <el-select
                  v-model="clause.semanticKey"
                  filterable
                  style="width: 100%"
                  :placeholder="t('metrics.counterFields.clauseEventTypePlaceholder')"
                >
                  <el-option
                    v-for="definition in semanticDefinitions"
                    :key="definition.semanticKey"
                    :label="semanticOptionLabel(definition)"
                    :value="definition.semanticKey"
                  />
                </el-select>
              </el-form-item>
              <el-form-item :label="t('metrics.counterFields.clauseConditions')">
                <el-input
                  v-model="clause.conditionsText"
                  type="textarea"
                  :rows="3"
                  :placeholder="t('metrics.counterFields.conditionsPlaceholder')"
                />
              </el-form-item>
            </div>
          </div>
          <el-button type="primary" plain :disabled="triggerDraft.clauses.length >= 100" @click="addClause">
            <el-icon class="el-icon--left"><Plus /></el-icon>
            {{ t('metrics.counterFields.addClause') }}
          </el-button>
        </template>

        <div v-if="hasEventRule" class="counter-policy-card">
          <div class="form-section-heading">
            <strong>{{ t('metrics.counterSections.initialization') }}</strong>
            <span>{{ t('metrics.counterSections.initializationHelp') }}</span>
          </div>
          <el-form-item :label="t('metrics.counterFields.historyMode')">
            <el-radio-group v-model="form.historyMode" class="history-mode-group">
              <el-radio-button label="INCLUDE_EXISTING">
                {{ t('metrics.counterFields.historyModes.INCLUDE_EXISTING') }}
              </el-radio-button>
              <el-radio-button label="START_FROM_NOW">
                {{ t('metrics.counterFields.historyModes.START_FROM_NOW') }}
              </el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item :label="t('metrics.counterFields.rebuildOffset')">
            <el-input-number v-model="form.rebuildOffset" style="width: 220px" />
            <span class="field-help">{{ t('metrics.counterFields.rebuildOffsetHelp') }}</span>
          </el-form-item>
          <el-alert
            type="info"
            :closable="false"
            show-icon
            :title="policySummary"
            :description="t('metrics.counterFields.autoRebuildHelp')"
          />
        </div>

        <el-form-item v-else :label="t('metrics.counterFields.manualValue')" class="manual-value-field">
          <el-input-number v-model="form.value" style="width: 220px" />
          <span class="field-help">{{ t('metrics.counterFields.manualValueHelp') }}</span>
        </el-form-item>

        <el-form-item>
          <el-switch v-model="form.isPublic" :active-text="t('tables.isPublic')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button v-if="editingKey" type="danger" :loading="deleting" @click="remove">
          {{ t('buttons.delete') }}
        </el-button>
        <el-button @click="dialogVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="save">{{ t('buttons.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { Edit, Plus, Refresh } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ElRadioButton, ElRadioGroup } from 'element-plus'
import { useI18n } from '@/i18n'
import { getApiErrorMessage } from '@/utils/apiError'
import {
  buildCounterEventTriggerPatch,
  createCounterEventTriggerDraft,
  type CounterTriggerMode,
} from './eventTrigger'
import { resolveCounterSavePolicy } from './counterPolicy'
import {
  deleteCounter,
  getCounters,
  incrementCounter,
  rebuildCounter,
  upsertCounter,
  type CounterEventTrigger,
  type CounterHistoryMode,
  type CounterItem,
  type CounterUpsertPayload,
} from '@/api/metrics'
import { getSemanticDefinitions, type SemanticDefinition } from '@/api/semantic'

const props = defineProps<{
  projectId: string
  title: string
  configuredKeys?: unknown
  refreshToken: number
}>()

const { locale, t } = useI18n()
const counters = ref<CounterItem[]>([])
const semanticDefinitions = ref<SemanticDefinition[]>([])
const loading = ref(false)
const dialogVisible = ref(false)
const editingKey = ref('')
const saving = ref(false)
const deleting = ref(false)
const rebuildingKey = ref('')
const originalValue = ref(0)
const originalTrigger = ref<CounterEventTrigger | null>(null)
const originalHistoryMode = ref<CounterHistoryMode>('INCLUDE_EXISTING')
const originalRebuildOffset = ref(0)
const originalLastRebuiltAt = ref<string | null>(null)
const form = reactive({
  key: '',
  value: 0,
  isPublic: false,
  displayNameZh: '',
  displayNameEn: '',
  unitZh: '',
  unitEn: '',
  description: '',
  historyMode: 'INCLUDE_EXISTING' as CounterHistoryMode,
  rebuildOffset: 0,
})
const triggerDraft = reactive(createCounterEventTriggerDraft(null))

const configuredKeySet = computed(() => Array.isArray(props.configuredKeys)
  ? new Set(props.configuredKeys.filter((key): key is string => typeof key === 'string'))
  : null)
const visibleCounters = computed(() => configuredKeySet.value
  ? counters.value.filter((counter) => configuredKeySet.value!.has(counter.key))
  : counters.value)
const hasEventRule = computed(() => triggerDraft.mode === 'shared'
  ? triggerDraft.semanticKeys.some((key) => key.trim())
  : triggerDraft.clauses.some((clause) => clause.semanticKey.trim()))
const signedNumber = (value: number) => value > 0 ? `+${value}` : String(value)
const policySummary = computed(() => form.historyMode === 'INCLUDE_EXISTING'
  ? t('metrics.counterFields.includeHistoryFormula', { offset: signedNumber(form.rebuildOffset) })
  : t('metrics.counterFields.startNowFormula', { offset: signedNumber(form.rebuildOffset) }))

const localizedText = (value: Record<string, string> | string | null) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  for (const key of preferred) {
    if (value[key]) return value[key]
  }
  return Object.values(value)[0] || ''
}

const semanticOptionLabel = (definition: SemanticDefinition) => {
  const name = localizedText(definition.displayName)
  return name ? `${name} · ${definition.semanticKey}` : definition.semanticKey
}

const formatTimestamp = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

const load = async () => {
  const projectId = props.projectId
  if (!projectId) {
    counters.value = []
    return
  }
  loading.value = true
  try {
    const response = await getCounters({ projectId })
    if (props.projectId === projectId) counters.value = response.data.data.items
  } catch (error) {
    if (props.projectId === projectId) {
      ElMessage.error(getApiErrorMessage(error, t('errors.countersFailed')))
    }
  } finally {
    if (props.projectId === projectId) loading.value = false
  }
}

const loadSemanticDefinitions = async () => {
  const projectId = props.projectId
  if (!projectId) return
  try {
    const response = await getSemanticDefinitions(projectId)
    if (props.projectId === projectId) {
      semanticDefinitions.value = response.data.data.items.filter((item) => item.isActive)
    }
  } catch {
    if (props.projectId === projectId) semanticDefinitions.value = []
  }
}

const formText = (value: Record<string, string> | string | null, keys: string[]) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  for (const key of keys) {
    if (value[key]) return value[key]
  }
  return ''
}

const resetForm = (counter?: CounterItem) => {
  editingKey.value = counter?.key ?? ''
  originalValue.value = counter?.value ?? 0
  originalTrigger.value = counter?.eventTrigger ?? null
  originalHistoryMode.value = counter?.historyMode ?? 'INCLUDE_EXISTING'
  originalRebuildOffset.value = counter?.rebuildOffset ?? 0
  originalLastRebuiltAt.value = counter?.lastRebuiltAt ?? null
  Object.assign(form, {
    key: counter?.key ?? '',
    value: counter?.value ?? 0,
    isPublic: counter?.isPublic ?? false,
    displayNameZh: formText(counter?.displayName ?? null, ['zh-CN', 'zh', 'default']),
    displayNameEn: formText(counter?.displayName ?? null, ['en', 'default']),
    unitZh: formText(counter?.unit ?? null, ['zh-CN', 'zh', 'default']),
    unitEn: formText(counter?.unit ?? null, ['en', 'default']),
    description: counter?.description ?? '',
    historyMode: counter?.historyMode ?? 'INCLUDE_EXISTING',
    rebuildOffset: counter?.rebuildOffset ?? 0,
  })
  Object.assign(triggerDraft, createCounterEventTriggerDraft(counter?.eventTrigger))
}

const showCreateDialog = () => {
  resetForm()
  dialogVisible.value = true
  void loadSemanticDefinitions()
}

const showEditDialog = (counter: CounterItem) => {
  resetForm(counter)
  dialogVisible.value = true
  void loadSemanticDefinitions()
}

const addClause = () => {
  if (triggerDraft.clauses.length < 100) {
    triggerDraft.clauses.push({ semanticKey: '', conditionsText: '' })
  }
}

const removeClause = (index: number) => triggerDraft.clauses.splice(index, 1)

const changeTriggerMode = (mode: CounterTriggerMode) => {
  if (mode === 'anyOf' && triggerDraft.clauses.length === 0) addClause()
}

const save = async () => {
  const projectId = props.projectId
  const key = form.key.trim()
  if (!projectId || !key) {
    ElMessage.warning(t('metrics.counterErrors.keyRequired'))
    return
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,99}$/.test(key)) {
    ElMessage.warning(t('metrics.counterErrors.invalidKey'))
    return
  }

  const triggerResult = buildCounterEventTriggerPatch(originalTrigger.value, triggerDraft)
  if ('error' in triggerResult) {
    const params = triggerResult.clauseIndex === undefined
      ? undefined
      : { index: triggerResult.clauseIndex + 1 }
    ElMessage.warning(t(`metrics.counterErrors.${triggerResult.error}`, params))
    return
  }

  const displayName: Record<string, string> = {}
  if (form.displayNameZh.trim()) displayName.zh = form.displayNameZh.trim()
  if (form.displayNameEn.trim()) displayName.en = form.displayNameEn.trim()
  const unit: Record<string, string> = {}
  if (form.unitZh.trim()) unit.zh = form.unitZh.trim()
  if (form.unitEn.trim()) unit.en = form.unitEn.trim()
  const payload: CounterUpsertPayload = {
    displayName,
    unit,
    isPublic: form.isPublic,
    description: form.description.trim(),
    ...triggerResult.patch,
  }
  const ruleChanged = Boolean(triggerResult.patch.eventTrigger || triggerResult.patch.clearEventTrigger)
  const savePolicy = resolveCounterSavePolicy({
    isEditing: Boolean(editingKey.value),
    hasEventRule: hasEventRule.value,
    ruleChanged,
    value: form.value,
    originalValue: originalValue.value,
    historyMode: form.historyMode,
    originalHistoryMode: originalHistoryMode.value,
    rebuildOffset: form.rebuildOffset,
    originalRebuildOffset: originalRebuildOffset.value,
    lastRebuiltAt: originalLastRebuiltAt.value,
  })
  Object.assign(payload, savePolicy.patch)

  saving.value = true
  try {
    await upsertCounter(key, projectId, payload)
    if (props.projectId !== projectId) return
    if (savePolicy.shouldRebuild) {
      try {
        const rebuilt = await rebuildCounter(key, { projectId })
        if (props.projectId !== projectId) return
        ElMessage.success(t('metrics.counterMessages.savedAndRebuilt', {
          value: rebuilt.data.data.value,
        }))
      } catch (error) {
        ElMessage.warning(t('metrics.counterMessages.savedButRebuildFailed', {
          message: getApiErrorMessage(error, t('errors.counterRebuildFailed')),
        }))
      }
    } else {
      ElMessage.success(t('metrics.counterMessages.saved'))
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, t('metrics.counterErrors.saveFailed')))
  } finally {
    saving.value = false
  }
}

const remove = async () => {
  const projectId = props.projectId
  const key = editingKey.value
  if (!projectId || !key) return
  try {
    await ElMessageBox.confirm(
      t('metrics.counterMessages.deleteConfirm', { key }),
      t('dialogs.confirmDeleteTitle'),
      { type: 'warning', confirmButtonText: t('buttons.delete'), cancelButtonText: t('buttons.cancel') },
    )
  } catch {
    return
  }

  deleting.value = true
  try {
    await deleteCounter(key, { projectId })
    if (props.projectId !== projectId) return
    ElMessage.success(t('metrics.counterMessages.deleted'))
    dialogVisible.value = false
    await load()
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, t('metrics.counterErrors.deleteFailed')))
  } finally {
    deleting.value = false
  }
}

const increment = async (counter: CounterItem) => {
  const projectId = props.projectId
  try {
    await incrementCounter(counter.key, { projectId })
    if (props.projectId !== projectId) return
    ElMessage.success(t('messages.counterIncremented'))
    await load()
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, t('errors.networkFailed')))
  }
}

const rebuild = async (counter: CounterItem) => {
  if (!counter.eventTrigger || rebuildingKey.value) return
  try {
    await ElMessageBox.confirm(
      t('dialogs.confirmCounterRebuildMessage', { key: counter.key }),
      t('dialogs.confirmCounterRebuildTitle'),
      {
        confirmButtonText: t('dialogs.confirmCounterRebuildOk'),
        cancelButtonText: t('buttons.cancel'),
        type: 'warning',
      },
    )
  } catch {
    return
  }

  rebuildingKey.value = counter.key
  const projectId = props.projectId
  try {
    const response = await rebuildCounter(counter.key, { projectId })
    if (props.projectId !== projectId) return
    ElMessage.success(t('messages.counterRebuilt', { value: response.data.data.value }))
    await load()
  } catch (error) {
    ElMessage.error(getApiErrorMessage(error, t('errors.counterRebuildFailed')))
  } finally {
    rebuildingKey.value = ''
  }
}

watch(() => props.projectId, () => {
  dialogVisible.value = false
  void load()
}, { immediate: true })

watch(() => props.refreshToken, () => {
  void load()
})
</script>

<style scoped>
.counter-widget {
  min-width: 0;
}

.widget-header {
  min-height: 32px;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-weight: 600;
}

.counter-offset {
  display: block;
  margin-top: 5px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.form-section-heading {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 14px;
}

.form-section-heading strong {
  color: var(--el-text-color-primary);
  font-size: 15px;
}

.form-section-heading span,
.field-help {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.form-section-heading.with-divider {
  margin-top: 6px;
  padding-top: 18px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.counter-policy-card {
  margin: 18px 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.history-mode-group {
  display: flex;
}

.history-mode-group :deep(.el-radio-button) {
  flex: 1;
}

.history-mode-group :deep(.el-radio-button__inner) {
  width: 100%;
}

.field-help {
  margin-left: 12px;
  line-height: 1.5;
}

.manual-value-field {
  margin-top: 18px;
  padding: 16px;
  border-radius: 10px;
  background: var(--el-fill-color-lighter);
}

.counter-clause-list {
  display: grid;
  gap: 12px;
  margin-bottom: 12px;
}

.counter-clause {
  padding: 12px 14px 2px;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: var(--el-fill-color-lighter);
}

.counter-clause-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
</style>
