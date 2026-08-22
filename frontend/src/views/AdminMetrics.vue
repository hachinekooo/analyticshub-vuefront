<template>
  <div class="admin-container">
    <PageHeader :title="t('metrics.title')" :subtitle="t('metrics.subtitle')" />

    <MetricsControlBar
      :space="activeSpace"
      :spaces="dashboardSpaces"
      :date-range="filters.dateRange"
      :granularity="filters.granularity"
      :user-id="filters.userId"
      :resolved-actor-id="filters.resolvedActorId"
      :device-id="filters.deviceId"
      :refreshing="refreshing"
      :editing="isLayoutEditable"
      @update:space="activeSpace = $event"
      @update:date-range="filters.dateRange = $event"
      @update:granularity="filters.granularity = $event"
      @update:user-id="filters.userId = $event"
      @update:resolved-actor-id="filters.resolvedActorId = $event"
      @update:device-id="filters.deviceId = $event"
      @apply="applyFilters"
      @customize="startLayoutEditing"
    />

    <DashboardEditorPanel
      :visible="isLayoutEditable"
      :available-widgets="availableWidgetTypes"
      :saving="dashboardSaving"
      @add="addWidgetType"
      @reset="resetToDefaultLayout"
      @cancel="cancelLayoutEditing"
      @complete="completeLayoutEditing"
    />

      <div class="workspace-area" :class="{ 'is-editing': isLayoutEditable }">
        <grid-layout
          v-if="layoutVisible"
          v-model:layout="dashboardLayout"
          :col-num="DASHBOARD_GRID.columns"
          :row-height="DASHBOARD_GRID.rowHeight"
          :margin="dashboardGridSpacing"
          :container-padding="dashboardGridSpacing"
          :is-draggable="isLayoutEditable"
          :is-resizable="isLayoutEditable"
          :vertical-compact="true"
          :use-css-transforms="true"
          :style="dashboardGridStyle"
          @layout-updated="handleLayoutUpdated"
          class="dashboard-grid"
        >
          <grid-item v-for="item in dashboardLayout"
            :key="item.i"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :i="item.i"
            :min-w="item.minW || 2"
            :min-h="item.minH || 2"
            :is-draggable="isLayoutEditable"
            :is-resizable="isLayoutEditable"
            drag-allow-from=".widget-header-bar"
            :drag-option="dashboardGridDragOption"
            :resize-option="dashboardGridResizeOption"
            @move="handleDashboardGridMove"
            @dragend="clearDashboardGridPreview"
            @moved="clearDashboardGridPreview"
            @resize="handleDashboardGridResize"
            @resized="clearDashboardGridPreview"

            class="grid-item-card" :class="{ 'is-editing': isLayoutEditable }"
          >
            <div class="widget-container">
              <!-- Widget Header with Actions -->
              <div class="widget-header-bar" v-if="isLayoutEditable">
                 <span class="widget-drag-handle"><el-icon><Rank /></el-icon></span>
                 <span class="widget-label">{{ getWidgetLabel(item) }}</span>
                 <span class="widget-resize-hint">{{ t('metrics.customization.resizeHint') }}</span>
                 <el-button
                   v-if="canConfigureWidget(item)"
                   :aria-label="t('metrics.widgetConfig.editAction')"
                   :title="t('metrics.widgetConfig.editAction')"
                   size="small"
                   link
                   @click.stop="openWidgetConfig(item)"
                 >
                   <el-icon><Setting /></el-icon>
                 </el-button>
                 <el-button :aria-label="t('buttons.delete')" :title="t('buttons.delete')" size="small" link type="danger" @click.stop="removeWidget(item.i)">
                   <el-icon><Close /></el-icon>
                 </el-button>
              </div>

              <!-- Widget Content Overlay -->
              <div class="widget-inner">
                <!-- Overview Widget -->
                <div v-if="isWidgetType(item, 'core.overview')" class="widget-content" v-loading="overviewLoading">
                  <div v-if="hasCustomWidgetTitle(item)" class="widget-header">
                    <span>{{ getWidgetLabel(item) }}</span>
                  </div>
                  <div v-if="overview" class="overview-grid-compact">
                    <div v-for="metric in overviewItemsForWidget(item)" :key="metric.key" class="overview-mini-card">
                       <p class="mini-label">
                         <span>{{ metric.label }}</span>
                         <MetricHelpIcon :content="metric.help" />
                       </p>
                       <p class="mini-value">{{ metric.value }}</p>
                    </div>
                  </div>
                  <el-empty v-else :description="t('metrics.noData')" :image-size="60" />
                </div>

                <!-- Trends Widget -->
                <div v-else-if="isWidgetType(item, 'core.trends')" class="widget-content" v-loading="trendsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                      <MetricHelpIcon :content="businessTrendsHelp" />
                   </div>
                   <div :id="'chart-business-' + item.i" class="echart-container"></div>
                </div>

                <!-- Top Events Widget -->
                <div v-else-if="isWidgetType(item, 'core.topEvents')" class="widget-content" v-loading="topEventsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                      <MetricHelpIcon :content="t('metrics.help.topEvents')" />
                   </div>
                   <el-table :data="topEvents?.items || []" size="small" style="width: 100%">
                      <el-table-column :label="t('tables.eventType')" min-width="160" show-overflow-tooltip>
                        <template #default="{ row }">
                          <SemanticEventLabel v-bind="eventPresentation(row.eventType)" />
                        </template>
                      </el-table-column>
                      <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
                   </el-table>
                </div>

                <!-- Product Funnel Widget -->
                <div v-else-if="isWidgetType(item, 'core.productFunnel')" class="widget-content" v-loading="productFunnelLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                      <MetricHelpIcon :content="t('metrics.help.productFunnel')" />
                   </div>
                   <el-empty v-if="!dashboardAnalyticsConfig.funnel" :description="t('metrics.notConfigured')" :image-size="60" />
                   <el-table v-else :data="productFunnelRows" size="small" style="width: 100%">
                      <el-table-column prop="groupKey" :label="t('tables.group')" min-width="140" show-overflow-tooltip>
                        <template #default="{ row }">{{ funnelGroupLabel(row.groupKey) }}</template>
                      </el-table-column>
                      <el-table-column :label="t('tables.step')" min-width="180" show-overflow-tooltip>
                        <template #default="{ row }">
                          <SemanticEventLabel v-bind="eventPresentation(row.step)" />
                        </template>
                      </el-table-column>
                      <el-table-column prop="users" :label="productFunnelCountLabel" min-width="90" />
                      <el-table-column prop="conversionRate" :label="t('tables.conversion')" min-width="110">
                        <template #default="{ row }">{{ formatPercent(row.conversionRate) }}</template>
                      </el-table-column>
                      <el-table-column prop="dropOffRate" :label="t('tables.dropOff')" min-width="100">
                        <template #default="{ row }">{{ formatPercent(row.dropOffRate) }}</template>
                      </el-table-column>
                   </el-table>
                </div>

                <!-- Retention Widget -->
                <div v-else-if="isWidgetType(item, 'core.retention')" class="widget-content" v-loading="retentionLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                      <MetricHelpIcon :content="t('metrics.help.retention')" />
                   </div>
                   <el-empty v-if="!dashboardAnalyticsConfig.retention" :description="t('metrics.notConfigured')" :image-size="60" />
                   <template v-else>
                   <div class="retention-summary">
                     <span>{{ t('tables.cohortUsers') }}</span>
                     <strong>{{ formatNumber(retention?.cohortUsers || 0) }}</strong>
                   </div>
                   <el-table :data="retention?.buckets || []" size="small" style="width: 100%">
                      <el-table-column prop="day" :label="t('tables.day')" min-width="80">
                        <template #default="{ row }">D{{ row.day }}</template>
                      </el-table-column>
                      <el-table-column prop="retainedUsers" :label="t('tables.users')" min-width="100" />
                      <el-table-column prop="retentionRate" :label="t('tables.retention')" min-width="110">
                        <template #default="{ row }">{{ formatPercent(row.retentionRate) }}</template>
                      </el-table-column>
                   </el-table>
                   </template>
                </div>

                <!-- Traffic Trends Widget -->
                <div v-else-if="isWidgetType(item, 'core.trafficOverview')" class="widget-content" v-loading="trafficSummaryLoading">
                  <div v-if="hasCustomWidgetTitle(item)" class="widget-header">
                    <span>{{ getWidgetLabel(item) }}</span>
                  </div>
                  <div v-if="trafficSummary" class="overview-grid-compact traffic-overview-grid">
                    <div v-for="(val, label) in trafficOverviewItems" :key="label" class="overview-mini-card">
                      <p class="mini-label">{{ label }}</p>
                      <p class="mini-value">{{ val }}</p>
                    </div>
                  </div>
                  <el-empty v-else :description="t('metrics.noData')" :image-size="60" />
                </div>

                <!-- Traffic Trends Widget -->
                <div v-else-if="isWidgetType(item, 'core.trafficTrends')" class="widget-content" v-loading="trafficTrendsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <div :id="'chart-traffic-' + item.i" class="echart-container"></div>
                </div>
                
                <!-- Rankings Widget -->
                <div v-else-if="isWidgetType(item, 'core.topPages')" class="widget-content" v-loading="topPagesLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="topPages" size="small" style="width: 100%">
                      <el-table-column prop="key" :label="t('tables.page')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
                   </el-table>
                </div>

                <div v-else-if="isWidgetType(item, 'core.topReferrers')" class="widget-content" v-loading="topReferrersLoading">
                  <div class="widget-header">
                    <span>{{ getWidgetLabel(item) }}</span>
                  </div>
                  <el-table :data="topReferrers" size="small" style="width: 100%">
                    <el-table-column :label="t('tables.referrer')" min-width="180" show-overflow-tooltip>
                      <template #default="{ row }">{{ row.key || t('metrics.directTraffic') }}</template>
                    </el-table-column>
                    <el-table-column prop="count" :label="t('tables.count')" min-width="120" />
                  </el-table>
                </div>

                <!-- Counters Widget -->
                <CounterDisplayWidget
                  v-else-if="isWidgetType(item, 'core.counters')"
                  class="widget-content"
                  :project-id="filters.projectId"
                  :title="getWidgetLabel(item)"
                  :configured-keys="item.config?.keys"
                  :refresh-token="extensionRefreshToken"
                />

                <!-- Traffic Table Widget -->
                <div v-else-if="isWidgetType(item, 'core.traffic')" class="widget-content" v-loading="trafficLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="traffic.items" size="small" style="width: 100%">
                      <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="pagePath" :label="t('tables.page')" min-width="200" show-overflow-tooltip />
                      <el-table-column prop="referrer" :label="t('tables.referrer')" min-width="150" show-overflow-tooltip />
                      <el-table-column prop="metricTimestamp" :label="t('tables.eventTime')" min-width="140">
                         <template #default="{ row }">{{ formatTimestamp(row.metricTimestamp) }}</template>
                      </el-table-column>
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="traffic.total"
                        :page-size="traffic.pageSize"
                        :current-page="traffic.page"
                        @current-change="handleTrafficPageChange"
                      />
                   </div>
                </div>

                <!-- Events Table Widget -->
                <div v-else-if="isWidgetType(item, 'core.events')" class="widget-content" v-loading="eventsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                      <EventLegendPopover :events="currentEventLegendEvents" />
                   </div>
                   <el-table :data="events.items" size="small" style="width: 100%">
                      <el-table-column :label="t('tables.eventType')" min-width="160" show-overflow-tooltip>
                        <template #default="{ row }">
                          <SemanticEventLabel v-bind="eventPresentation(row.eventType)" :show-help="false" />
                        </template>
                      </el-table-column>
                      <el-table-column prop="eventTimestamp" :label="t('tables.eventTime')" min-width="160">
                         <template #default="{ row }">{{ formatTimestamp(row.eventTimestamp) }}</template>
                      </el-table-column>
                      <el-table-column :label="t('tables.analyticsIdentity')" min-width="220">
                        <template #header>
                          <span>{{ t('tables.analyticsIdentity') }}</span>
                          <el-tooltip :content="t('metrics.analyticsIdentity.help')" placement="top">
                            <el-icon class="table-header-help" tabindex="0"><InfoFilled /></el-icon>
                          </el-tooltip>
                        </template>
                        <template #default="{ row }">
                          <div class="analytics-identity-cell">
                            <code>{{ row.resolvedActorId || row.userId || '—' }}</code>
                            <div class="analytics-identity-meta">
                              <el-tag size="small" effect="plain">
                                {{ identityScopeLabel(row.identityScope) }}
                              </el-tag>
                              <el-tooltip
                                v-if="row.actorLinked"
                                :content="t('metrics.analyticsIdentity.linkedHelp', { rawActor: row.userId })"
                                placement="top"
                              >
                                <el-tag size="small" type="success" effect="plain">
                                  {{ t('metrics.analyticsIdentity.linked') }}
                                </el-tag>
                              </el-tooltip>
                            </div>
                          </div>
                        </template>
                      </el-table-column>
                      <el-table-column prop="properties" :label="t('tables.properties')" min-width="240">
                         <template #default="{ row }">
                           <EventPropertiesPreview :value="row.properties" />
                         </template>
                      </el-table-column>
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="events.total"
                        :page-size="events.pageSize"
                        :current-page="events.page"
                        @current-change="handleEventsPageChange"
                      />
                   </div>
                </div>

                <!-- Devices Table Widget -->
                <div
                  v-else-if="isWidgetType(item, 'core.devices')"
                  class="widget-content"
                  v-loading="devicesLoading || appVersionsLoading"
                >
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <AppVersionDistribution
                     :distribution="appVersions"
                     :failed="appVersionsFailed"
                   />
                   <el-table :data="devices.items" size="small" style="width: 100%">
                      <el-table-column prop="deviceId" :label="t('tables.deviceId')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="deviceModel" :label="t('tables.model')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="appVersion" :label="t('tables.registrationVersion')" min-width="120" />
                      <el-table-column prop="createdAt" :label="t('tables.registrationTime')" min-width="140">
                         <template #default="{ row }">{{ formatTimestamp(new Date(row.createdAt).getTime()) }}</template>
                      </el-table-column>
                      <el-table-column prop="lastActiveAt" :label="t('tables.lastActive')" min-width="140">
                         <template #default="{ row }">{{ formatTimestamp(new Date(row.lastActiveAt).getTime()) }}</template>
                      </el-table-column>
                      <el-table-column prop="isBanned" :label="t('tables.status')" min-width="100">
                        <template #default="{ row }">
                          <el-tag size="small" :type="row.isBanned ? 'danger' : 'success'">
                            {{ row.isBanned ? t('status.banned') : t('status.normal') }}
                          </el-tag>
                        </template>
                      </el-table-column>
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="devices.total"
                        :page-size="devices.pageSize"
                        :current-page="devices.page"
                        @current-change="handleDevicesPageChange"
                      />
                   </div>
                </div>

                <!-- Sessions Table Widget -->
                <div v-else-if="isWidgetType(item, 'core.sessions')" class="widget-content" v-loading="sessionsLoading">
                   <div class="widget-header">
                      <span>{{ getWidgetLabel(item) }}</span>
                   </div>
                   <el-table :data="sessions.items" size="small" style="width: 100%">
                      <el-table-column prop="sessionId" :label="t('tables.sessionId')" min-width="120" show-overflow-tooltip />
                      <el-table-column prop="sessionDurationMs" :label="t('tables.duration')" min-width="120">
                         <template #default="{ row }">{{ formatDuration(row.sessionDurationMs) }}</template>
                      </el-table-column>
                      <el-table-column prop="eventCount" :label="t('tables.events')" min-width="120" />
                   </el-table>
                   <div class="widget-footer-mini">
                      <el-pagination
                        size="small"
                        layout="prev, pager, next"
                        :total="sessions.total"
                        :page-size="sessions.pageSize"
                        :current-page="sessions.page"
                        @current-change="handleSessionsPageChange"
                      />
                   </div>
                </div>

                <!-- Trusted build-time extension widget -->
                <div v-else-if="extensionForWidget(item)" class="widget-content">
                  <div class="widget-header">
                    <span>{{ getWidgetLabel(item) }}</span>
                  </div>
                  <component
                    :is="extensionComponent(item)"
                    :project-id="filters.projectId"
                    :widget-id="item.i"
                    :config="extensionConfig(item)"
                    :date-range="extensionDateRange"
                    :locale="locale"
                    :editable="isLayoutEditable"
                    :refresh-token="extensionRefreshToken"
                    @update:config="updateExtensionWidgetConfig(item, $event)"
                  />
                </div>

                <el-empty v-else :description="t('metrics.dashboardUnsupportedWidget')" :image-size="60" />
              </div>
            </div>
          </grid-item>
          <div
            v-if="dashboardGridPreview"
            class="dashboard-grid-drop-preview"
            :style="dashboardGridPreviewStyle(dashboardGridPreview)"
            aria-hidden="true"
          />
        </grid-layout>
      </div>

    <el-dialog
      v-model="widgetConfigDialogVisible"
      :title="t('metrics.widgetConfig.dialogTitle', { widget: pendingWidgetLabel })"
      width="620px"
    >
      <el-form :model="widgetConfigForm" label-position="top">
        <div v-if="widgetConfigTargetId" class="widget-size-fields">
          <el-form-item :label="t('metrics.widgetConfig.width')">
            <el-input-number v-model="widgetConfigForm.width" :min="widgetConfigMinWidth" :max="12" />
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.height')">
            <el-input-number v-model="widgetConfigForm.height" :min="widgetConfigMinHeight" :max="40" />
          </el-form-item>
        </div>
        <el-form-item :label="t('metrics.widgetConfig.customTitle')">
          <el-input
            v-model="widgetConfigForm.title"
            maxlength="100"
            clearable
            :placeholder="t('metrics.widgetConfig.customTitlePlaceholder')"
          />
        </el-form-item>

        <template v-if="widgetConfigType === 'core.overview'">
          <el-form-item :label="t('metrics.widgetConfig.overviewMetrics')" required>
            <OrderedSelectionEditor
              v-model="widgetConfigForm.overviewMetricKeys"
              :options="overviewMetricSelectionOptions"
              :placeholder="t('metrics.widgetConfig.overviewMetricsPlaceholder')"
              :empty-text="t('metrics.widgetConfig.overviewMetricsEmpty')"
              :move-up-label="t('metrics.widgetConfig.moveUp')"
              :move-down-label="t('metrics.widgetConfig.moveDown')"
            />
          </el-form-item>
          <p class="form-tip">{{ t('metrics.widgetConfig.overviewMetricsTip') }}</p>
        </template>

        <template v-else-if="widgetConfigType === 'core.counters'">
          <el-form-item :label="t('metrics.widgetConfig.counterKeys')" required>
            <OrderedSelectionEditor
              v-model="widgetConfigForm.counterKeys"
              :options="counterSelectionOptions"
              :placeholder="t('metrics.widgetConfig.counterKeysPlaceholder')"
              :empty-text="t('metrics.widgetConfig.counterKeysEmpty')"
              :move-up-label="t('metrics.widgetConfig.moveUp')"
              :move-down-label="t('metrics.widgetConfig.moveDown')"
              :loading="counterOptionsLoading"
            />
          </el-form-item>
          <p class="form-tip">{{ t('metrics.widgetConfig.counterKeysTip') }}</p>
        </template>

        <template v-else-if="widgetConfigType === 'core.productFunnel'">
          <el-form-item :label="t('metrics.widgetConfig.funnelSteps')" required>
            <el-select
              v-model="widgetConfigForm.funnelSteps"
              multiple
              filterable
              style="width: 100%"
              :placeholder="t('metrics.widgetConfig.funnelStepsPlaceholder')"
            >
              <el-option
                v-for="definition in activeSemanticDefinitions"
                :key="definition.semanticKey"
                :label="semanticDefinitionLabel(definition)"
                :value="definition.semanticKey"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.groupBy')">
            <el-input
              v-model="widgetConfigForm.groupBy"
              maxlength="80"
              clearable
              :placeholder="t('metrics.widgetConfig.groupByPlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.journeyKey')">
            <el-input
              v-model="widgetConfigForm.journeyKey"
              maxlength="80"
              clearable
              :placeholder="t('metrics.widgetConfig.journeyKeyPlaceholder')"
            />
            <div class="form-tip">{{ t('metrics.widgetConfig.journeyKeyTip') }}</div>
          </el-form-item>
        </template>

        <template v-else-if="widgetConfigType === 'core.retention'">
          <el-form-item :label="t('metrics.widgetConfig.cohortEvent')" required>
            <el-select
              v-model="widgetConfigForm.cohortEvent"
              filterable
              style="width: 100%"
              :placeholder="t('metrics.widgetConfig.eventPlaceholder')"
            >
              <el-option
                v-for="definition in activeSemanticDefinitions"
                :key="definition.semanticKey"
                :label="semanticDefinitionLabel(definition)"
                :value="definition.semanticKey"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.returnEvent')" required>
            <el-select
              v-model="widgetConfigForm.returnEvent"
              filterable
              style="width: 100%"
              :placeholder="t('metrics.widgetConfig.eventPlaceholder')"
            >
              <el-option
                v-for="definition in activeSemanticDefinitions"
                :key="definition.semanticKey"
                :label="semanticDefinitionLabel(definition)"
                :value="definition.semanticKey"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="t('metrics.widgetConfig.retentionDays')" required>
            <el-input
              v-model="widgetConfigForm.retentionDaysText"
              :placeholder="t('metrics.widgetConfig.retentionDaysPlaceholder')"
            />
          </el-form-item>
        </template>
      </el-form>
      <template #footer>
        <el-button @click="widgetConfigDialogVisible = false">{{ t('buttons.cancel') }}</el-button>
        <el-button type="primary" @click="confirmConfiguredWidget">
          {{ widgetConfigTargetId ? t('buttons.save') : t('metrics.addWidget') }}
        </el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, readonly, ref, watch } from 'vue'
import { LineChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import { init, use, type ECharts } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { useI18n } from '@/i18n'
import { GridLayout, GridItem } from 'vue3-grid-layout-next'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PageHeader from '@/components/PageHeader.vue'
import MetricsControlBar from '@/components/metrics/MetricsControlBar.vue'
import DashboardEditorPanel from '@/components/metrics/DashboardEditorPanel.vue'
import AppVersionDistribution from '@/components/metrics/AppVersionDistribution.vue'
import MetricHelpIcon from '@/components/metrics/MetricHelpIcon.vue'
import SemanticEventLabel from '@/components/metrics/SemanticEventLabel.vue'
import EventLegendPopover from '@/components/metrics/EventLegendPopover.vue'
import EventPropertiesPreview from '@/components/metrics/EventPropertiesPreview.vue'
import OrderedSelectionEditor, { type OrderedSelectionOption } from '@/components/metrics/OrderedSelectionEditor.vue'
import CounterDisplayWidget from '@/features/counters/CounterDisplayWidget.vue'
import { useProjectContextStore } from '@/stores/projectContext'
import { getApiErrorMessage as getErrorMessage } from '@/utils/apiError'
import { projectIdFromParam, projectRoute } from '@/utils/projectRoutes'
import {
  cloneDashboardLayout,
  dashboardSpacesForTemplate,
  type DashboardLayoutItem,
  type DashboardSpaceKey,
} from '@/features/dashboard/projectDashboardTemplate'
import {
  dateRangeForDashboardPreset,
  type DashboardDefaultRange,
} from '@/features/dashboard/dashboardDateRange'
import { findTopActiveAppVersion } from '@/features/metrics/appVersionDistribution'
import type { SemanticEventPresentation } from '@/features/metrics/semanticEventPresentation'
import {
  OVERVIEW_METRIC_CATALOG,
  OVERVIEW_METRIC_KEYS,
  isOverviewMetricKey,
  resolveOverviewMetricKeys,
  resolveTrendMetricKeys,
  type OverviewMetricKey,
} from '@/features/metrics/overviewMetricCatalog'
import {
  adaptiveWidgetPageSize,
  withoutLegacyFixedPageSize,
} from '@/features/dashboard/adaptiveWidgetPageSize'
import { DASHBOARD_GRID } from '@/features/dashboard/dashboardGridContract'
import {
  dashboardGridDragOption,
  dashboardGridPreviewStyle,
  dashboardGridResizeOption,
  type DashboardGridPreview,
} from '@/features/dashboard/dashboardGridInteraction'
import {
  getDashboardWidgetExtension,
  getDashboardWidgetExtensions,
  normalizeDashboardExtensionConfig,
  type DashboardExtensionConfig,
  type DashboardWidgetExtension,
} from '@/extensions/dashboard'
import {
  getEventCatalog,
  getSemanticDefinitions,
  type EventCatalogEntry,
  type SemanticDefinition,
} from '@/api/semantic'
import {
  getProjectDashboards,
  upsertProjectDashboard,
  type AdminDashboard,
  type DashboardDefinition,
  type DashboardWidgetDefinition,
} from '@/api/dashboard'
import {
  Close,
  InfoFilled,
  Rank,
  Setting,
} from '@element-plus/icons-vue'
import {
  getDevices,
  getEvents,
  getAppVersionDistribution,
  getMetricsOverview,
  getMetricsTrends,
  getSessions,
  getTopEvents,
  getTrafficMetrics,
  getTrafficSummary,
  getTrafficTrends,
  getTopPages,
  getTopReferrers,
  type MetricsOverview,
  type AppVersionDistribution as AppVersionDistributionData,
  type MetricsTopEvents,
  type MetricsTrends,
  type PagedResult,
  type DeviceRecord,
  type EventRecord,
  type SessionRecord,
  type TrafficMetricRecord,
  type TrafficSummary,
  type MetricsGranularity,
  type TrafficGranularity,
  type TrafficTrends,
  type TopPageItem,
  type TopReferrerItem,
  getProductFunnel,
  getProductRetention,
  getCounters,
  type FunnelResponse,
  type RetentionResponse,
  type CounterItem,
} from '@/api/metrics'
import { buildEventRecordQuery } from '@/features/metrics/eventRecordQuery'

use([LineChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer])

// --- 1. Types & Interfaces ---
type DashboardItem = DashboardLayoutItem

interface DashboardAnalyticsConfig {
  funnel?: {
    steps: string[]
    groupBy?: string
    journeyKey?: string
  }
  retention?: {
    cohortEvent: string
    returnEvent: string
    days: number[]
  }
}

// --- 2. State & Basic Setup ---
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const projectContext = useProjectContextStore()
const { activeProjects: projects, selectedProjectId, selectedProject } = storeToRefs(projectContext)

const routeProjectId = computed(() => {
  return projectIdFromParam(route.params.projectId)
})

const refreshing = ref(false)
const isLayoutEditable = ref(false)
const dashboardGridSpacing: [number, number] = [DASHBOARD_GRID.gap, DASHBOARD_GRID.gap]
const dashboardGridStyle = {
  '--dashboard-grid-column-pitch': `calc((100% - ${DASHBOARD_GRID.gap}px) / ${DASHBOARD_GRID.columns})`,
  '--dashboard-grid-row-pitch': `${DASHBOARD_GRID.rowHeight + DASHBOARD_GRID.gap}px`,
  '--dashboard-grid-offset': `${DASHBOARD_GRID.gap}px`,
}
const dashboardGridPreview = ref<DashboardGridPreview | null>(null)
const dashboardSpaces = computed(() => dashboardSpacesForTemplate(
  selectedProject.value?.analysisTemplate ?? 'app',
))
const activeSpace = ref<DashboardSpaceKey>(dashboardSpaces.value[0]!.key)
const dashboardLayout = ref<DashboardItem[]>([])
const serverDashboards = ref<AdminDashboard[]>([])
const dashboardDefaultRange = ref<DashboardDefaultRange>('7d')
const dashboardSaving = ref(false)
const layoutBeforeEditing = ref<DashboardItem[] | null>(null)

// Filters & Params
const filters = reactive({
  projectId: '',
  dateRange: null as string[] | null,
  granularity: 'day' as MetricsGranularity,
  topEventsLimit: 10,
  eventType: '',
  userId: '',
  resolvedActorId: '',
  deviceId: '',
  sessionId: '',
  apiKey: '',
  isBanned: '',
})
const extensionRefreshToken = ref(0)

type MetricsRequestSnapshot = Readonly<{
  dateRange: readonly string[] | null
  granularity: MetricsGranularity
  topEventsLimit: number
  eventType: string
  userId: string
  resolvedActorId: string
  deviceId: string
  sessionId: string
  apiKey: string
  isBanned: string
  eventsPage: number
  devicesPage: number
  sessionsPage: number
  trafficPage: number
}>

type ProjectRequestContext = {
  projectId: string
  projectGeneration: number
  requestGeneration: number
  snapshot: MetricsRequestSnapshot
}
type AppliedMetricsFilters = Omit<MetricsRequestSnapshot,
  'eventsPage' | 'devicesPage' | 'sessionsPage' | 'trafficPage'>

let projectContextGeneration = 0
let metricsRequestGeneration = 0
const captureFilterSnapshot = (): AppliedMetricsFilters => ({
  dateRange: Array.isArray(filters.dateRange) ? [...filters.dateRange] : null,
  granularity: filters.granularity,
  topEventsLimit: filters.topEventsLimit,
  eventType: filters.eventType,
  userId: filters.userId,
  resolvedActorId: filters.resolvedActorId,
  deviceId: filters.deviceId,
  sessionId: filters.sessionId,
  apiKey: filters.apiKey,
  isBanned: filters.isBanned,
})
// `filters` is the editable form state; requests only read this committed snapshot.
// This prevents half-entered filters from triggering competing request batches.
const appliedFilters = ref<AppliedMetricsFilters>(captureFilterSnapshot())
const extensionDateRange = computed<readonly [string, string] | null>(() =>
  Array.isArray(appliedFilters.value.dateRange) && appliedFilters.value.dateRange.length === 2
    ? [appliedFilters.value.dateRange[0]!, appliedFilters.value.dateRange[1]!] as const
    : null,
)
const commitFilterSnapshot = () => {
  appliedFilters.value = captureFilterSnapshot()
}
const captureMetricsSnapshot = (): MetricsRequestSnapshot => ({
  ...appliedFilters.value,
  eventsPage: events.page,
  devicesPage: devices.page,
  sessionsPage: sessions.page,
  trafficPage: traffic.page,
})
const captureProjectContext = (): ProjectRequestContext => ({
  projectId: filters.projectId,
  projectGeneration: projectContextGeneration,
  requestGeneration: metricsRequestGeneration,
  snapshot: captureMetricsSnapshot(),
})
const beginRefreshContext = () => {
  metricsRequestGeneration += 1
  return captureProjectContext()
}
const isCurrentProjectScope = (context: ProjectRequestContext) =>
  context.projectGeneration === projectContextGeneration
  && context.projectId === filters.projectId
const isCurrentProjectContext = (context: ProjectRequestContext) =>
  isCurrentProjectScope(context) && context.requestGeneration === metricsRequestGeneration

// Metrics Data Collections
const overview = ref<MetricsOverview | null>(null)
const appVersions = ref<AppVersionDistributionData | null>(null)
const appVersionsFailed = ref(false)
const trends = ref<MetricsTrends | null>(null)
const topEvents = ref<MetricsTopEvents | null>(null)
const trafficTrends = ref<TrafficTrends | null>(null)
const trafficSummary = ref<TrafficSummary | null>(null)
const topPages = ref<TopPageItem[]>([])
const topReferrers = ref<TopReferrerItem[]>([])
const productFunnel = ref<FunnelResponse | null>(null)
const retention = ref<RetentionResponse | null>(null)
const dashboardAnalyticsConfig = ref<DashboardAnalyticsConfig>({})
const semanticEventCatalog = ref<EventCatalogEntry[]>([])
const semanticDefinitions = ref<SemanticDefinition[]>([])

// Paged Results
const events = reactive<PagedResult<EventRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })
const devices = reactive<PagedResult<DeviceRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })
const sessions = reactive<PagedResult<SessionRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })
const traffic = reactive<PagedResult<TrafficMetricRecord>>({ projectId: '', rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })

