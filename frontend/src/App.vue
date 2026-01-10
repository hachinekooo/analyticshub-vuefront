<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <RouterView />
</template>

<style>
/* Global styles reset and defaults */
:root {
  --el-color-primary: #0071e3; /* Apple Blue */
  --el-color-success: #34c759; /* Apple Green */
  --el-color-warning: #ff9500; /* Apple Orange */
  --el-color-danger: #ff3b30;  /* Apple Red */
  --el-color-info: #86868b;    /* Apple Grey */
}

body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #f5f5f7;
  color: #1d1d1f;
}

#app {
  min-height: 100vh;
}
</style>
