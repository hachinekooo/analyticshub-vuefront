

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import {
  ElAlert,
  ElButton,
  ElButtonGroup,
  ElCol,
  ElConfigProvider,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElLoading,
  ElOption,
  ElPagination,
  ElPopover,
  ElProgress,
  ElRow,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimeline,
  ElTimelineItem,
  ElTooltip,
} from 'element-plus'
import 'element-plus/dist/index.css'
import {
  ArrowRight,
  Brush,
  Check,
  CirclePlus,
  Close,
  CollectionTag,
  Delete,
  Edit,
  Finished,
  FolderOpened,
  Loading as LoadingIcon,
  Plus,
  Rank,
  Refresh,
  Search,
  Setting,
  Switch,
  Tickets,
  TrendCharts,
  View,
} from '@element-plus/icons-vue'

import App from './App.vue'
import router from './router'

const app = createApp(App)

// Allow per-environment branding without changing source code.
document.title = import.meta.env.VITE_APP_TITLE || 'AnalyticsHub'

app.use(createPinia())
app.use(router)

// Register only the Element Plus capabilities used by this application.
// Explicit registration keeps Rollup tree-shaking effective and avoids
// shipping every component/icon in the admin shell.
for (const plugin of [
  ElAlert,
  ElButton,
  ElButtonGroup,
  ElCol,
  ElConfigProvider,
  ElDatePicker,
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElDrawer,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElInputNumber,
  ElLoading,
  ElOption,
  ElPagination,
  ElPopover,
  ElProgress,
  ElRow,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTimeline,
  ElTimelineItem,
  ElTooltip,
]) {
  app.use(plugin)
}

const elementIcons = {
  ArrowRight,
  Brush,
  Check,
  CirclePlus,
  Close,
  CollectionTag,
  Delete,
  Edit,
  Finished,
  FolderOpened,
  Loading: LoadingIcon,
  Plus,
  Rank,
  Refresh,
  Search,
  Setting,
  Switch,
  Tickets,
  TrendCharts,
  View,
}
for (const [name, component] of Object.entries(elementIcons)) {
  app.component(name, component)
}

app.mount('#app')