// Dialogs & Form
const widgetConfigDialogVisible = ref(false)
const widgetConfigType = ref('')
const widgetConfigTargetId = ref('')
const widgetConfigForm = reactive({
  title: '',
  width: 6,
  height: 8,
  funnelSteps: [] as string[],
  groupBy: '',
  journeyKey: '',
  cohortEvent: '',
  returnEvent: '',
  retentionDaysText: '1, 7, 30',
  overviewMetricKeys: [] as string[],
  initialOverviewMetricKeys: [] as string[],
  counterKeys: [] as string[],
  initialCounterKeys: [] as string[],
})
const counterOptions = ref<CounterItem[]>([])
const counterOptionsLoading = ref(false)
const widgetConfigTarget = computed(() =>
  dashboardLayout.value.find((item) => item.i === widgetConfigTargetId.value),
)
const widgetConfigMinWidth = computed(() => widgetConfigTarget.value?.minW || 2)
const widgetConfigMinHeight = computed(() => widgetConfigTarget.value?.minH || 2)
const activeSemanticDefinitions = computed(() => semanticDefinitions.value
  .filter((definition) => definition.isActive)
  .sort((left, right) => left.semanticKey.localeCompare(right.semanticKey)))
const availableOverviewMetricKeySet = computed(() => new Set(
  resolveOverviewMetricKeys(undefined, overview.value?.availableMetricKeys),
))
const overviewMetricSelectionOptions = computed<OrderedSelectionOption[]>(() =>
  OVERVIEW_METRIC_CATALOG.map(metric => {
    const available = availableOverviewMetricKeySet.value.has(metric.key)
    return {
      key: metric.key,
      label: t(metric.labelKey),
      description: t(metric.helpKey),
      disabled: !available,
      disabledReason: !available && metric.kind === 'business'
        ? t('metrics.widgetConfig.semanticMappingRequired')
        : undefined,
    }
  }),
)

const localizedCounterText = (value: Record<string, string> | string | null) => {
  if (!value) return ''
  if (typeof value === 'string') return value
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  return preferred.map(key => value[key]).find(Boolean) || Object.values(value)[0] || ''
}
const counterSelectionOptions = computed<OrderedSelectionOption[]>(() => {
  const availableOptions = counterOptions.value.map(counter => ({
    key: counter.key,
    label: localizedCounterText(counter.displayName) || counter.key,
    description: counter.description || counter.key,
  }))
  const availableKeys = new Set(availableOptions.map(option => option.key))
  const unavailableOptions = widgetConfigForm.initialCounterKeys
    .filter(key => !availableKeys.has(key))
    .map(key => ({
      key,
      label: key,
      description: t('metrics.widgetConfig.unavailableCounterDescription'),
      disabled: true,
      disabledReason: t('metrics.widgetConfig.unavailableCounterKey'),
    }))
  return [...availableOptions, ...unavailableOptions]
})

// Loading States
const overviewLoading = ref(false)
const appVersionsLoading = ref(false)
const trendsLoading = ref(false)
const topEventsLoading = ref(false)
const eventsLoading = ref(false)
const devicesLoading = ref(false)
const sessionsLoading = ref(false)
const trafficLoading = ref(false)
const trafficTrendsLoading = ref(false)
const trafficSummaryLoading = ref(false)
const topPagesLoading = ref(false)
const topReferrersLoading = ref(false)
const productFunnelLoading = ref(false)
const retentionLoading = ref(false)

// --- 3. Utility Functions ---
const cleanParams = <T extends Record<string, unknown>>(params: T): T => {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== '' && value !== undefined && value !== null)
  ) as T
}

const rangeParams = (snapshot: MetricsRequestSnapshot = captureMetricsSnapshot()) => {
  if (Array.isArray(snapshot.dateRange) && snapshot.dateRange.length === 2) {
    return { from: snapshot.dateRange[0], to: snapshot.dateRange[1] }
  }
  return {}
}

const semanticEventByRawKey = computed(() => {
  const entries = new Map<string, EventCatalogEntry>()
  for (const entry of semanticEventCatalog.value) {
    entries.set(entry.rawKey, entry)
    if (entry.mapped && entry.semanticKey && !entries.has(entry.semanticKey)) {
      entries.set(entry.semanticKey, entry)
    }
  }
  return entries
})

