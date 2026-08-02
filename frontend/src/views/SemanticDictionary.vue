<template>
  <div class="admin-container">
    <PageHeader :title="t('semantics.title')" :subtitle="t('semantics.subtitle')">
      <template #actions>
        <el-button type="primary" :disabled="!projectId" @click="openCreateDialog">
          <el-icon class="el-icon--left"><Plus /></el-icon>
          {{ t('semantics.actions.create') }}
        </el-button>
      </template>
    </PageHeader>

    <el-alert
      class="mapping-guide"
      type="info"
      :closable="false"
      show-icon
      :title="t('semantics.mappingGuide.title')"
      :description="t('semantics.mappingGuide.description')"
    />

    <div class="content-card toolbar">
      <el-input
        v-model="searchText"
        clearable
        :placeholder="t('semantics.searchPlaceholder')"
        class="dictionary-search"
      >
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="catalogFilter" class="mapping-filter">
        <el-option :label="t('semantics.filters.all')" value="all" />
        <el-option :label="t('semantics.filters.unmapped')" value="unmapped" />
        <el-option :label="t('semantics.filters.mapped')" value="mapped" />
      </el-select>
      <div class="summary-tags">
        <el-tag effect="plain">{{ t('semantics.summary.raw', { count: catalog.length }) }}</el-tag>
        <el-tag type="success" effect="plain">
          {{ t('semantics.summary.mapped', { count: mappedCount }) }}
        </el-tag>
        <el-tag type="info" effect="plain">
          {{ t('semantics.summary.definitions', { count: definitions.length }) }}
        </el-tag>
      </div>
      <el-button :aria-label="t('buttons.refresh')" :loading="loading" circle plain @click="refreshAll">
        <el-icon><Refresh /></el-icon>
      </el-button>
    </div>

    <div class="two-column-grid" v-loading="loading">
      <div class="content-card">
        <div class="section-header">
          <div>
            <h2>{{ t('semantics.catalog.title') }}</h2>
            <p>{{ t('semantics.catalog.help') }}</p>
          </div>
        </div>
        <el-table :data="filteredCatalog" size="small" height="620">
          <el-table-column prop="rawKey" :label="t('semantics.fields.rawKey')" min-width="170" show-overflow-tooltip />
          <el-table-column :label="t('semantics.fields.meaning')" min-width="170">
            <template #default="{ row }">
              <template v-if="row.mapped">
                <div class="primary-cell">{{ localizedName(row.displayName) }}</div>
                <code>{{ row.semanticKey }}</code>
              </template>
              <el-tag v-else type="warning" size="small">{{ t('semantics.unmapped') }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="eventCount" :label="t('tables.count')" width="90" />
          <el-table-column prop="lastSeenAt" :label="t('semantics.fields.lastSeen')" min-width="165">
            <template #default="{ row }">{{ formatDateTime(row.lastSeenAt) }}</template>
          </el-table-column>
          <el-table-column :label="t('buttons.actions')" width="100" fixed="right">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="openFromRaw(row.rawKey)">
                {{ row.mapped ? t('buttons.edit') : t('semantics.actions.map') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <div class="content-card">
        <div class="section-header">
          <div>
            <h2>{{ t('semantics.definitions.title') }}</h2>
            <p>{{ t('semantics.definitions.help') }}</p>
          </div>
        </div>
        <el-table :data="filteredDefinitions" size="small" height="620">
          <el-table-column :label="t('semantics.fields.meaning')" min-width="180">
            <template #default="{ row }">
              <div class="primary-cell">{{ localizedName(row.displayName) }}</div>
              <code>{{ row.semanticKey }}</code>
              <el-tag size="small" effect="plain" :type="row.origin === 'OFFICIAL' ? 'primary' : 'info'">
                {{ row.origin === 'OFFICIAL' ? t('semantics.origin.official') : t('semantics.origin.custom') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="category" :label="t('semantics.fields.category')" min-width="110">
            <template #default="{ row }">{{ row.category || '-' }}</template>
          </el-table-column>
          <el-table-column :label="t('semantics.fields.aliases')" min-width="210">
            <template #default="{ row }">
              <div class="alias-list">
                <el-tag v-for="alias in row.aliases.slice(0, 4)" :key="alias" size="small" effect="plain">
                  {{ alias }}
                </el-tag>
                <el-tag v-if="row.aliases.length > 4" size="small" type="info">
                  +{{ row.aliases.length - 4 }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column :label="t('tables.status')" width="90">
            <template #default="{ row }">
              <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                {{ row.isActive ? t('status.active') : t('status.inactive') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column :label="t('buttons.actions')" width="130" fixed="right">
            <template #default="{ row }">
              <el-button size="small" link type="primary" @click="openEditDialog(row)">
                {{ t('buttons.edit') }}
              </el-button>
              <el-button
                v-if="row.origin === 'CUSTOM'"
                size="small"
                link
                type="danger"
                @click="removeDefinition(row)"
              >
                {{ t('buttons.delete') }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <el-dialog
      v-model="mappingVisible"
      :title="t('semantics.mappingDialog.title')"
      width="560px"
    >
      <el-alert
        type="info"
        :closable="false"
        :title="t('semantics.mappingDialog.rawKey', { key: pendingRawKey })"
      />
      <el-form label-position="top" class="mapping-form">
        <el-form-item :label="t('semantics.mappingDialog.existingMeaning')" required>
          <el-select
            v-model="targetSemanticKey"
            filterable
            style="width: 100%"
            :placeholder="t('semantics.mappingDialog.selectMeaning')"
          >
            <el-option
            v-for="definition in activeDefinitions"
              :key="definition.semanticKey"
              :label="`${localizedName(definition.displayName)} · ${definition.semanticKey}`"
              :value="definition.semanticKey"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createMeaningFromPendingRaw">
          {{ t('semantics.mappingDialog.createNew') }}
        </el-button>
        <el-button type="primary" :loading="saving" :disabled="!targetSemanticKey" @click="mapToExistingMeaning">
          {{ t('semantics.mappingDialog.confirm') }}
        </el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="dialogVisible"
      :title="editingKey ? t('semantics.dialog.edit') : t('semantics.dialog.create')"
      width="620px"
    >
      <el-form :model="form" label-position="top">
        <el-form-item :label="t('semantics.fields.semanticKey')" required>
          <el-input v-model="form.semanticKey" :disabled="Boolean(editingKey)" maxlength="100" />
        </el-form-item>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item :label="t('semantics.fields.zhName')">
              <el-input v-model="form.zhName" maxlength="200" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="t('semantics.fields.enName')">
              <el-input v-model="form.enName" maxlength="200" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="t('semantics.fields.category')">
          <el-input v-model="form.category" maxlength="100" />
        </el-form-item>
        <el-form-item :label="t('semantics.fields.aliases')" required>
          <el-input
            v-model="form.aliasesText"
            type="textarea"
            :rows="5"
            :placeholder="t('semantics.dialog.aliasesHelp')"
          />
        </el-form-item>
        <el-form-item :label="t('semantics.fields.description')">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="1000" show-word-limit />
        </el-form-item>
        <el-form-item>
          <el-switch v-model="form.isActive" :active-text="t('status.active')" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" :loading="saving" @click="saveDefinition">{{ t('buttons.save') }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import { useI18n } from '@/i18n'
import { useProjectContextStore } from '@/stores/projectContext'
import { getApiErrorMessage as getErrorMessage } from '@/utils/apiError'
import { projectIdFromParam } from '@/utils/projectRoutes'
import {
  deleteSemanticDefinition,
  getEventCatalog,
  getSemanticDefinitions,
  upsertSemanticDefinition,
  type EventCatalogEntry,
  type SemanticDefinition,
} from '@/api/semantic'

const { t, locale } = useI18n()
const route = useRoute()
const projectContext = useProjectContextStore()
const { selectedProjectId } = storeToRefs(projectContext)
const routeProjectId = computed(() => projectIdFromParam(route.params.projectId))
const projectId = ref('')
const catalog = ref<EventCatalogEntry[]>([])
const definitions = ref<SemanticDefinition[]>([])
const searchText = ref('')
const catalogFilter = ref<'all' | 'mapped' | 'unmapped'>('all')
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const mappingVisible = ref(false)
const editingKey = ref('')
const pendingRawKey = ref('')
const targetSemanticKey = ref('')
let refreshGeneration = 0

const form = reactive({
  semanticKey: '',
  zhName: '',
  enName: '',
  category: '',
  description: '',
  aliasesText: '',
  isActive: true,
})

const mappedCount = computed(() => catalog.value.filter((item) => item.mapped).length)
const activeDefinitions = computed(() => definitions.value.filter((item) => item.isActive))
const normalizedSearch = computed(() => searchText.value.trim().toLowerCase())
const filteredCatalog = computed(() => catalog.value.filter((item) => {
  if (catalogFilter.value === 'mapped' && !item.mapped) return false
  if (catalogFilter.value === 'unmapped' && item.mapped) return false
  if (!normalizedSearch.value) return true
  return [item.rawKey, item.semanticKey, localizedName(item.displayName), item.category]
    .some((value) => value?.toLowerCase().includes(normalizedSearch.value))
}))
const filteredDefinitions = computed(() => definitions.value.filter((item) => {
  if (!normalizedSearch.value) return true
  return [item.semanticKey, localizedName(item.displayName), item.category, ...item.aliases]
    .some((value) => value?.toLowerCase().includes(normalizedSearch.value))
}))

const localizedName = (names: Record<string, string> | null) => {
  if (!names) return '-'
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  for (const key of preferred) {
    if (names[key]) return names[key]
  }
  return Object.values(names)[0] || '-'
}

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const refreshAll = async () => {
  if (!projectId.value) return
  const requestedProjectId = projectId.value
  const generation = ++refreshGeneration
  loading.value = true
  try {
    const [catalogResponse, definitionsResponse] = await Promise.all([
      getEventCatalog(requestedProjectId),
      getSemanticDefinitions(requestedProjectId),
    ])
    if (generation !== refreshGeneration || projectId.value !== requestedProjectId) return
    catalog.value = catalogResponse.data.data.items
    definitions.value = definitionsResponse.data.data.items
  } catch (error) {
    if (generation === refreshGeneration && projectId.value === requestedProjectId) {
      ElMessage.error(getErrorMessage(error, t('semantics.errors.loadFailed')))
    }
  } finally {
    if (generation === refreshGeneration && projectId.value === requestedProjectId) loading.value = false
  }
}

const handleProjectChange = async () => {
  refreshGeneration += 1
  catalog.value = []
  definitions.value = []
  loading.value = false
  await refreshAll()
}

const resetForm = () => {
  editingKey.value = ''
  Object.assign(form, {
    semanticKey: '',
    zhName: '',
    enName: '',
    category: '',
    description: '',
    aliasesText: '',
    isActive: true,
  })
}

const openCreateDialog = () => {
  resetForm()
  form.semanticKey = 'custom.'
  dialogVisible.value = true
}

const openEditDialog = (definition: SemanticDefinition) => {
  editingKey.value = definition.semanticKey
  Object.assign(form, {
    semanticKey: definition.semanticKey,
    zhName: definition.displayName['zh-CN'] || definition.displayName.zh || '',
    enName: definition.displayName.en || '',
    category: definition.category || '',
    description: definition.description || '',
    aliasesText: definition.aliases.join('\n'),
    isActive: definition.isActive,
  })
  dialogVisible.value = true
}

const suggestedSemanticKey = (rawKey: string) => {
  const normalized = rawKey.toLowerCase().replace(/[^a-z0-9._-]+/g, '_').replace(/^[_-]+/, '')
  return `custom.${normalized || 'event'}`.slice(0, 100)
}

const openFromRaw = (rawKey: string) => {
  const existing = definitions.value.find((definition) => definition.aliases.includes(rawKey))
  if (existing) {
    openEditDialog(existing)
    return
  }
  if (activeDefinitions.value.length > 0) {
    pendingRawKey.value = rawKey
    targetSemanticKey.value = ''
    mappingVisible.value = true
    return
  }
  openCreateFromRaw(rawKey)
}

const openCreateFromRaw = (rawKey: string) => {
  resetForm()
  form.semanticKey = suggestedSemanticKey(rawKey)
  form.aliasesText = rawKey
  dialogVisible.value = true
}

const createMeaningFromPendingRaw = () => {
  const rawKey = pendingRawKey.value
  mappingVisible.value = false
  openCreateFromRaw(rawKey)
}

const mapToExistingMeaning = async () => {
  const definition = definitions.value.find((item) => item.semanticKey === targetSemanticKey.value)
  if (!definition || !pendingRawKey.value) return
  saving.value = true
  try {
    await upsertSemanticDefinition(projectId.value, definition.semanticKey, {
      sourceKind: definition.sourceKind,
      displayName: definition.displayName,
      category: definition.category || undefined,
      description: definition.description || undefined,
      isActive: definition.isActive,
      aliasMode: 'REPLACE',
      aliases: Array.from(new Set([...definition.aliases, pendingRawKey.value])),
    })
    ElMessage.success(t('semantics.messages.saved'))
    mappingVisible.value = false
    await refreshAll()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('semantics.errors.saveFailed')))
  } finally {
    saving.value = false
  }
}

const parseAliases = () => Array.from(new Set(
  form.aliasesText
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean),
))

const saveDefinition = async () => {
  const semanticKey = form.semanticKey.trim()
  const displayName: Record<string, string> = {}
  if (form.zhName.trim()) displayName['zh-CN'] = form.zhName.trim()
  if (form.enName.trim()) displayName.en = form.enName.trim()
  if (!semanticKey || Object.keys(displayName).length === 0) {
    ElMessage.warning(t('semantics.errors.required'))
    return
  }
  if (!editingKey.value && !/^custom\.[a-z0-9][a-z0-9._-]*$/.test(semanticKey)) {
    ElMessage.warning(t('semantics.errors.customNamespace'))
    return
  }

  saving.value = true
  try {
    await upsertSemanticDefinition(projectId.value, semanticKey, {
      sourceKind: 'EVENT_TYPE',
      displayName,
      category: form.category.trim() || undefined,
      description: form.description.trim() || undefined,
      isActive: form.isActive,
      aliasMode: 'REPLACE',
      aliases: parseAliases(),
    })
    ElMessage.success(t('semantics.messages.saved'))
    dialogVisible.value = false
    await refreshAll()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('semantics.errors.saveFailed')))
  } finally {
    saving.value = false
  }
}

const removeDefinition = async (definition: SemanticDefinition) => {
  try {
    await ElMessageBox.confirm(
      t('semantics.dialog.deleteMessage', { key: definition.semanticKey }),
      t('semantics.dialog.deleteTitle'),
      { type: 'warning', confirmButtonText: t('buttons.delete'), cancelButtonText: t('buttons.cancel') },
    )
    await deleteSemanticDefinition(projectId.value, definition.semanticKey)
    ElMessage.success(t('semantics.messages.deleted'))
    await refreshAll()
  } catch (error) {
    if (error === 'cancel' || error === 'close') return
    ElMessage.error(getErrorMessage(error, t('semantics.errors.deleteFailed')))
  }
}

watch(routeProjectId, async (nextProjectId) => {
  if (!nextProjectId || nextProjectId === projectId.value) return
  projectContext.selectProject(nextProjectId)
  projectId.value = nextProjectId
  await handleProjectChange()
})

onMounted(async () => {
  try {
    await projectContext.ensureLoaded(routeProjectId.value)
    projectId.value = routeProjectId.value || selectedProjectId.value
    await refreshAll()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
})
</script>

<style scoped>
.admin-container { max-width: 1600px; margin: 0 auto; color: #1d1d1f; }
.content-card { background: rgba(255, 255, 255, 0.88); border: 1px solid rgba(0, 0, 0, 0.05); border-radius: 18px; box-shadow: 0 10px 28px rgba(0, 0, 0, 0.04); }
.section-header p { margin: 8px 0 0; color: #86868b; font-size: 14px; }
.toolbar, .summary-tags { display: flex; align-items: center; gap: 12px; }
.mapping-guide { margin-bottom: 18px; }
.mapping-form { margin-top: 18px; }
.toolbar { padding: 16px 20px; margin-bottom: 20px; }
.dictionary-search { width: min(360px, 35vw); }
.mapping-filter { width: 150px; }
.summary-tags { flex: 1; }
.two-column-grid { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr); gap: 20px; }
.content-card { padding: 20px; min-width: 0; }
.section-header { min-height: 64px; }
.section-header h2 { margin: 0; font-size: 20px; }
.primary-cell { font-weight: 600; margin-bottom: 4px; }
code { color: #5f6368; font-size: 12px; }
.alias-list { display: flex; gap: 5px; flex-wrap: wrap; }
@media (max-width: 1100px) {
  .two-column-grid { grid-template-columns: 1fr; }
  .toolbar { align-items: flex-start; flex-wrap: wrap; }
  .dictionary-search { width: 100%; }
}
</style>
