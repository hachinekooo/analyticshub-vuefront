import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import {
  ElAlert,
  ElButton,
  ElDrawer,
  ElEmpty,
  ElIcon,
  ElPopover,
  ElTag,
  ElTimeline,
  ElTimelineItem,
} from 'element-plus'
import UserJourneyDrawer from './UserJourneyDrawer.vue'
import { setLocale } from '@/i18n'
import type { EventJourney, EventRecord } from '@/api/metrics'

const anchor: EventRecord = {
  eventId: 'evt_anchor',
  eventType: 'authoring_started',
  eventTimestamp: Date.parse('2026-01-01T02:00:00Z'),
  createdAt: '2026-01-01T02:00:01Z',
  deviceId: '11111111-1111-4111-8111-111111111111',
  userId: '22222222-2222-4222-8222-222222222222',
  resolvedActorId: '33333333-3333-4333-8333-333333333333',
  identityScope: 'anonymous',
  actorLinked: true,
  sessionId: '44444444-4444-4444-8444-444444444444',
  properties: { entry_point: 'compose' },
}

const journey: EventJourney = {
  projectId: 'sample_project',
  anchorEventId: anchor.eventId,
  subjectType: 'actor',
  resolvedActorId: anchor.resolvedActorId,
  rangeStart: '2026-01-01T01:00:00Z',
  rangeEnd: '2026-01-01T03:00:00Z',
  total: 4,
  truncated: false,
  items: [
    { ...anchor, propertiesBytes: 30, propertiesLoadable: true, propertiesDeferred: false },
    {
      ...anchor,
      eventId: 'evt_cloud',
      eventType: 'cloud_auth_succeeded',
      eventTimestamp: Date.parse('2026-01-01T02:10:00Z'),
      userId: anchor.resolvedActorId,
      identityScope: 'cloud_account',
      actorLinked: false,
      propertiesBytes: 30,
      propertiesLoadable: true,
      propertiesDeferred: false,
    },
    {
      ...anchor,
      eventId: 'evt_deferred',
      eventType: 'diagnostic_payload',
      eventTimestamp: Date.parse('2026-01-01T02:20:00Z'),
      properties: null,
      propertiesBytes: 70 * 1024,
      propertiesLoadable: true,
      propertiesDeferred: true,
    },
    {
      ...anchor,
      eventId: 'evt_pathological',
      eventType: 'pathological_payload',
      eventTimestamp: Date.parse('2026-01-01T02:30:00Z'),
      properties: null,
      propertiesBytes: 3 * 1024 * 1024,
      propertiesLoadable: false,
      propertiesDeferred: true,
    },
  ],
}

describe('UserJourneyDrawer', () => {
  beforeEach(() => setLocale('zh'))
  afterEach(() => { document.body.innerHTML = '' })

  it('shows the selected event inside one chronological identity journey and changes the window explicitly', async () => {
    const wrapper = mount(UserJourneyDrawer, {
      attachTo: document.body,
      props: {
        modelValue: true,
        anchorEvent: anchor,
        journey,
        loading: false,
        windowKey: 'twoHours',
        propertiesLoadingEventIds: [],
        presentEvent: (eventKey: string) => ({
          eventKey,
          displayName: { 'zh-CN': eventKey === 'authoring_started' ? '开始写信' : '云账号登录成功' },
        }),
      },
      global: {
        components: {
          ElAlert,
          ElButton,
          ElDrawer,
          ElEmpty,
          ElIcon,
          ElPopover,
          ElTag,
          ElTimeline,
          ElTimelineItem,
        },
        directives: { loading: () => {} },
      },
    })

    await nextTick()
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(document.body.textContent).toContain('用户旅程')
    expect(document.body.textContent).toContain('开始写信')
    expect(document.body.textContent).toContain('云账号登录成功')
    expect(document.body.textContent).toContain('所选事件')
    expect(document.body.textContent).toContain('#1')
    expect(document.body.textContent).toContain('#4')
    expect(document.body.textContent).toContain('匿名阶段')
    expect(document.body.textContent).toContain('云账号阶段')
    expect(document.body.textContent).toContain('"entry_point": "compose"')
    expect(document.body.textContent).toContain('收起全部详情')
    expect(document.body.textContent).toContain('加载完整属性')
    expect(document.body.textContent).toContain('属性大小为 3 MB，已超过 2 MB 在线查看上限')
    expect(Array.from(document.querySelectorAll('button'))
      .filter(button => button.textContent?.includes('加载完整属性'))).toHaveLength(1)

    const loadPropertiesButton = Array.from(document.querySelectorAll('button'))
      .find(button => button.textContent?.includes('加载完整属性'))
    loadPropertiesButton?.click()
    await nextTick()
    expect(wrapper.emitted('loadProperties')).toEqual([['evt_deferred']])

    const collapseButton = Array.from(document.querySelectorAll('button'))
      .find(button => button.textContent?.includes('收起全部详情'))
    expect(collapseButton).toBeDefined()
    collapseButton?.click()
    await nextTick()
    expect(document.body.textContent).not.toContain('"entry_point": "compose"')
    expect(document.body.textContent).toContain('展开全部详情')

    const dayOption = document.querySelector<HTMLInputElement>('input[type="radio"][value="day"]')
    expect(dayOption).not.toBeNull()
    dayOption?.click()
    await nextTick()
    expect(wrapper.emitted('update:windowKey')).toEqual([['day']])
    wrapper.unmount()
  })
})
