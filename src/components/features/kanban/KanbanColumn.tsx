import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { KanbanCard } from './KanbanCard'
import type { KanbanColumn as KanbanColumnType, KanbanCard as KanbanCardType } from '@/types'

interface KanbanColumnProps {
  column: KanbanColumnType
  onCardClick?: (card: KanbanCardType) => void
}

export function KanbanColumn({ column, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.process.id}`,
    data: { column },
  })

  const cardIds = column.cards.map(
    (card) => `card-${card.workOrderId}-${card.workOrderProcessId}`
  )

  return (
    <div
      className={cn(
        'flex h-full w-72 flex-shrink-0 flex-col rounded-lg bg-gray-100',
        isOver && 'bg-gray-200'
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

      <div
        ref={setNodeRef}
        className="flex-1 space-y-2 overflow-y-auto p-2"
      >
        <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <KanbanCard
              key={`${card.workOrderId}-${card.workOrderProcessId}`}
              card={card}
              onClick={() => onCardClick?.(card)}
            />
          ))}
        </SortableContext>

        {column.cards.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-sm text-muted-foreground">
            작업 없음
          </div>
        )}
      </div>
    </div>
  )
}
