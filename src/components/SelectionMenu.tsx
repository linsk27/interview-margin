import { MessageSquareText } from 'lucide-react'
import type { HighlightColor, SelectionDraft } from '../types'

const COLORS: HighlightColor[] = ['yellow', 'blue', 'green', 'rose']

export function SelectionMenu({ selection, onHighlight, onAnnotate }: {
  selection?: SelectionDraft
  onHighlight: (color: HighlightColor) => void
  onAnnotate: () => void
}) {
  if (!selection) return null
  return (
    <div
      className="selection-menu"
      style={{ left: selection.x, top: selection.y }}
      role="toolbar"
      aria-label="选中文本操作"
    >
      <div className="selection-menu__swatches" aria-label="高亮颜色">
        {COLORS.map((color) => (
          <button
            key={color}
            className={`swatch swatch--${color}`}
            type="button"
            onClick={() => onHighlight(color)}
            aria-label={`使用${color}高亮`}
            title="直接高亮"
          />
        ))}
      </div>
      <span className="selection-menu__rule" />
      <button type="button" onClick={onAnnotate} aria-label="为选中文本写批注" title="写批注">
        <MessageSquareText aria-hidden="true" /><span>批注</span>
      </button>
    </div>
  )
}
