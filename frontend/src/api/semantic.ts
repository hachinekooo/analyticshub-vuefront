import request from '@/utils/request'
import type { ApiResponse } from '@/api/admin'
import { ANALYTICS_QUERY_TIMEOUT_MS } from './analyticsQueryPolicy'

export type SemanticSourceKind = 'EVENT_TYPE'
export type SemanticAliasUpdateMode = 'REPLACE' | 'PRESERVE'

export type SemanticDefinition = {
  projectId: string
  sourceKind: SemanticSourceKind
  semanticKey: string
  origin: 'OFFICIAL' | 'CUSTOM'
  displayName: Record<string, string>
  category: string | null
  description: string | null
  isActive: boolean
  aliases: string[]
  createdAt: string
  updatedAt: string
}

export type SemanticDefinitionsResponse = {
  projectId: string
  sourceKind: SemanticSourceKind
  items: SemanticDefinition[]
}

export type EventCatalogEntry = {
  rawKey: string
  semanticKey: string | null
  mapped: boolean
  displayName: Record<string, string> | null
  category: string | null
  description: string | null
  eventCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export type EventCatalogResponse = {
  projectId: string
  sourceKind: SemanticSourceKind
  items: EventCatalogEntry[]
}

export type SemanticDefinitionUpsertPayload = {
  sourceKind: SemanticSourceKind
  displayName: Record<string, string>
  category?: string
  description?: string
  isActive: boolean
  aliasMode: SemanticAliasUpdateMode
  aliases?: string[]
}

export type AnalyticsPropertyDataType = 'STRING' | 'BOOLEAN' | 'INTEGER' | 'NUMBER'

export type AnalyticsPropertyDefinition = {
  projectId: string
  propertyKey: string
  displayName: Record<string, string>
  dataType: AnalyticsPropertyDataType
  description: string | null
  allowedValues: string[] | null
  filterable: boolean
  groupable: boolean
  journeyKey: boolean
  sensitive: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export type AnalyticsPropertyDefinitionPayload = Omit<
  AnalyticsPropertyDefinition,
  'projectId' | 'propertyKey' | 'createdAt' | 'updatedAt'
>

export type AnalyticsMetricType =
  | 'EVENT_COUNT'
  | 'UNIQUE_ACTORS'
  | 'FUNNEL_CONVERSION'
  | 'RETENTION'

export type AnalyticsMetricDefinition = {
  projectId: string
  metricKey: string
  displayName: Record<string, string>
  metricType: AnalyticsMetricType
  definition: Record<string, unknown>
  description: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type TrustedSchemaPolicy = {
  projectId: string
  propertyKey: string
  trustedValues: string[]
}

export type AnalysisPackImportPayload = {
  packVersion: number
  displayName: Record<string, string>
  manifest: Record<string, unknown>
  confirmDeactivations?: boolean
}

export type AnalysisPackImportResult = {
  projectId: string
  packKey: string
  packVersion: number
  displayName: Record<string, string>
  checksumSha256: string
  active: boolean
  propertyDefinitionsApplied: number
  metricDefinitionsApplied: number
  updatedAt: string
}

export type AnalysisPackDetail = {
  projectId: string
  packKey: string
  packVersion: number
  displayName: Record<string, string>
  manifest: Record<string, unknown>
  checksumSha256: string
  active: boolean
  createdAt: string
  updatedAt: string
  versions: Array<{
    packVersion: number
    displayName: Record<string, string>
    manifest: Record<string, unknown>
    checksumSha256: string
    operation: string
    appliedAt: string
  }>
}

export type AnalyticsMetricResult = {
  projectId: string
  metricKey: string
  metricType: AnalyticsMetricType
  from: string
  to: string
  resultClassification: 'TRUSTED_SCHEMA' | 'CROSS_VERSION_DIAGNOSTIC' | 'UNGOVERNED_DIAGNOSTIC'
  diagnosticReason: string | null
  result: Record<string, unknown>
}

export const getEventCatalog = (projectId: string) =>
  request.get<ApiResponse<EventCatalogResponse>>(
    `/admin/projects/${encodeURIComponent(projectId)}/event-catalog`,
  )

export const getSemanticDefinitions = (projectId: string) =>
  request.get<ApiResponse<SemanticDefinitionsResponse>>(
    `/admin/projects/${encodeURIComponent(projectId)}/semantics`,
  )

export const upsertSemanticDefinition = (
  projectId: string,
  semanticKey: string,
  payload: SemanticDefinitionUpsertPayload,
) =>
  request.put<ApiResponse<SemanticDefinition>>(
    `/admin/projects/${encodeURIComponent(projectId)}/semantics/${encodeURIComponent(semanticKey)}`,
    payload,
  )

export const deleteSemanticDefinition = (projectId: string, semanticKey: string) =>
  request.delete<ApiResponse<{ projectId: string; semanticKey: string; message: string }>>(
    `/admin/projects/${encodeURIComponent(projectId)}/semantics/${encodeURIComponent(semanticKey)}`,
  )

export const getAnalyticsPropertyDefinitions = (projectId: string) =>
  request.get<ApiResponse<{ projectId: string; items: AnalyticsPropertyDefinition[] }>>(
    `/admin/projects/${encodeURIComponent(projectId)}/properties`,
  )

export const upsertAnalyticsPropertyDefinition = (
  projectId: string,
  propertyKey: string,
  payload: AnalyticsPropertyDefinitionPayload,
) =>
  request.put<ApiResponse<AnalyticsPropertyDefinition>>(
    `/admin/projects/${encodeURIComponent(projectId)}/properties/${encodeURIComponent(propertyKey)}`,
    payload,
  )

export const getAnalyticsMetricDefinitions = (projectId: string) =>
  request.get<ApiResponse<AnalyticsMetricDefinition[]>>(
    `/admin/projects/${encodeURIComponent(projectId)}/metrics`,
  )

export const getTrustedSchemaPolicy = (projectId: string) =>
  request.get<ApiResponse<TrustedSchemaPolicy | null>>(
    `/admin/projects/${encodeURIComponent(projectId)}/trusted-schema-policy`,
  )

export type AnalyticsMetricDefinitionPayload = Omit<
  AnalyticsMetricDefinition,
  'projectId' | 'metricKey' | 'createdAt' | 'updatedAt'
>

export const upsertAnalyticsMetricDefinition = (
  projectId: string,
  metricKey: string,
  payload: AnalyticsMetricDefinitionPayload,
) => request.put<ApiResponse<AnalyticsMetricDefinition>>(
  `/admin/projects/${encodeURIComponent(projectId)}/metrics/${encodeURIComponent(metricKey)}`,
  payload,
)

export const getAnalyticsMetricResult = (
  projectId: string,
  metricKey: string,
  params: { from?: string; to?: string },
) => request.get<ApiResponse<AnalyticsMetricResult>>(
  `/admin/projects/${encodeURIComponent(projectId)}/metric-results/${encodeURIComponent(metricKey)}`,
  { params, timeout: ANALYTICS_QUERY_TIMEOUT_MS },
)

export const importAnalysisPack = (
  projectId: string,
  packKey: string,
  payload: AnalysisPackImportPayload,
) =>
  request.put<ApiResponse<AnalysisPackImportResult>>(
    `/admin/projects/${encodeURIComponent(projectId)}/analysis-packs/${encodeURIComponent(packKey)}`,
    payload,
  )

export const getAnalysisPacks = (projectId: string) =>
  request.get<ApiResponse<AnalysisPackDetail[]>>(
    `/admin/projects/${encodeURIComponent(projectId)}/analysis-packs`,
  )
