import { DatabaseBackup, Merge, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { hashState, importLegacyState } from '../lib/api'
import { markLegacyMigrated } from '../lib/storage'
import type { StudyState } from '../types'

export function LegacyMigrationDialog({ legacy, open, onClose, onImported }: {
  legacy?: StudyState
  open: boolean
  onClose: () => void
  onImported: (state: StudyState) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    if (open && legacy && !ref.current?.open) ref.current?.showModal()
    if ((!open || !legacy) && ref.current?.open) ref.current.close()
  }, [legacy, open])
  if (!legacy) return null
  const counts = {
    progress: Object.keys(legacy.progress).length,
    annotations: legacy.annotations.length,
    days: Object.keys(legacy.activity).length,
  }
  const migrate = async () => {
    setBusy(true)
    setError('')
    try {
      const result = await importLegacyState(legacy, await hashState(legacy))
      markLegacyMigrated(legacy)
      onImported(result.state)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '旧记录迁移失败。')
    } finally {
      setBusy(false)
    }
  }
  return (
    <dialog className="migration-dialog" ref={ref} onCancel={onClose} onClose={onClose}>
      <header className="dialog-header">
        <div><p>ONE-TIME MIGRATION</p><h2>发现浏览器旧记录</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="暂不迁移"><X aria-hidden="true" /></button>
      </header>
      <div className="migration-dialog__body">
        <div className="migration-dialog__mark"><DatabaseBackup aria-hidden="true" /></div>
        <p>可将旧版浏览器记录合并到当前账号。进度取最近打开版本，批注按 ID 去重，每日活动取较大值。</p>
        <dl>
          <div><dt>进度</dt><dd>{counts.progress}</dd></div>
          <div><dt>批注</dt><dd>{counts.annotations}</dd></div>
          <div><dt>活动天数</dt><dd>{counts.days}</dd></div>
        </dl>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="form-actions">
          <button type="button" onClick={onClose}>暂不处理</button>
          <button className="primary-button" type="button" onClick={migrate} disabled={busy}><Merge aria-hidden="true" />{busy ? '正在合并…' : '合并到账号'}</button>
        </div>
      </div>
    </dialog>
  )
}
