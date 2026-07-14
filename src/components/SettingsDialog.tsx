import { Focus, Keyboard, Moon, MonitorSmartphone, Sun, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import type { ReaderSettings, ReadingSize, ThemeMode } from '../types'

export function SettingsDialog({ open, settings, onClose, onChange }: {
  open: boolean
  settings: ReaderSettings
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

  return (
    <dialog className="settings-dialog" ref={dialogRef} onClose={onClose} onCancel={onClose}>
      <header className="dialog-header">
        <div><p>READING DESK</p><h2>阅读设置</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭设置" title="关闭设置"><X aria-hidden="true" /></button>
      </header>
      <div className="settings-dialog__body">
        <section>
          <div className="settings-row__label"><MonitorSmartphone aria-hidden="true" /><div><strong>页面外观</strong><span>选择适合当前环境的纸面亮度。</span></div></div>
          <div className="settings-segment" role="radiogroup" aria-label="页面主题">
            <button type="button" role="radio" aria-checked={settings.theme === 'light'} className={settings.theme === 'light' ? 'is-active' : ''} onClick={() => setTheme('light')}><Sun aria-hidden="true" />浅色</button>
            <button type="button" role="radio" aria-checked={settings.theme === 'dark'} className={settings.theme === 'dark' ? 'is-active' : ''} onClick={() => setTheme('dark')}><Moon aria-hidden="true" />深色</button>
          </div>
        </section>
        <section>
          <div className="settings-row__label"><span className="settings-aa">Aa</span><div><strong>正文字号</strong><span>只调整阅读区，工具栏保持稳定。</span></div></div>
          <div className="settings-segment" role="radiogroup" aria-label="正文字号">
            {(['compact', 'comfortable', 'large'] as ReadingSize[]).map((size, index) => (
              <button key={size} type="button" role="radio" aria-checked={settings.readingSize === size} className={settings.readingSize === size ? 'is-active' : ''} onClick={() => setSize(size)}>{['紧凑', '舒适', '大字'][index]}</button>
            ))}
          </div>
        </section>
        <section>
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
            <div><dt><kbd>/</kbd> 或 <kbd>Ctrl K</kbd></dt><dd>搜索题库</dd></div>
            <div><dt><kbd>M</kbd> / <kbd>R</kbd></dt><dd>标记掌握 / 复习</dd></div>
            <div><dt><kbd>F</kbd> / <kbd>N</kbd></dt><dd>收藏 / 打开边注</dd></div>
          </dl>
        </section>
      </div>
    </dialog>
  )
}
