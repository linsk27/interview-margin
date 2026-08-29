import { BookOpen, Brush, FileText, Focus, Keyboard, Moon, MonitorSmartphone, Sun, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { FontTheme, ReaderSettings, ReadingSize, ThemeMode } from '../types'
import { canLoadFontTheme, ensureFontThemeLoaded } from '../lib/fontThemeLoading'

const READING_SIZE_OPTIONS: Array<{
  value: ReadingSize
  label: string
  pixels: string
}> = [
  { value: 'compact', label: '紧凑', pixels: '15 px' },
  { value: 'comfortable', label: '标准', pixels: '17 px' },
  { value: 'large', label: '大字', pixels: '20 px' },
]

const FONT_THEME_OPTIONS: Array<{
  value: FontTheme
  label: string
  description: string
  sample: string
}> = [
  { value: 'clean', label: '清爽', description: '清楚耐看', sample: '今天也要会一道' },
  { value: 'playful', label: '快乐', description: '全站统一快乐手写风', sample: '开心刷题' },
  { value: 'notebook', label: '手账', description: '答案像随手笔记', sample: '慢慢想明白' },
  { value: 'flowing', label: '飘逸', description: '全站统一飘逸行书', sample: '风吹题页' },
]

export function SettingsDialog({ open, settings, spreadAvailable, fontSampleText = '', onClose, onChange }: {
  open: boolean
  settings: ReaderSettings
  spreadAvailable: boolean
  fontSampleText?: string
  onClose: () => void
  onChange: (settings: ReaderSettings) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fontLoadSequence = useRef(0)
  const settingsRef = useRef(settings)
  const [pendingFontTheme, setPendingFontTheme] = useState<FontTheme>()
  settingsRef.current = settings

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => () => {
    fontLoadSequence.current += 1
  }, [])

  const setTheme = (theme: ThemeMode) => onChange({ ...settings, theme })
  const setFontTheme = (fontTheme: FontTheme) => {
    if (fontTheme === settingsRef.current.fontTheme) {
      fontLoadSequence.current += 1
      setPendingFontTheme(undefined)
      return
    }
    if (!canLoadFontTheme()) {
      onChange({ ...settingsRef.current, fontTheme })
      return
    }

    const sequence = ++fontLoadSequence.current
    setPendingFontTheme(fontTheme)
    void (async () => {
      try {
        await ensureFontThemeLoaded(fontTheme, fontSampleText)
        if (sequence !== fontLoadSequence.current) return
        onChange({ ...settingsRef.current, fontTheme })
      } catch (error) {
        if (sequence === fontLoadSequence.current) {
          console.warn('Font theme preload failed; keeping the current readable theme.', error)
        }
      } finally {
        if (sequence === fontLoadSequence.current) setPendingFontTheme(undefined)
      }
    })()
  }
  const setSize = (readingSize: ReadingSize) => onChange({ ...settings, readingSize })
  const setPageLayout = (pageLayout: ReaderSettings['pageLayout']) => onChange({ ...settings, pageLayout })

  return (
    <dialog className="settings-dialog" ref={dialogRef} onClose={onClose} onCancel={onClose} aria-labelledby="settings-title">
      <header className="dialog-header">
        <div><p>READING DESK</p><h2 id="settings-title">阅读设置</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭设置" title="关闭设置"><X aria-hidden="true" /></button>
      </header>
      <div className="settings-dialog__body">
        <section className="settings-panel">
          <div className="settings-row__label"><MonitorSmartphone aria-hidden="true" /><div><strong>页面外观</strong><span>选择适合当前环境的纸面亮度。</span></div></div>
          <div className="settings-segment" role="radiogroup" aria-label="页面主题">
            <button type="button" role="radio" aria-checked={settings.theme === 'light'} className={settings.theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}><Sun aria-hidden="true" />浅色</button>
            <button type="button" role="radio" aria-checked={settings.theme === 'dark'} className={settings.theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}><Moon aria-hidden="true" />深色</button>
          </div>
        </section>
        <section className="settings-panel settings-panel--font">
          <div className="settings-row__label"><Brush aria-hidden="true" /><div><strong>字体气质</strong><span>选择后统一应用于界面、标题与正文。</span></div></div>
          <div className="settings-font-grid" role="radiogroup" aria-label="字体主题">
            {FONT_THEME_OPTIONS.map((option) => {
              const active = settings.fontTheme === option.value
              const loading = pendingFontTheme === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={`${option.label}字体，${option.description}`}
                  aria-busy={loading || undefined}
                  className={`settings-font-option settings-font-option--${option.value}${active ? ' is-active' : ''}${loading ? ' is-loading' : ''}`}
                  onClick={() => setFontTheme(option.value)}
                >
                  <span className="settings-font-option__sample" aria-hidden="true">{option.sample}</span>
                  <span className="settings-font-option__meta">
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                  {(active || loading) && (
                    <span className="settings-font-option__current">{loading ? '载入中' : '当前'}</span>
                  )}
                </button>
              )
            })}
          </div>
        </section>
        <section className="settings-panel">
          <div className="settings-row__label"><span className="settings-aa">Aa</span><div><strong>正文字号</strong><span>正文与段落标题同步缩放，三档尺寸直接对应实际阅读效果。</span></div></div>
          <div className="settings-segment settings-size-segment" role="radiogroup" aria-label="正文字号">
            {READING_SIZE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-label={`${option.label}字号，${option.pixels}`}
                aria-checked={settings.readingSize === option.value}
                className={`settings-size-option settings-size-option--${option.value}${settings.readingSize === option.value ? ' is-active' : ''}`}
                onClick={() => setSize(option.value)}
              >
                <span className="settings-size-option__sample" aria-hidden="true">面试阅读</span>
                <span className="settings-size-option__label">{option.label}<small>{option.pixels}</small></span>
              </button>
            ))}
          </div>
        </section>
        <section className="settings-panel">
          <div className="settings-row__label">
            <BookOpen aria-hidden="true" />
            <div>
              <strong>阅读版式</strong>
              <span>{spreadAvailable ? '单页连续滚动，双页按书页翻阅。' : '当前空间不足，双页会在宽屏时启用。'}</span>
            </div>
          </div>
          <div className="settings-segment settings-segment--two" role="radiogroup" aria-label="阅读版式">
            <button type="button" role="radio" aria-checked={settings.pageLayout === 'single'} className={settings.pageLayout === 'single' ? 'is-active' : ''} onClick={() => setPageLayout('single')}>
              <FileText aria-hidden="true" />单页
            </button>
            <button type="button" role="radio" aria-checked={settings.pageLayout === 'spread'} className={settings.pageLayout === 'spread' ? 'is-active' : ''} onClick={() => setPageLayout('spread')} disabled={!spreadAvailable} title={spreadAvailable ? '双页阅读' : '当前阅读区域宽度不足'}>
              <BookOpen aria-hidden="true" />双页
            </button>
          </div>
        </section>
        <section className="settings-panel">
          <div className="settings-row__label"><Focus aria-hidden="true" /><div><strong>专注阅读</strong><span>隐藏题库与边注，只保留正文。</span></div></div>
          <label className="switch">
            <input type="checkbox" checked={settings.focusMode} onChange={(event) => onChange({ ...settings, focusMode: event.target.checked })} />
            <span aria-hidden="true" />
          </label>
        </section>
        <section className="shortcut-sheet">
          <div className="settings-row__label"><Keyboard aria-hidden="true" /><div><strong>快捷键</strong><span>光标不在输入框时生效。</span></div></div>
          <dl>
            <div><dt><kbd>J</kbd> / <kbd>K</kbd></dt><dd>下一题 / 上一题</dd></div>
            <div><dt><kbd>/</kbd> 或 <kbd>Ctrl K</kbd></dt><dd>搜索全部题库</dd></div>
            <div><dt><kbd>M</kbd> / <kbd>R</kbd></dt><dd>标记掌握 / 复习</dd></div>
            <div><dt><kbd>F</kbd> / <kbd>N</kbd></dt><dd>收藏 / 展开或收起边注</dd></div>
          </dl>
        </section>
      </div>
    </dialog>
  )
}
