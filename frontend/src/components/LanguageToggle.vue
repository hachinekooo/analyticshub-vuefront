<template>
  <el-dropdown trigger="click" @command="handleCommand">
    <el-button class="lang-button" text>
      <el-icon><Switch /></el-icon>
      <span>{{ currentLabel }}</span>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="en">English</el-dropdown-item>
        <el-dropdown-item command="zh">中文</el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/i18n'

const { locale, setLocale } = useI18n()

const currentLabel = computed(() => (locale.value === 'zh' ? '中文' : 'EN'))

const handleCommand = (command: string) => {
  if (command === 'en' || command === 'zh') {
    setLocale(command)
  }
}
</script>

<style scoped>
.lang-button {
  font-weight: 500;
  color: #1d1d1f;
}

.lang-button span {
  margin-left: 6px;
}
</style>