const semanticDefinitionByKey = computed(() => new Map(
  semanticDefinitions.value.map((definition) => [definition.semanticKey, definition]),
))

const eventPresentation = (eventKey: string): SemanticEventPresentation => {
  const catalogEntry = semanticEventByRawKey.value.get(eventKey)
  const semanticKey = catalogEntry?.semanticKey || eventKey
  const definition = semanticDefinitionByKey.value.get(semanticKey)
  const displayName = definition?.displayName || catalogEntry?.displayName || null
  return {
    eventKey,
    displayName,
    description: definition?.description || catalogEntry?.description || null,
    knownBusinessName: Boolean(displayName && Object.values(displayName).some(Boolean)),
  }
}
const currentEventLegendEvents = computed(() =>
  events.items.map(event => eventPresentation(event.eventType)),
)
const semanticDefinitionLabel = (definition: SemanticDefinition) => {
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  const name = preferred.map((key) => definition.displayName[key]).find(Boolean)
    || Object.values(definition.displayName)[0]
  return name ? `${name} · ${definition.semanticKey}` : definition.semanticKey
}

const requireProject = () => {
  if (!filters.projectId) {
    ElMessage.warning(t('errors.selectProject'))
    return false
  }
  return true
}
// --- 4. Layout Management ---
const activeSpaceDefinition = computed(() =>
  dashboardSpaces.value.find((space) => space.key === activeSpace.value) ?? dashboardSpaces.value[0]!,
)

const widgetLabelKeys: Record<string, string> = {
  'core.overview': 'metrics.overview',
  'core.trends': 'metrics.trends',
  'core.topEvents': 'metrics.topEvents',
  'core.productFunnel': 'metrics.productFunnel',
  'core.retention': 'metrics.retention',
  'core.trafficOverview': 'metrics.trafficOverview',
  'core.trafficTrends': 'metrics.trafficTrends',
  'core.topPages': 'metrics.topPages',
  'core.topReferrers': 'metrics.topReferrers',
  'core.counters': 'metrics.counters',
  'core.events': 'metrics.events',
  'core.devices': 'metrics.devices',
  'core.sessions': 'metrics.sessions',
  'core.traffic': 'metrics.traffic',
}

const pendingWidgetLabel = computed(() => {
  const key = widgetConfigType.value ? widgetLabelKeys[widgetConfigType.value] : ''
  return key ? t(key) : ''
})

const removeWidget = (id: string) => {
  const removed = dashboardLayout.value.find((item) => item.i === id)
  const removedType = removed ? resolvedWidgetType(removed) : null
  dashboardLayout.value = dashboardLayout.value.filter(item => item.i !== id)
  if (removedType === 'core.productFunnel') {
    const next = { ...dashboardAnalyticsConfig.value }
    delete next.funnel
    dashboardAnalyticsConfig.value = next
  }
  if (removedType === 'core.retention') {
    const next = { ...dashboardAnalyticsConfig.value }
    delete next.retention
    dashboardAnalyticsConfig.value = next
  }
}

const resetToDefaultLayout = () => {
  dashboardLayout.value = cloneDashboardLayout(activeSpaceDefinition.value.defaultLayout)
  void nextTick(handleLayoutUpdated)
}

const startLayoutEditing = () => {
  if (isLayoutEditable.value) return
  layoutBeforeEditing.value = JSON.parse(JSON.stringify(dashboardLayout.value))
  isLayoutEditable.value = true
}

const clearDashboardGridPreview = () => {
  dashboardGridPreview.value = null
}

const handleDashboardGridMove = (id: string | number, x: number, y: number) => {
  const item = dashboardLayout.value.find(candidate => candidate.i === String(id))
  if (!item) return
  dashboardGridPreview.value = { i: item.i, x, y, w: item.w, h: item.h }
}

const handleDashboardGridResize = (id: string | number, h: number, w: number) => {
  const item = dashboardLayout.value.find(candidate => candidate.i === String(id))
  if (!item) return
  dashboardGridPreview.value = { i: item.i, x: item.x, y: item.y, w, h }
}

const cancelLayoutEditing = () => {
  if (layoutBeforeEditing.value) {
    dashboardLayout.value = JSON.parse(JSON.stringify(layoutBeforeEditing.value))
    syncAnalyticsConfigFromLayout()
  }
  layoutBeforeEditing.value = null
  isLayoutEditable.value = false
  void nextTick(handleLayoutUpdated)
}

const availableWidgetTypes = computed(() => {
  const present = new Set(dashboardLayout.value.map((item) => resolvedWidgetType(item)))
  const coreWidgets = activeSpaceDefinition.value.widgetTemplates
    .filter((item) => item.type && !present.has(item.type))
    .map((item) => ({
      type: item.type as string,
      label: t(widgetLabelKeys[item.type as string] || 'metrics.dashboardUnsupportedWidget'),
    }))
  const extensionWidgets = getDashboardWidgetExtensions(activeSpace.value)
    .filter((extension) => !present.has(extension.type))
    .map((extension) => ({
      type: extension.type,
      label: extensionDisplayName(extension),
    }))
  return [...coreWidgets, ...extensionWidgets]
})
const appendExtensionWidget = (type: string) => {
  const extension = getDashboardWidgetExtension(type)
  if (!extension || !extension.spaces.includes(activeSpace.value)) return
  if (dashboardLayout.value.some((item) => resolvedWidgetType(item) === type)) return
  const nextY = dashboardLayout.value.reduce(
    (bottom, item) => Math.max(bottom, item.y + item.h),
    0,
  )
  const config = extension.defaultConfig === undefined
    ? undefined
    : normalizeDashboardExtensionConfig(extension, extension.defaultConfig) || undefined
  if (extension.configRequired && config === undefined) return
  const idPrefix = extension.type.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)
  dashboardLayout.value.push({
    i: `${idPrefix}_${Date.now()}`,
    type: extension.type,
    x: 0,
    y: nextY,
    w: extension.defaultLayout.w,
    h: extension.defaultLayout.h,
    minW: extension.defaultLayout.minW,
    minH: extension.defaultLayout.minH,
    config,
  })
}

const appendWidgetType = (type: string, config?: Record<string, unknown>) => {
  if (dashboardLayout.value.some((item) => resolvedWidgetType(item) === type)) return
  const template = activeSpaceDefinition.value.widgetTemplates.find((item) => item.type === type)
  if (!template) return
  const nextY = dashboardLayout.value.reduce(
    (bottom, item) => Math.max(bottom, item.y + item.h),
    0,
  )
  dashboardLayout.value.push({
    ...JSON.parse(JSON.stringify(template)),
    i: `${template.i.replace(/_default$/, '')}_${Date.now()}`,
    x: 0,
    y: nextY,
    config,
  })
  if (type === 'core.productFunnel' && Array.isArray(config?.steps)) {
    dashboardAnalyticsConfig.value = {
      ...dashboardAnalyticsConfig.value,
      funnel: {
        steps: config.steps as string[],
        groupBy: typeof config.groupBy === 'string' ? config.groupBy : undefined,
        journeyKey: typeof config.journeyKey === 'string' ? config.journeyKey : undefined,
      },
    }
  }
  if (type === 'core.retention'
    && typeof config?.cohortEvent === 'string'
    && typeof config.returnEvent === 'string'
    && Array.isArray(config.days)) {
    dashboardAnalyticsConfig.value = {
      ...dashboardAnalyticsConfig.value,
      retention: {
        cohortEvent: config.cohortEvent,
        returnEvent: config.returnEvent,
        days: config.days as number[],
      },
    }
  }
  nextTick(() => void refreshAll())
}

const resetWidgetConfigForm = () => {
  Object.assign(widgetConfigForm, {
    title: '',
    width: 6,
    height: 8,
    funnelSteps: [],
    groupBy: '',
    journeyKey: '',
    cohortEvent: '',
    returnEvent: '',
    retentionDaysText: '1, 7, 30',
    overviewMetricKeys: [],
    initialOverviewMetricKeys: [],
    counterKeys: [],
    initialCounterKeys: [],
  })
}

const prepareOverviewMetricSelection = async (useAvailableDefaults: boolean) => {
  if (!overview.value && filters.projectId) {
    await loadOverview(beginTargetedRequestContext())
  }
  if (useAvailableDefaults && widgetConfigType.value === 'core.overview'
    && widgetConfigForm.overviewMetricKeys.length === 0) {
    widgetConfigForm.overviewMetricKeys = resolveOverviewMetricKeys(
      undefined,
      overview.value?.availableMetricKeys,
    )
  }
}

const loadCounterConfigurationOptions = async (selectAllWhenUnconfigured: boolean) => {
  const projectId = filters.projectId
  if (!projectId) return
  counterOptionsLoading.value = true
  try {
    const response = await getCounters({ projectId })
    if (filters.projectId !== projectId || widgetConfigType.value !== 'core.counters') return
    counterOptions.value = response.data.data.items
    if (selectAllWhenUnconfigured && widgetConfigForm.counterKeys.length === 0) {
      widgetConfigForm.counterKeys = response.data.data.items.map(counter => counter.key)
    }
  } catch (error) {
    if (filters.projectId === projectId) {
      counterOptions.value = []
      ElMessage.error(getErrorMessage(error, t('errors.countersFailed')))
    }
  } finally {
    if (filters.projectId === projectId) counterOptionsLoading.value = false
  }
}

const canConfigureWidget = (item: DashboardItem) => {
  const type = resolvedWidgetType(item)
  return Boolean(type && !getDashboardWidgetExtension(type))
}

const openWidgetConfig = (item: DashboardItem) => {
  const type = resolvedWidgetType(item)
  if (!type || getDashboardWidgetExtension(type)) return
  resetWidgetConfigForm()
  widgetConfigTargetId.value = item.i
  widgetConfigType.value = type
  widgetConfigForm.title = typeof item.config?.title === 'string' ? item.config.title : ''
  widgetConfigForm.width = item.w
  widgetConfigForm.height = item.h
  if (type === 'core.overview') {
    const configuredKeys = Array.isArray(item.config?.metricKeys)
      ? item.config.metricKeys.filter(isOverviewMetricKey)
      : []
    widgetConfigForm.overviewMetricKeys = configuredKeys
    widgetConfigForm.initialOverviewMetricKeys = [...configuredKeys]
    void prepareOverviewMetricSelection(!Array.isArray(item.config?.metricKeys))
  }
  if (type === 'core.counters') {
    widgetConfigForm.counterKeys = Array.isArray(item.config?.keys)
      ? item.config.keys.filter((key): key is string => typeof key === 'string')
      : []
    widgetConfigForm.initialCounterKeys = [...widgetConfigForm.counterKeys]
    void loadCounterConfigurationOptions(!Array.isArray(item.config?.keys))
  }
  if (type === 'core.productFunnel') {
    widgetConfigForm.funnelSteps = Array.isArray(item.config?.steps)
      ? item.config.steps.filter((step): step is string => typeof step === 'string')
      : []
    widgetConfigForm.groupBy = typeof item.config?.groupBy === 'string' ? item.config.groupBy : ''
    widgetConfigForm.journeyKey = typeof item.config?.journeyKey === 'string' ? item.config.journeyKey : ''
  }
  if (type === 'core.retention') {
    widgetConfigForm.cohortEvent = typeof item.config?.cohortEvent === 'string' ? item.config.cohortEvent : ''
    widgetConfigForm.returnEvent = typeof item.config?.returnEvent === 'string' ? item.config.returnEvent : ''
    widgetConfigForm.retentionDaysText = Array.isArray(item.config?.days)
      ? item.config.days.filter((day): day is number => Number.isInteger(day)).join(', ')
      : '1, 7, 30'
  }
  widgetConfigDialogVisible.value = true
  if (type === 'core.productFunnel' || type === 'core.retention') void loadSemanticDefinitions()
}

