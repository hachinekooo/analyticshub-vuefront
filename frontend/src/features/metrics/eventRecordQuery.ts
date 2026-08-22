export interface EventRecordQueryInput {
  projectId: string
  page: number
  pageSize: number
  eventType?: string
  userId?: string
  resolvedActorId?: string
  deviceId?: string
  from?: string
  to?: string
}

/**
 * 事件明细拥有独立的归一身份筛选；其它明细组件不应误用该条件。
 * 在请求边界去掉空值，确保输入框、筛选快照与后端参数使用同一契约。
 */
export const buildEventRecordQuery = (input: EventRecordQueryInput): EventRecordQueryInput =>
  Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== '' && value !== undefined && value !== null),
  ) as EventRecordQueryInput
