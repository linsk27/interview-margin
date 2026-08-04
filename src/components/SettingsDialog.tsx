import { BookOpen, FileText, Focus, Keyboard, Moon, MonitorSmartphone, Sun, Type, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReaderSettings, ReadingFont, ReadingSize, ThemeMode } from '../types'

const READING_FONT_OPTIONS: Array<{
  value: ReadingFont
  label: string
  description: string
}> = [
  { value: 'serif', label: '书刊宋体', description: '层次鲜明，适合沉浸长文' },
  { value: 'sans', label: '清晰黑体', description: '笔画利落，适合快速扫读' },
]

const READING_SIZE_OPTIONS: Array<{
  value: ReadingSize
  label: string
  pixels: string
}> = [
  { value: 'compact', label: '紧凑', pixels: '15 px' },
  { value: 'comfortable', label: '标准', pixels: '17 px' },
  { value: 'large', label: '大字', pixels: '20 px' },
]

export function SettingsDialog({ open, settings, spreadAvailable, onClose, onChange }: {
  open: boolean
  settings: ReaderSettings
  spreadAvailable: boolean
  onClose: () => void
  onChange: (settings: ReaderSettings) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  const setTheme = (theme: ThemeMode) => onChange({ ...settings, theme })
  const setSize = (readingSize: ReadingSize) => onChange({ ...settings, readingSize })
  const setFont = (readingFont: ReadingFont) => onChange({ ...settings, readingFont })
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
        <section className="settings-panel">
          <div className="settings-row__label"><Type aria-hidden="true" /><div><strong>正文字体</strong><span>标题保持书刊层次，正文可按阅读习惯切换。</span></div></div>
          <div className="settings-font-segment" role="radiogroup" aria-label="正文字体">
            {READING_FONT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={settings.readingFont === option.value}
                className={`settings-font-option settings-font-option--${option.value}${settings.readingFont === option.value ? ' is-active' : ''}`}
                onClick={() => setFont(option.value)}
              >
                <span className="settings-font-option__sample" aria-hidden="true">
                  <strong>响应式更新</strong>
                  <small>原理 · 边界 · Aa 0123</small>
                </span>
                <span className="settings-font-option__copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
              </button>
            ))}
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
