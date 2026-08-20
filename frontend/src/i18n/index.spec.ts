import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const importI18n = async () => {
  vi.resetModules()
  return import('./index')
}

describe('i18n locale resolution and fallback', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefers a supported persisted locale over the browser locale', async () => {
    localStorage.setItem('locale', 'zh')
    vi.stubGlobal('navigator', { language: 'en-US' })

    const { locale, t } = await importI18n()

    expect(locale.value).toBe('zh')
    expect(t('buttons.save')).toBe('保存')
  })

  it('uses the browser language when stored data is unsupported', async () => {
    localStorage.setItem('locale', 'fr')
    vi.stubGlobal('navigator', { language: 'zh-CN' })

    const { locale } = await importI18n()

    expect(locale.value).toBe('zh')
  })

  it('defaults to English for other browser languages', async () => {
    vi.stubGlobal('navigator', { language: 'fr-FR' })

    const { locale, t } = await importI18n()

    expect(locale.value).toBe('en')
    expect(t('buttons.save')).toBe('Save')
  })

  it('persists locale changes, interpolates values and returns the key when missing', async () => {
    const { locale, setLocale, t } = await importI18n()

    setLocale('zh')

    expect(locale.value).toBe('zh')
    expect(localStorage.getItem('locale')).toBe('zh')
    expect(t('dialogs.confirmDeleteMessage', { name: 'Demo' })).toContain('Demo')
    expect(t('metrics.counterFields.anyOfRule')).toContain('Any-of')
    expect(t('metrics.counterErrors.clauseEventTypeRequired', { index: 2 })).toContain('2')
    expect(t('missing.translation.key')).toBe('missing.translation.key')
    expect(t('buttons')).toBe('buttons')
  })

  it('keeps every business-trend legend and explanation localized', async () => {
    const { setLocale, t } = await importI18n()
    const keys = [
      'metrics.chart.activeUsers',
      'metrics.chart.activeDevices',
      'metrics.chart.cloudAccountsCreated',
      'metrics.chart.cloudAccountsRecreated',
      'metrics.chart.activityAxis',
      'metrics.chart.accountAxis',
      'metrics.help.productFunnel',
      'metrics.help.retention',
      'tables.allUsers',
    ]

    for (const language of ['zh', 'en'] as const) {
      setLocale(language)
      for (const key of keys) expect(t(key)).not.toBe(key)
    }
  })
})