const addWidgetType = (type: string) => {
  if (dashboardLayout.value.some((item) => resolvedWidgetType(item) === type)) return
  if (getDashboardWidgetExtension(type)) {
    appendExtensionWidget(type)
    return
  }
  if (type === 'core.overview' || type === 'core.counters'
    || type === 'core.productFunnel' || type === 'core.retention') {
    resetWidgetConfigForm()
    widgetConfigTargetId.value = ''
    widgetConfigType.value = type
    widgetConfigDialogVisible.value = true
    if (type === 'core.overview') void prepareOverviewMetricSelection(true)
    else if (type === 'core.counters') void loadCounterConfigurationOptions(false)
    else void loadSemanticDefinitions()
    return
  }
  appendWidgetType(type)
}

const validAnalyticsKey = (value: string, maxLength = 100) => {
  const normalized = value.trim()
  return normalized.length <= maxLength && /^[A-Za-z0-9_.:-]+$/.test(normalized)
}

const confirmConfiguredWidget = () => {
  const type = widgetConfigType.value
  if (!type) return
  const config: Record<string, unknown> = {}
  const title = widgetConfigForm.title.trim()
  if (title) config.title = title

  if (type === 'core.overview') {
    const available = availableOverviewMetricKeySet.value
    const initialKeys = new Set(widgetConfigForm.initialOverviewMetricKeys)
    const metricKeys = [...new Set(widgetConfigForm.overviewMetricKeys)]
      .filter(isOverviewMetricKey)
    const newlyUnavailable = metricKeys.some(key => !available.has(key) && !initialKeys.has(key))
    if (metricKeys.length < 1 || newlyUnavailable) {
      ElMessage.warning(t('metrics.widgetConfig.invalidOverviewMetrics'))
      return
    }
    config.metricKeys = metricKeys
  } else if (type === 'core.counters') {
    const existingKeys = new Set(counterOptions.value.map(counter => counter.key))
    const initialKeys = new Set(widgetConfigForm.initialCounterKeys)
    const keys = [...new Set(widgetConfigForm.counterKeys)]
    const newlyUnavailable = keys.some(key => !existingKeys.has(key) && !initialKeys.has(key))
    if (keys.length < 1 || keys.length > 20 || newlyUnavailable) {
      ElMessage.warning(t('metrics.widgetConfig.invalidCounterKeys'))
      return
    }
    config.keys = keys
  } else if (type === 'core.productFunnel') {
    const steps = [...new Set(widgetConfigForm.funnelSteps.map((step) => step.trim()).filter(Boolean))]
    if (steps.length < 2 || steps.length > 12 || steps.some((step) => !validAnalyticsKey(step))) {
      ElMessage.warning(t('metrics.widgetConfig.invalidFunnelSteps'))
      return
    }
    const groupBy = widgetConfigForm.groupBy.trim()
    if (groupBy && !validAnalyticsKey(groupBy, 80)) {
      ElMessage.warning(t('metrics.widgetConfig.invalidGroupBy'))
      return
    }
    config.steps = steps
    if (groupBy) config.groupBy = groupBy
    const journeyKey = widgetConfigForm.journeyKey.trim()
    if (journeyKey && !validAnalyticsKey(journeyKey, 80)) {
      ElMessage.warning(t('metrics.widgetConfig.invalidJourneyKey'))
      return
    }
    if (journeyKey) config.journeyKey = journeyKey
  } else if (type === 'core.retention') {
    const cohortEvent = widgetConfigForm.cohortEvent.trim()
    const returnEvent = widgetConfigForm.returnEvent.trim()
    const dayValues = widgetConfigForm.retentionDaysText
      .split(/[\s,，]+/)
      .filter(Boolean)
      .map((value) => Number(value))
    const days = [...new Set(dayValues)].sort((left, right) => left - right)
    if (!validAnalyticsKey(cohortEvent) || !validAnalyticsKey(returnEvent)) {
      ElMessage.warning(t('metrics.widgetConfig.invalidRetentionEvents'))
      return
    }
    if (days.length < 1 || days.length > 30
      || days.some((day) => !Number.isInteger(day) || day < 0 || day > 90)) {
      ElMessage.warning(t('metrics.widgetConfig.invalidRetentionDays'))
      return
    }
    config.cohortEvent = cohortEvent
    config.returnEvent = returnEvent
    config.days = days
  }

  widgetConfigDialogVisible.value = false
  if (widgetConfigTargetId.value) {
    const item = dashboardLayout.value.find((candidate) => candidate.i === widgetConfigTargetId.value)
    if (item) {
      item.config = config
      item.w = Math.min(12, Math.max(item.minW || 2, widgetConfigForm.width))
      item.h = Math.min(40, Math.max(item.minH || 2, widgetConfigForm.height))
      item.x = Math.min(item.x, 12 - item.w)
    }
    syncAnalyticsConfigFromLayout()
    syncAdaptivePageSizes()
    widgetConfigTargetId.value = ''
    void nextTick(() => refreshAll())
    return
  }
  appendWidgetType(type, config)
}

const applyServerDashboard = (dashboard: AdminDashboard) => {
  const widgets = dashboard.definition?.widgets
  if (!Array.isArray(widgets)) return false
  dashboardDefaultRange.value = dashboard.definition.defaultRange ?? '7d'
  if (!filters.dateRange) {
    filters.dateRange = dateRangeForDashboardPreset(dashboardDefaultRange.value)
  }
  dashboardLayout.value = widgets.map((widget) => ({
    i: widget.id,
    type: widget.type,
    config: widget.config ? JSON.parse(JSON.stringify(widget.config)) : undefined,
    x: widget.layout.x,
    y: widget.layout.y,
    w: widget.layout.w,
    h: widget.layout.h,
    minW: widget.layout.minW,
    minH: widget.layout.minH,
  }))

  const config: DashboardAnalyticsConfig = {}
  for (const widget of widgets) {
    if (widget.type === 'core.productFunnel' && Array.isArray(widget.config?.steps)) {
      const steps = widget.config.steps.filter((step): step is string => typeof step === 'string')
      if (steps.length >= 2) {
        config.funnel = {
          steps,
          groupBy: typeof widget.config.groupBy === 'string' ? widget.config.groupBy : undefined,
          journeyKey: typeof widget.config.journeyKey === 'string' ? widget.config.journeyKey : undefined,
        }
      }
    }
    if (widget.type === 'core.retention'
      && typeof widget.config?.cohortEvent === 'string'
      && typeof widget.config.returnEvent === 'string'
      && Array.isArray(widget.config.days)) {
      config.retention = {
        cohortEvent: widget.config.cohortEvent,
        returnEvent: widget.config.returnEvent,
        days: widget.config.days.filter((day): day is number => Number.isInteger(day)),
      }
    }
  }
  dashboardAnalyticsConfig.value = config
  return true
}

const syncAnalyticsConfigFromLayout = () => {
  const next: DashboardAnalyticsConfig = { ...dashboardAnalyticsConfig.value }
  const funnel = dashboardLayout.value.find((item) => resolvedWidgetType(item) === 'core.productFunnel')
  if (!funnel) {
    delete next.funnel
  } else if (Array.isArray(funnel.config?.steps)) {
    next.funnel = {
      steps: funnel.config.steps.filter((step): step is string => typeof step === 'string'),
      groupBy: typeof funnel.config.groupBy === 'string' ? funnel.config.groupBy : undefined,
      journeyKey: typeof funnel.config.journeyKey === 'string' ? funnel.config.journeyKey : undefined,
    }
  }
  const retentionWidget = dashboardLayout.value.find((item) => resolvedWidgetType(item) === 'core.retention')
  if (!retentionWidget) {
    delete next.retention
  } else if (typeof retentionWidget.config?.cohortEvent === 'string'
    && typeof retentionWidget.config.returnEvent === 'string'
    && Array.isArray(retentionWidget.config.days)) {
    next.retention = {
      cohortEvent: retentionWidget.config.cohortEvent,
      returnEvent: retentionWidget.config.returnEvent,
      days: retentionWidget.config.days.filter((day): day is number => Number.isInteger(day)),
    }
  }
  dashboardAnalyticsConfig.value = next
}

let layoutLoadGeneration = 0

const loadLayout = async () => {
  const generation = ++layoutLoadGeneration
  const projectId = filters.projectId
  const space = activeSpace.value
  const spaceDefinition = dashboardSpaces.value.find((item) => item.key === space)
  if (!spaceDefinition) return
  dashboardAnalyticsConfig.value = {}
  dashboardDefaultRange.value = '7d'
  if (projectId) {
    try {
      const response = await getProjectDashboards(projectId)
      if (generation !== layoutLoadGeneration
        || filters.projectId !== projectId
        || activeSpace.value !== space) return
      serverDashboards.value = response.data.data
      const dashboard = serverDashboards.value.find(
        (item) => item.dashboardKey === space && item.isActive,
      )
      if (dashboard && applyServerDashboard(dashboard)) return
    } catch (error) {
      if (generation !== layoutLoadGeneration
        || filters.projectId !== projectId
        || activeSpace.value !== space) return
      serverDashboards.value = []
      dashboardLayout.value = []
      ElMessage.error(getErrorMessage(error, t('metrics.dashboardLoadFailed')))
      return
    }
  }
  if (generation !== layoutLoadGeneration
    || filters.projectId !== projectId
    || activeSpace.value !== space) return
  dashboardLayout.value = cloneDashboardLayout(spaceDefinition.defaultLayout)
  if (!filters.dateRange) {
    filters.dateRange = dateRangeForDashboardPreset(dashboardDefaultRange.value)
  }
  syncAnalyticsConfigFromLayout()
}

const widgetTypeFromId = (id: string) => {
  if (id.startsWith('trafficOverview')) return 'core.trafficOverview'
  if (id.startsWith('trafficTrends')) return 'core.trafficTrends'
  if (id.startsWith('productFunnel')) return 'core.productFunnel'
  if (id.startsWith('topEvents')) return 'core.topEvents'
  if (id.startsWith('rankings')) return 'core.topPages'
  if (id.startsWith('referrers')) return 'core.topReferrers'
  if (id.startsWith('overview')) return 'core.overview'
  if (id.startsWith('trends')) return 'core.trends'
  if (id.startsWith('retention')) return 'core.retention'
  if (id.startsWith('counters')) return 'core.counters'
  if (id.startsWith('events')) return 'core.events'
  if (id.startsWith('devices')) return 'core.devices'
  if (id.startsWith('sessions')) return 'core.sessions'
  if (id.startsWith('traffic')) return 'core.traffic'
  return null
}

const resolvedWidgetType = (item: DashboardItem) => item.type || widgetTypeFromId(item.i)
const isWidgetType = (item: DashboardItem, type: string) => resolvedWidgetType(item) === type
const emptyExtensionConfig = Object.freeze({}) as DashboardExtensionConfig
type ExtensionWidgetBinding = Readonly<{
  extension: DashboardWidgetExtension
  config: DashboardExtensionConfig
}>
type ExtensionWidgetBindingCache = {
  type: string | null
  space: DashboardSpaceKey
  sourceConfig: unknown
  binding?: ExtensionWidgetBinding
}
const extensionWidgetBindingCache = new WeakMap<DashboardItem, ExtensionWidgetBindingCache>()
const extensionBindingForWidget = (item: DashboardItem): ExtensionWidgetBinding | undefined => {
  const type = resolvedWidgetType(item)
  const sourceConfig = item.config
  const cached = extensionWidgetBindingCache.get(item)
  if (cached?.type === type && cached.space === activeSpace.value
    && cached.sourceConfig === sourceConfig) {
    return cached.binding
  }

  const extension = getDashboardWidgetExtension(type)
  let binding: ExtensionWidgetBinding | undefined
  if (extension?.spaces.includes(activeSpace.value)) {
    const normalizedConfig = sourceConfig === undefined
      ? (extension.configRequired ? null : emptyExtensionConfig)
      : normalizeDashboardExtensionConfig(extension, sourceConfig)
    if (normalizedConfig) {
      binding = {
        extension,
        config: normalizedConfig === emptyExtensionConfig
          ? emptyExtensionConfig
          : readonly(normalizedConfig as object) as DashboardExtensionConfig,
      }
    }
  }
  extensionWidgetBindingCache.set(item, {
    type,
    space: activeSpace.value,
    sourceConfig,
    binding,
  })
  return binding
}
const extensionForWidget = (item: DashboardItem) => extensionBindingForWidget(item)?.extension
const extensionComponent = (item: DashboardItem) =>
  extensionForWidget(item)?.component || 'div'
