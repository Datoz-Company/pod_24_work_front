import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import type { KanbanColumn as KanbanColumnType, KanbanCard as KanbanCardType } from '@/types'

interface KanbanColumnProps {
  column: KanbanColumnType
  onCardClick?: (card: KanbanCardType) => void
  isHighlighted?: boolean
}

export function KanbanColumn({ column, onCardClick, isHighlighted = false }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.process.id}`,
    data: { column },
  })

  // 카드 ID + 미니 카드 ID (완료된 공정)
  const allDraggableIds: string[] = []
  column.cards.forEach((card) => {
    allDraggableIds.push(`card-${card.workOrderId}-${card.workOrderProcessId ?? 'completed'}`)
    // 완료된 공정 미니 카드 ID 추가
    if (card.completedProcessInfos) {
      card.completedProcessInfos.forEach((processInfo) => {
        allDraggableIds.push(`mini-card-${card.workOrderId}-${processInfo.workOrderProcessId}`)
      })
    }
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-muted transition-all duration-200',
        isOver && 'bg-primary/10 ring-2 ring-primary ring-inset',
        isHighlighted && 'bg-primary/5'
      )}
    >
      <div
        className="flex items-center justify-between rounded-t-lg px-3 py-2"
        style={{ backgroundColor: column.process.color }}
      >
        <h3 className="font-semibold text-white">{column.process.name}</h3>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-sm text-white">
          {column.cards.length}
        </span>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-2 min-h-[100px]">
        <SortableContext items={allDraggableIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard
              key={`${card.workOrderId}-${card.workOrderProcessId ?? 'completed'}`}
              card={card}
              onClick={() => onCardClick?.(card)}
            />
          ))}
        </SortableContext>

        {column.cards.length === 0 && (
          <div className={cn(
            "flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors",
            isOver ? "border-primary bg-primary/5" : "border-gray-300"
          )}>
            {isOver ? "여기에 놓기" : "작업 없음"}
          </div>
        )}
      </div>
    </div>
  )
}
