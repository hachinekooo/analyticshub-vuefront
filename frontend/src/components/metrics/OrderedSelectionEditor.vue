<script setup lang="ts">
import { computed } from 'vue'

export type OrderedSelectionOption = {
  key: string
  label: string
  description?: string
  disabled?: boolean
  disabledReason?: string
}

const props = defineProps<{
  modelValue: string[]
  options: OrderedSelectionOption[]
  placeholder: string
  emptyText: string
  moveUpLabel: string
  moveDownLabel: string
  loading?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const selection = computed({
  get: () => props.modelValue,
  set: (value: string[]) => emit('update:modelValue', [...new Set(value)]),
})
const optionByKey = computed(() => new Map(props.options.map(option => [option.key, option])))
const selectedOptions = computed(() => props.modelValue.map(key => optionByKey.value.get(key) ?? {
  key,
  label: key,
  disabledReason: '',
}))

const move = (index: number, offset: -1 | 1) => {
  const target = index + offset
  if (target < 0 || target >= props.modelValue.length) return
  const reordered = [...props.modelValue]
  const [value] = reordered.splice(index, 1)
  reordered.splice(target, 0, value!)
  emit('update:modelValue', reordered)
}
</script>

<template>
  <div class="ordered-selection-editor">
    <el-select
      v-model="selection"
      multiple
      filterable
      clearable
      :loading="loading"
      style="width: 100%"
      :placeholder="placeholder"
    >
      <el-option
        v-for="option in options"
        :key="option.key"
        :label="option.label"
        :value="option.key"
        :disabled="option.disabled"
      >
        <div class="selection-option">
          <span>{{ option.label }}</span>
          <small v-if="option.disabledReason">{{ option.disabledReason }}</small>
        </div>
      </el-option>
    </el-select>

    <div v-if="selectedOptions.length" class="selected-order">
      <article
        v-for="(option, index) in selectedOptions"
        :key="option.key"
        :class="{ 'is-unavailable': option.disabled }"
      >
        <div>
          <div class="selection-heading">
            <strong>{{ option.label }}</strong>
            <span v-if="option.disabledReason" class="selection-status">
              {{ option.disabledReason }}
            </span>
          </div>
          <small v-if="option.description">{{ option.description }}</small>
        </div>
        <div class="order-actions">
          <el-button
            size="small"
            text
            :disabled="index === 0"
            :aria-label="moveUpLabel"
            @click="move(index, -1)"
          >↑</el-button>
          <el-button
            size="small"
            text
            :disabled="index === selectedOptions.length - 1"
            :aria-label="moveDownLabel"
            @click="move(index, 1)"
          >↓</el-button>
        </div>
      </article>
    </div>
    <p v-else class="selection-empty">{{ emptyText }}</p>
  </div>
</template>

<style scoped>
.ordered-selection-editor { width: 100%; }
.selection-option,
.selected-order article,
.order-actions,
.selection-heading { display: flex; align-items: center; }
.selection-option { justify-content: space-between; gap: 16px; }
.selection-option small { color: var(--el-text-color-placeholder); }
.selected-order { margin-top: 10px; border: 1px solid var(--el-border-color-lighter); border-radius: 10px; }
.selected-order article { min-height: 46px; justify-content: space-between; gap: 12px; padding: 7px 10px; }
.selected-order article + article { border-top: 1px solid var(--el-border-color-lighter); }
.selected-order article.is-unavailable { background: var(--el-color-warning-light-9); }
.selection-heading { flex-wrap: wrap; gap: 6px; }
.selection-status {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--el-color-warning-light-8);
  color: var(--el-color-warning-dark-2);
  font-size: 10px;
  font-weight: 600;
}
.selected-order strong,
.selected-order small { display: block; }
.selected-order strong { color: var(--el-text-color-primary); font-size: 13px; }
.selected-order small { margin-top: 2px; color: var(--el-text-color-secondary); font-size: 11px; }
.order-actions { flex: 0 0 auto; }
.order-actions :deep(.el-button) { margin: 0; font-size: 16px; }
.selection-empty { margin: 10px 0 0; color: var(--el-text-color-secondary); font-size: 12px; }
</style>