const extensionDisplayName = (extension: DashboardWidgetExtension) => {
  const preferred = locale.value === 'zh'
    ? ['zh-CN', 'zh', 'default', 'en']
    : ['en', 'default', 'zh-CN', 'zh']
  for (const key of preferred) {
    const value = extension.displayName[key]
    if (value) return value
  }
  return Object.values(extension.displayName)[0] || extension.type
}
const extensionConfig = (item: DashboardItem): DashboardExtensionConfig =>
  extensionBindingForWidget(item)?.config || emptyExtensionConfig
const updateExtensionWidgetConfig = (item: DashboardItem, config: unknown) => {
  if (!isLayoutEditable.value || !dashboardLayout.value.some((candidate) => candidate === item)) return
  const extension = extensionForWidget(item)
  if (!extension) return
  const cloned = normalizeDashboardExtensionConfig(extension, config)
  if (!cloned) {
    ElMessage.warning(t('metrics.extension.invalidConfig'))
    return
  }
  item.config = cloned
}
const configForWidget = (type: string): Record<string, unknown> =>
  dashboardLayout.value.find((item) => resolvedWidgetType(item) === type)?.config || {}

const pageSizeForWidget = (type: string) => {
  const item = dashboardLayout.value.find((candidate) => resolvedWidgetType(candidate) === type)
  return item ? adaptiveWidgetPageSize(type, item.h) : null
}

const syncAdaptivePageSizes = () => {
  const changed: string[] = []
  const sync = (type: string, result: PagedResult<unknown>) => {
    const pageSize = pageSizeForWidget(type)
    if (pageSize === null || result.pageSize === pageSize) return
    result.page = 1
    result.pageSize = pageSize
    changed.push(type)
  }
  sync('core.events', events)
  sync('core.devices', devices)
  sync('core.sessions', sessions)
  sync('core.traffic', traffic)
  return changed
}

const getWidgetLabel = (item: DashboardItem) => {
  if (typeof item.config?.title === 'string' && item.config.title.trim()) {
    return item.config.title.trim()
  }
  const type = resolvedWidgetType(item)
  const extension = getDashboardWidgetExtension(type)
  if (extension) return extensionDisplayName(extension)
  return type && widgetLabelKeys[type] ? t(widgetLabelKeys[type]) : item.i
}

const hasCustomWidgetTitle = (item: DashboardItem) =>
  typeof item.config?.title === 'string' && Boolean(item.config.title.trim())

const widgetConfig = (type: string): Record<string, unknown> | undefined => {
  if (type === 'core.productFunnel' && dashboardAnalyticsConfig.value.funnel) {
    return dashboardAnalyticsConfig.value.funnel
  }
  if (type === 'core.retention' && dashboardAnalyticsConfig.value.retention) {
    return dashboardAnalyticsConfig.value.retention
  }
  return undefined
}

const toServerDefinition = (): DashboardDefinition | null => {
  if (dashboardLayout.value.length > 50) return null
  const widgets: DashboardWidgetDefinition[] = []
  const widgetIds = new Set<string>()
  const widgetTypes = new Set<string>()
  for (const item of dashboardLayout.value) {
    const type = resolvedWidgetType(item)
    if (!type || widgetIds.has(item.i) || widgetTypes.has(type)) return null
    const extension = getDashboardWidgetExtension(type)
    if (!widgetLabelKeys[type] && (!extension || !extension.spaces.includes(activeSpace.value))) {
      return null
    }
    let config = item.config ?? widgetConfig(type)
    config = withoutLegacyFixedPageSize(type, config)
    if (extension) {
      if (config === undefined && extension.configRequired) return null
      if (config !== undefined) {
        const cloned = normalizeDashboardExtensionConfig(extension, config)
        if (!cloned) return null
        config = cloned
      }
    }
    widgetIds.add(item.i)
    widgetTypes.add(type)
    widgets.push({
      id: item.i,
      type,
      layout: {
        x: item.x,
        y: item.y,
        w: item.w,
        h: item.h,
        minW: item.minW,
        minH: item.minH,
      },
      config,
    })
  }
  return {
    schemaVersion: 1,
    defaultRange: dashboardDefaultRange.value,
    widgets,
  }
}

const saveServerDashboard = async () => {
  if (!filters.projectId) return false
  const projectId = filters.projectId
  const space = activeSpace.value
  const definition = toServerDefinition()
  if (!definition) {
    ElMessage.error(t('metrics.dashboardUnsupportedWidget'))
    return false
  }
  const existing = serverDashboards.value.find((item) => item.dashboardKey === space)
  const spaceDefinition = activeSpaceDefinition.value
  dashboardSaving.value = true
  try {
    const response = await upsertProjectDashboard(projectId, space, {
      displayName: spaceDefinition.displayName,
      description: spaceDefinition.description,
      schemaVersion: 1,
      definition,
      expectedRevision: existing?.revision ?? 0,
      isDefault: dashboardSpaces.value[0]?.key === space,
      isActive: true,
    })
    if (filters.projectId !== projectId || activeSpace.value !== space) return false
    const saved = response.data.data
    serverDashboards.value = [
      ...serverDashboards.value.filter((item) => item.dashboardKey !== saved.dashboardKey),
      saved,
    ]
    ElMessage.success(t('metrics.dashboardSaved'))
    return true
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('metrics.dashboardSaveFailed')))
    return false
  } finally {
    dashboardSaving.value = false
  }
}

const completeLayoutEditing = async () => {
  if (!await saveServerDashboard()) return
  layoutBeforeEditing.value = null
  isLayoutEditable.value = false
}

// --- 5. Formatting & Computation ---
const numberFormatter = computed(() =>
  new Intl.NumberFormat(locale.value === 'zh' ? 'zh-CN' : 'en-US')
)
const formatNumber = (value: number) => numberFormatter.value.format(value)

const formatTimestamp = (value: number) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString()
}

const identityScopeLabel = (scope: string | null) => {
  if (scope === 'anonymous') return t('metrics.analyticsIdentity.anonymous')
  if (scope === 'cloud_account') return t('metrics.analyticsIdentity.cloudAccount')
  return t('metrics.analyticsIdentity.unknown')
}

