<template>
  <el-tooltip
    :content="content"
    placement="top"
    :show-after="250"
    popper-class="metric-help-tooltip"
  >
    <el-icon
      class="metric-help-icon"
      :aria-label="content"
      tabindex="0"
    >
      <InfoFilled />
    </el-icon>
  </el-tooltip>
</template>

<script setup lang="ts">
import { InfoFilled } from '@element-plus/icons-vue'

defineProps<{
  content: string
}>()
</script>

<style scoped>
.metric-help-icon {
  flex: 0 0 auto;
  color: var(--el-text-color-secondary);
  font-size: 14px;
  cursor: help;
  outline: none;
}

.metric-help-icon:hover,
.metric-help-icon:focus-visible {
  color: var(--el-color-primary);
}

:global(.metric-help-tooltip) {
  max-width: min(360px, calc(100vw - 32px));
  line-height: 1.55;
}
</style>
