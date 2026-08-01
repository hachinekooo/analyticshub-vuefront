import request from '@/utils/request'
import type { ApiResponse } from '@/api/admin'

export type SemanticSourceKind = 'EVENT_TYPE'
export type SemanticAliasUpdateMode = 'REPLACE' | 'PRESERVE'

export type SemanticDefinition = {
  projectId: string
  sourceKind: SemanticSourceKind
  semanticKey: string
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
