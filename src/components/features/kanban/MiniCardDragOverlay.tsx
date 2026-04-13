import { CheckCircle2 } from 'lucide-react'
import type { KanbanCard as KanbanCardType } from '@/types'

interface MiniCardDragOverlayProps {
  card: Partial<KanbanCardType>
}

export function MiniCardDragOverlay({ card }: MiniCardDragOverlayProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-white p-2 shadow-lg">
      <CheckCircle2 className="h-4 w-4 text-pod24-teal" />
      <span className="text-sm font-medium">{card.processName}</span>
      <span className="text-xs text-muted-foreground">({card.orderName})</span>
    </div>
  )
}
