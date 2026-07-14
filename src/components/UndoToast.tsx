import { RotateCcw, X } from 'lucide-react'

export function UndoToast({ message, onUndo, onDismiss }: { message: string; onUndo: () => void; onDismiss: () => void }) {
  return (
    <div className="undo-toast" role="status">
      <span>{message}</span>
      <button type="button" onClick={onUndo}><RotateCcw aria-hidden="true" />撤销</button>
      <button type="button" onClick={onDismiss} aria-label="关闭提示" title="关闭提示"><X aria-hidden="true" /></button>
    </div>
  )
}