const formatDuration = (value: number) => {
  if (!value || value <= 0) return '0s'
  const seconds = Math.floor(value / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

const formatPercent = (value: number) => {
  if (!Number.isFinite(value)) return '-'
  return `${(value * 100).toFixed(1)}%`
}

const overviewMetricValues = computed<Partial<Record<OverviewMetricKey, string>>>(() => {
  if (!overview.value) return {}
  const leadingVersion = findTopActiveAppVersion(appVersions.value?.items ?? [])
  const leadingVersionLabel = appVersionsFailed.value
    ? t('metrics.appVersions.unavailable')
    : leadingVersion
      ? `v${leadingVersion.appVersion}`
      : '—'
  return {
    [OVERVIEW_METRIC_KEYS.activeDevices]: formatNumber(overview.value.devicesActive),
    [OVERVIEW_METRIC_KEYS.activeActors]: formatNumber(overview.value.usersActive),
    [OVERVIEW_METRIC_KEYS.eventOccurrences]: formatNumber(overview.value.eventsTotal),
    [OVERVIEW_METRIC_KEYS.topActiveAppVersion]: leadingVersionLabel,
    [OVERVIEW_METRIC_KEYS.accountCreated]: formatNumber(overview.value.cloudAccountsCreated),
    [OVERVIEW_METRIC_KEYS.accountRecreated]: formatNumber(overview.value.cloudAccountsRecreated),
  }
})

const overviewItemsForWidget = (item: DashboardItem) => {
  if (!overview.value) return []
  const metricByKey = new Map(OVERVIEW_METRIC_CATALOG.map(metric => [metric.key, metric]))
  return resolveOverviewMetricKeys(item.config?.metricKeys, overview.value.availableMetricKeys)
    .flatMap(key => {
      const metric = metricByKey.get(key)
      const value = overviewMetricValues.value[key]
      return metric && value !== undefined ? [{
        key,
        label: t(metric.labelKey),
        value,
        help: t(metric.helpKey),
      }] : []
    })
}
const businessTrendsHelp = computed(() => {
  const available = new Set(resolveTrendMetricKeys(trends.value?.availableMetricKeys))
  return available.has(OVERVIEW_METRIC_KEYS.accountCreated)
    || available.has(OVERVIEW_METRIC_KEYS.accountRecreated)
    ? t('metrics.help.trendsWithAccounts')
    : t('metrics.help.trendsActivityOnly')
})

const trafficOverviewItems = computed(() => {
  if (!trafficSummary.value) return {}
  const pageViews = trafficSummary.value.pageViews
  const visitors = trafficSummary.value.visitors
  return {
    [t('metrics.trafficOverviewItems.pageViews')]: formatNumber(pageViews),
    [t('metrics.trafficOverviewItems.visitors')]: formatNumber(visitors),
    [t('metrics.trafficOverviewItems.viewsPerVisitor')]: visitors > 0
      ? (pageViews / visitors).toFixed(2)
      : '0.00',
  }
})

const productFunnelRows = computed(() => {
  return (productFunnel.value?.groups || []).flatMap(group =>
    group.steps.map(step => ({
      groupKey: group.groupValue || 'all',
      step: step.eventType,
      users: step.users,
      conversionRate: step.conversionRate,
      dropOffRate: step.dropOffRate,
    }))
  )
})

const productFunnelCountLabel = computed(() =>
  productFunnel.value?.countingUnit === 'journeys' ? t('tables.journeys') : t('tables.users'),
)

const funnelGroupLabel = (groupKey: string) => dashboardAnalyticsConfig.value.funnel?.groupBy
  ? groupKey
  : t('tables.allUsers')

// --- 6. Metric Loading Functions ---
const loadOverview = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  overviewLoading.value = true
  try {
    const params = cleanParams({ projectId: context.projectId, ...rangeParams(context.snapshot) })
    const overviewRes = await getMetricsOverview(params)

    if (!isCurrentProjectContext(context)) return
    overview.value = overviewRes.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.overviewFailed')))
  } finally {
    if (isCurrentProjectContext(context)) overviewLoading.value = false
  }
}

const loadAppVersions = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  appVersions.value = null
  appVersionsFailed.value = false
  appVersionsLoading.value = true
  try {
    const response = await getAppVersionDistribution(cleanParams({
      projectId: context.projectId,
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    appVersions.value = response.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) {
      appVersionsFailed.value = true
      ElMessage.error(getErrorMessage(error, t('errors.appVersionsFailed')))
    }
  } finally {
    if (isCurrentProjectContext(context)) appVersionsLoading.value = false
  }
}

const loadTrends = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const configuredGranularity = configForWidget('core.trends').granularity
  const granularity: MetricsGranularity = configuredGranularity === 'hour' || configuredGranularity === 'day'
    ? configuredGranularity
    : context.snapshot.granularity
  trendsLoading.value = true
  try {
    const res = await getMetricsTrends(cleanParams({ projectId: context.projectId, granularity, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    trends.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.trendsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) trendsLoading.value = false
  }
}

const loadTopEvents = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const config = configForWidget('core.topEvents')
  const configuredLimit = typeof config.limit === 'number' ? config.limit : context.snapshot.topEventsLimit
  const aggregation = config.aggregation === 'raw' ? 'raw' as const : 'semantic' as const
  topEventsLoading.value = true
  try {
    const res = await getTopEvents(cleanParams({
      projectId: context.projectId,
      limit: configuredLimit,
      aggregation,
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    topEvents.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.topEventsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) topEventsLoading.value = false
  }
}

const loadSemanticEventCatalog = async (context: ProjectRequestContext = captureProjectContext()) => {
  try {
    const response = await getEventCatalog(context.projectId)
    if (!isCurrentProjectContext(context)) return
    semanticEventCatalog.value = response.data.data.items
  } catch {
    // Semantic labels are an enhancement; raw event keys remain a safe fallback.
    if (isCurrentProjectContext(context)) semanticEventCatalog.value = []
  }
}

const loadEvents = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const config = configForWidget('core.events')
  const pageSize = pageSizeForWidget('core.events') ?? events.pageSize
  events.pageSize = pageSize
  const eventType = typeof config.eventType === 'string' ? config.eventType : context.snapshot.eventType
  eventsLoading.value = true
  try {
    const res = await getEvents(buildEventRecordQuery({
      projectId: context.projectId,
      page: context.snapshot.eventsPage,
      pageSize,
      eventType,
      userId: context.snapshot.userId,
      resolvedActorId: context.snapshot.resolvedActorId,
      deviceId: context.snapshot.deviceId,
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(events, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.eventsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) eventsLoading.value = false
  }
}

const loadDevices = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const pageSize = pageSizeForWidget('core.devices') ?? devices.pageSize
  devices.pageSize = pageSize
  devicesLoading.value = true
  try {
    const res = await getDevices(cleanParams({ projectId: context.projectId, page: context.snapshot.devicesPage, pageSize, deviceId: context.snapshot.deviceId, apiKey: context.snapshot.apiKey, isBanned: context.snapshot.isBanned === '' ? undefined : context.snapshot.isBanned === 'true', ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(devices, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.devicesFailed')))
  } finally {
    if (isCurrentProjectContext(context)) devicesLoading.value = false
  }
}

const loadSessions = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const pageSize = pageSizeForWidget('core.sessions') ?? sessions.pageSize
  sessions.pageSize = pageSize
  sessionsLoading.value = true
  try {
    const res = await getSessions(cleanParams({ projectId: context.projectId, page: context.snapshot.sessionsPage, pageSize, sessionId: context.snapshot.sessionId, userId: context.snapshot.userId, deviceId: context.snapshot.deviceId, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(sessions, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.sessionsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) sessionsLoading.value = false
  }
}

const loadTrafficTrends = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const configuredGranularity = configForWidget('core.trafficTrends').granularity
  const allowedGranularities: TrafficGranularity[] = ['hour', 'day', 'week', 'month', 'year']
  const granularity: TrafficGranularity = typeof configuredGranularity === 'string'
    && allowedGranularities.includes(configuredGranularity as TrafficGranularity)
    ? configuredGranularity as TrafficGranularity
    : context.snapshot.granularity
  trafficTrendsLoading.value = true
  try {
    const res = await getTrafficTrends(cleanParams({ projectId: context.projectId, granularity, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    trafficTrends.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.trafficTrendsFailed')))
  } finally {
    if (isCurrentProjectContext(context)) trafficTrendsLoading.value = false
  }
}

const loadTrafficSummary = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  trafficSummaryLoading.value = true
  try {
    const res = await getTrafficSummary(cleanParams({ projectId: context.projectId, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    trafficSummary.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.trafficSummaryFailed')))
  } finally {
    if (isCurrentProjectContext(context)) trafficSummaryLoading.value = false
  }
}

const loadTopPages = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const configuredLimit = configForWidget('core.topPages').limit
  const limit = typeof configuredLimit === 'number' ? configuredLimit : context.snapshot.topEventsLimit
  topPagesLoading.value = true
  try {
    const res = await getTopPages(cleanParams({ projectId: context.projectId, limit, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    topPages.value = res.data.data.items
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.topPagesFailed')))
  } finally {
    if (isCurrentProjectContext(context)) topPagesLoading.value = false
  }
}

const loadTopReferrers = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const configuredLimit = configForWidget('core.topReferrers').limit
  const limit = typeof configuredLimit === 'number' ? configuredLimit : context.snapshot.topEventsLimit
  topReferrersLoading.value = true
  try {
    const res = await getTopReferrers(cleanParams({ projectId: context.projectId, limit, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    topReferrers.value = res.data.data.items
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.topReferrersFailed')))
  } finally {
    if (isCurrentProjectContext(context)) topReferrersLoading.value = false
  }
}

const loadTraffic = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const pageSize = pageSizeForWidget('core.traffic') ?? traffic.pageSize
  traffic.pageSize = pageSize
  trafficLoading.value = true
  try {
    const res = await getTrafficMetrics(cleanParams({ projectId: context.projectId, page: context.snapshot.trafficPage, pageSize, userId: context.snapshot.userId, deviceId: context.snapshot.deviceId, sessionId: context.snapshot.sessionId, ...rangeParams(context.snapshot) }))
    if (!isCurrentProjectContext(context)) return
    Object.assign(traffic, res.data.data)
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.trafficFailed')))
  } finally {
    if (isCurrentProjectContext(context)) trafficLoading.value = false
  }
}

const loadProductFunnel = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const sourceConfig = dashboardAnalyticsConfig.value.funnel
  const config = sourceConfig ? {
    steps: [...sourceConfig.steps],
    groupBy: sourceConfig.groupBy,
    journeyKey: sourceConfig.journeyKey,
  } : undefined
  if (!config) {
    productFunnel.value = null
    return
  }
  productFunnelLoading.value = true
  try {
    const res = await getProductFunnel(cleanParams({
      projectId: context.projectId,
      steps: config.steps.join(','),
      groupBy: config.groupBy,
      journeyKey: config.journeyKey,
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    productFunnel.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.productFunnelFailed')))
  } finally {
    if (isCurrentProjectContext(context)) productFunnelLoading.value = false
  }
}

const loadRetention = async (context: ProjectRequestContext = captureProjectContext()) => {
  if (!requireProject()) return
  const sourceConfig = dashboardAnalyticsConfig.value.retention
  const config = sourceConfig ? { ...sourceConfig, days: [...sourceConfig.days] } : undefined
  if (!config) {
    retention.value = null
    return
  }
  retentionLoading.value = true
  try {
    const res = await getProductRetention(cleanParams({
      projectId: context.projectId,
      cohortEvent: config.cohortEvent,
      returnEvent: config.returnEvent,
      days: config.days.join(','),
      ...rangeParams(context.snapshot),
    }))
    if (!isCurrentProjectContext(context)) return
    retention.value = res.data.data
  } catch (error) {
    if (isCurrentProjectContext(context)) ElMessage.error(getErrorMessage(error, t('errors.retentionFailed')))
  } finally {
    if (isCurrentProjectContext(context)) retentionLoading.value = false
  }
}

// --- 7. Action Handlers ---
const loadSemanticDefinitions = async () => {
  const projectId = filters.projectId
  if (!projectId) return
  try {
    const response = await getSemanticDefinitions(projectId)
    if (filters.projectId === projectId) semanticDefinitions.value = response.data.data.items
  } catch {
    if (filters.projectId === projectId) semanticDefinitions.value = []
  }
}

const resetPages = () => {
  events.page = 1; devices.page = 1; sessions.page = 1; traffic.page = 1
}

const beginTargetedRequestContext = () => {
  metricsRequestGeneration += 1
  clearLoadingStates()
  return captureProjectContext()
}

const handleEventsPageChange = (page: number) => {
  events.page = page
  void loadEvents(beginTargetedRequestContext())
}
const handleDevicesPageChange = (page: number) => {
  devices.page = page
  void loadDevices(beginTargetedRequestContext())
}
const handleSessionsPageChange = (page: number) => {
  sessions.page = page
  void loadSessions(beginTargetedRequestContext())
}
const handleTrafficPageChange = (page: number) => {
  traffic.page = page
  void loadTraffic(beginTargetedRequestContext())
}

const applyFilters = async () => {
  if (!requireProject()) return
  resetPages()
  commitFilterSnapshot()
  await refreshAll()
}

const refreshAll = async () => {
  if (!requireProject()) return
  extensionRefreshToken.value += 1
  const context = beginRefreshContext()
  const widgetTypes = dashboardLayout.value.map((item) => resolvedWidgetType(item))
  refreshing.value = true
  try {
    const loadPromises: Promise<void>[] = []
    if (widgetTypes.some((type) => type === 'core.topEvents' || type === 'core.events')) {
      loadPromises.push(loadSemanticEventCatalog(context))
    }
    if (widgetTypes.some((type) => type === 'core.productFunnel' || type === 'core.retention')) {
      loadPromises.push(loadSemanticDefinitions())
    }
    if (widgetTypes.some((type) => type === 'core.overview' || type === 'core.devices')) {
      loadPromises.push(loadAppVersions(context))
    }
    for (const type of widgetTypes) {
      if (type === 'core.overview') loadPromises.push(loadOverview(context))
      else if (type === 'core.trends') loadPromises.push(loadTrends(context))
      else if (type === 'core.topEvents') loadPromises.push(loadTopEvents(context))
      else if (type === 'core.trafficOverview') loadPromises.push(loadTrafficSummary(context))
      else if (type === 'core.trafficTrends') loadPromises.push(loadTrafficTrends(context))
      else if (type === 'core.topPages') loadPromises.push(loadTopPages(context))
      else if (type === 'core.topReferrers') loadPromises.push(loadTopReferrers(context))
      else if (type === 'core.productFunnel') loadPromises.push(loadProductFunnel(context))
      else if (type === 'core.retention') loadPromises.push(loadRetention(context))
      else if (type === 'core.traffic') loadPromises.push(loadTraffic(context))
      else if (type === 'core.events') loadPromises.push(loadEvents(context))
      else if (type === 'core.devices') loadPromises.push(loadDevices(context))
      else if (type === 'core.sessions') loadPromises.push(loadSessions(context))
    }
    await Promise.all(loadPromises)
  } finally {
    if (isCurrentProjectContext(context)) refreshing.value = false
  }
}

const chartInstances: Record<string, ECharts> = {}
let resizeObserver: ResizeObserver | null = null

const initChart = (id: string, theme: string = 'light') => {
  const el = document.getElementById(id)
  if (!el) return null
  
  if (chartInstances[id]) {
    chartInstances[id].dispose()
  }

  // Create chart
  const chart = init(el, theme)
  chartInstances[id] = chart

  // Setup ResizeObserver to handle fluid layouts perfectly
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
  }
  resizeObserver.observe(el)
  
  return chart
}

const handleResize = () => {
  // Use requestAnimationFrame for smoother rendering during transitions
  requestAnimationFrame(() => {
    Object.values(chartInstances).forEach(chart => {
      if (chart) chart.resize()
    })
  })
}

const handleLayoutUpdated = () => {
  clearDashboardGridPreview()
  handleResize()
  const changedTypes = syncAdaptivePageSizes()
  if (!filters.projectId || changedTypes.length === 0) return
  const context = beginTargetedRequestContext()
  for (const type of changedTypes) {
    if (!dashboardLayout.value.some((item) => resolvedWidgetType(item) === type)) continue
    if (type === 'core.events') void loadEvents(context)
    else if (type === 'core.devices') void loadDevices(context)
    else if (type === 'core.sessions') void loadSessions(context)
    else if (type === 'core.traffic') void loadTraffic(context)
  }
}

const formatTrendAxisLabel = (value: string, granularity: TrafficGranularity) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const displayLocale = locale.value === 'zh' ? 'zh-CN' : 'en-US'
  if (granularity === 'hour') {
    return date.toLocaleString(displayLocale, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  }
  if (granularity === 'month') {
    return date.toLocaleDateString(displayLocale, { year: 'numeric', month: '2-digit' })
  }
  if (granularity === 'year') return String(date.getFullYear())
  return date.toLocaleDateString(displayLocale)
}

const updateBusinessTrendsChart = () => {
  const widget = dashboardLayout.value.find(w => isWidgetType(w, 'core.trends'))
  if (!widget) return
  const id = 'chart-business-' + widget.i
  const chart = chartInstances[id] || initChart(id)
  if (!chart || !trends.value) return

  const available = new Set(resolveTrendMetricKeys(trends.value.availableMetricKeys))
  const series = [
    available.has(OVERVIEW_METRIC_KEYS.activeActors) ? {
      name: t('metrics.chart.activeUsers'),
      type: 'line',
      smooth: true,
      data: trends.value.points.map(p => p.activeUsers),
      color: '#0071e3',
      areaStyle: { opacity: 0.1 },
    } : null,
    available.has(OVERVIEW_METRIC_KEYS.activeDevices) ? {
      name: t('metrics.chart.activeDevices'),
      type: 'line',
      smooth: true,
      data: trends.value.points.map(p => p.activeDevices),
      color: '#ff9500',
      areaStyle: { opacity: 0.1 },
    } : null,
    available.has(OVERVIEW_METRIC_KEYS.accountCreated) ? {
      name: t('metrics.chart.cloudAccountsCreated'),
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      data: trends.value.points.map(p => p.cloudAccountsCreated),
      color: '#34c759',
    } : null,
    available.has(OVERVIEW_METRIC_KEYS.accountRecreated) ? {
      name: t('metrics.chart.cloudAccountsRecreated'),
      type: 'line',
      smooth: true,
      yAxisIndex: 1,
      lineStyle: { type: 'dashed' },
      data: trends.value.points.map(p => p.cloudAccountsRecreated),
      color: '#af52de',
    } : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null)
  const hasAccountSeries = series.some(item => item.yAxisIndex === 1)
  const option = {
    tooltip: { trigger: 'axis' },
    legend: {
      data: series.map(item => item.name),
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trends.value.points.map((point) => formatTrendAxisLabel(point.time, trends.value!.granularity))
    },
    yAxis: hasAccountSeries ? [
      { type: 'value', name: t('metrics.chart.activityAxis') },
      { type: 'value', name: t('metrics.chart.accountAxis'), splitLine: { show: false } },
    ] : { type: 'value', name: t('metrics.chart.activityAxis') },
    series,
  }
  chart.setOption(option)
}

const updateTrafficTrendsChart = () => {
  const widget = dashboardLayout.value.find(w => isWidgetType(w, 'core.trafficTrends'))
  if (!widget) return
  const id = 'chart-traffic-' + widget.i
  const chart = chartInstances[id] || initChart(id)
  if (!chart || !trafficTrends.value) return

  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: [t('metrics.chart.pageViews'), t('metrics.chart.visitors')], bottom: 0 },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      outerBoundsMode: 'same',
      outerBoundsContain: 'axisLabel',
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: trafficTrends.value.points.map((point) => formatTrendAxisLabel(point.time, trafficTrends.value!.granularity))
    },
    yAxis: { type: 'value' },
    series: [
      {
        name: t('metrics.chart.pageViews'),
        type: 'line',
        smooth: true,
        data: trafficTrends.value.points.map(p => p.pageViews),
        color: '#34c759',
        areaStyle: { opacity: 0.1 }
      },
      {
        name: t('metrics.chart.visitors'),
        type: 'line',
        smooth: true,
        data: trafficTrends.value.points.map(p => p.visitors),
        color: '#5856d6',
        areaStyle: { opacity: 0.1 }
      }
    ]
  }
  chart.setOption(option)
}



const layoutVisible = ref(false)

const clearLoadingStates = () => {
  overviewLoading.value = false
  appVersionsLoading.value = false
  trendsLoading.value = false
  topEventsLoading.value = false
  eventsLoading.value = false
  devicesLoading.value = false
  sessionsLoading.value = false
  trafficLoading.value = false
  trafficSummaryLoading.value = false
  trafficTrendsLoading.value = false
  topPagesLoading.value = false
  topReferrersLoading.value = false
  productFunnelLoading.value = false
  retentionLoading.value = false
  refreshing.value = false
}

const clearProjectScopedState = () => {
  overview.value = null
  appVersions.value = null
  appVersionsFailed.value = false
  trends.value = null
  topEvents.value = null
  trafficSummary.value = null
  trafficTrends.value = null
  topPages.value = []
  topReferrers.value = []
  productFunnel.value = null
  retention.value = null
  semanticEventCatalog.value = []
  semanticDefinitions.value = []
  widgetConfigDialogVisible.value = false
  widgetConfigType.value = ''
  widgetConfigTargetId.value = ''
  Object.assign(events, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })
  Object.assign(devices, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })
  Object.assign(sessions, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })
  Object.assign(traffic, { projectId: filters.projectId, rangeStart: '', rangeEnd: '', page: 1, pageSize: 10, total: 0, items: [] })
  clearLoadingStates()
}

// --- 8. Watchers & Lifecycle ---
let workspaceGeneration = 0
let bootstrapping = true

const alignActiveSpaceToTemplate = () => {
  if (dashboardSpaces.value.some((space) => space.key === activeSpace.value)) return false
  activeSpace.value = dashboardSpaces.value[0]!.key
  return true
}

const disposeWorkspaceCharts = () => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  for (const [id, chart] of Object.entries(chartInstances)) {
    chart.dispose()
    delete chartInstances[id]
  }
}

const resetProjectDetailFilters = () => {
  filters.dateRange = null
  filters.userId = ''
  filters.resolvedActorId = ''
  filters.deviceId = ''
  filters.sessionId = ''
  filters.apiKey = ''
  filters.isBanned = ''
  filters.eventType = ''
}

const activateWorkspace = async (projectChanged: boolean) => {
  const generation = ++workspaceGeneration
  projectContextGeneration += 1
  metricsRequestGeneration += 1
  const projectId = filters.projectId
  const space = activeSpace.value

  layoutVisible.value = false
  isLayoutEditable.value = false
  layoutBeforeEditing.value = null
  dashboardLayout.value = []
  clearLoadingStates()
  disposeWorkspaceCharts()
  if (projectChanged) {
    serverDashboards.value = []
    clearProjectScopedState()
  }

  if (projectId && routeProjectId.value !== projectId) {
    await router.replace(projectRoute(projectId, 'dashboard'))
  }
  if (generation !== workspaceGeneration
    || projectId !== filters.projectId
    || space !== activeSpace.value) return

  await nextTick()
  await loadLayout()
  if (generation !== workspaceGeneration
    || projectId !== filters.projectId
    || space !== activeSpace.value) return

  resetPages()
  syncAdaptivePageSizes()
  commitFilterSnapshot()
  layoutVisible.value = true
  await nextTick()
  if (projectId) await refreshAll()
  if (generation !== workspaceGeneration
    || projectId !== filters.projectId
    || space !== activeSpace.value) return

  handleResize()
  updateBusinessTrendsChart()
  updateTrafficTrendsChart()
}

watch(activeSpace, () => {
  if (!bootstrapping) void activateWorkspace(false)
})

watch(() => filters.projectId, () => {
  if (bootstrapping) return
  projectContext.selectProject(filters.projectId)
  resetProjectDetailFilters()
  if (alignActiveSpaceToTemplate()) return
  void activateWorkspace(true)
})

watch(selectedProjectId, (projectId) => {
  if (!bootstrapping && projectId && projectId !== filters.projectId) {
    filters.projectId = projectId
  }
})

watch(routeProjectId, (projectId) => {
  if (bootstrapping || !projectId || projectId === filters.projectId) return
  if (projects.value.some((project) => project.projectId === projectId)) {
    filters.projectId = projectId
  }
})

watch(trends, () => nextTick(updateBusinessTrendsChart))
watch(trafficTrends, () => nextTick(updateTrafficTrendsChart))

watch(isLayoutEditable, (val) => {
  if (!val) {
    clearDashboardGridPreview()
    nextTick(handleResize)
  }
})

onMounted(async () => {
  window.addEventListener('resize', handleResize)
  try {
    await projectContext.ensureLoaded(routeProjectId.value)
    filters.projectId = selectedProjectId.value
    alignActiveSpaceToTemplate()
  } catch (error) {
    ElMessage.error(getErrorMessage(error, t('messages.loadProjectsFailed')))
  }
  // Let the project watcher consume the bootstrapping change before enabling it.
  // This keeps the initial page load to one workspace activation and one request batch.
  await nextTick()
  bootstrapping = false
  await activateWorkspace(true)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  disposeWorkspaceCharts()
})
</script>

<style scoped>
.admin-container {
  max-width: 1400px;
  margin: 0 auto;
  color: #1d1d1f;
}

.widget-size-fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.widget-size-fields :deep(.el-input-number) { width: 100%; }

.workspace-area {
  width: 100%;
  min-height: calc(100vh - 300px);
  padding: 10px;
  background: transparent;
  border-radius: 12px;
  border: 1px solid transparent;
  display: block;
  box-sizing: border-box;
}
.workspace-area.is-editing {
  background: #f5f5f7;
  border-color: rgba(0, 0, 0, 0.1);
  -webkit-user-select: none;
  user-select: none;
}

.dashboard-grid {
  transition: all 0.3s ease;
}

.workspace-area.is-editing .dashboard-grid {
  background-image: radial-gradient(
    circle,
    rgba(0, 113, 227, 0.28) 1px,
    transparent 1.5px
  );
  background-position: var(--dashboard-grid-offset) var(--dashboard-grid-offset);
  background-size:
    var(--dashboard-grid-column-pitch)
    var(--dashboard-grid-row-pitch);
}

.workspace-area.is-editing :deep(.vue-grid-placeholder) {
  display: none !important;
}

.dashboard-grid-drop-preview {
  position: absolute;
  z-index: 110;
  box-sizing: border-box;
  pointer-events: none;
  background: rgba(0, 113, 227, 0.1);
  border: 2px dashed rgba(0, 113, 227, 0.72);
  border-radius: 10px;
}

.grid-item-card {
  box-sizing: border-box;
  background: white;
  border-radius: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  transition: all 0.3s ease;
}

.grid-item-card.is-editing {
  overflow: visible !important;
  border-color: #0071e3;
  box-shadow: 0 0 0 1px rgba(0, 113, 227, 0.14), 0 4px 16px rgba(0, 0, 0, 0.08);
  z-index: 100;
  touch-action: none;
}

:deep(.vue-resizable-handle) {
  z-index: 1000 !important;
  opacity: 0;
  transition: opacity 0.2s;
}

.grid-item-card.is-editing :deep(.vue-resizable-handle) {
  opacity: 1;
  width: 24px;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid rgba(0, 113, 227, 0.45);
  border-radius: 7px;
  background:
    linear-gradient(135deg, transparent 44%, #0071e3 45%, #0071e3 52%, transparent 53%) 5px 5px / 12px 12px no-repeat,
    linear-gradient(135deg, transparent 44%, #0071e3 45%, #0071e3 52%, transparent 53%) 9px 9px / 9px 9px no-repeat,
    #ffffff;
  box-shadow: 0 2px 7px rgba(0, 0, 0, 0.18);
  bottom: -7px;
  right: -7px;
  cursor: nwse-resize;
  touch-action: none;
}


.widget-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.widget-header-bar {
  min-height: 34px;
  box-sizing: border-box;
  background: #f5f5f7;
  padding: 5px 9px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: default;
}

.grid-item-card.is-editing .widget-header-bar {
  cursor: grab;
  touch-action: none;
}

.grid-item-card.is-editing .widget-header-bar:active {
  cursor: grabbing;
}

.widget-drag-handle {
  align-self: stretch;
  min-width: 24px;
  justify-content: center;
  cursor: grab;
  color: #6e6e73;
  display: flex;
  align-items: center;
}
.widget-drag-handle:active { cursor: grabbing; }

.widget-label {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: #1d1d1f;
}

.widget-resize-hint {
  color: #86868b;
  font-size: 11px;
  white-space: nowrap;
}

.widget-inner {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px;
  background: white;
  display: flex;
  flex-direction: column;
}

.widget-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
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

.table-header-help {
  margin-left: 5px;
  color: var(--el-text-color-secondary);
  cursor: help;
  vertical-align: middle;
}

.analytics-identity-cell {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 5px;
}

.analytics-identity-cell code {
  overflow: hidden;
  color: var(--el-text-color-primary);
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.analytics-identity-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

/* Scrollbar for widgets */
.widget-inner::-webkit-scrollbar {
  width: 4px;
}
.widget-inner::-webkit-scrollbar-thumb {
  background: #e4e7ed;
  border-radius: 2px;
}

.echart-container {
  width: 100%;
  height: 100%;
  min-height: 200px;
  /* Ensure it has a base size for ECharts to bite onto */
  display: block;
}

.widget-footer-mini {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}

.form-tip {
  margin-top: 6px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  line-height: 1.5;
}

/* Overview Widget Styling */
.overview-grid-compact {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 12px;
  padding: 4px;
}

.traffic-overview-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.overview-mini-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  transition: all 0.2s;
}

.overview-mini-card:hover {
  background: #e6e8eb;
  transform: translateY(-2px);
}

.mini-label {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 4px;
}

.mini-value {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
</style>
