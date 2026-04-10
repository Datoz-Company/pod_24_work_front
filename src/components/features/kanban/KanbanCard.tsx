import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { GripVertical, Clock, Package } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { KanbanCard as KanbanCardType } from '@/types'

interface KanbanCardProps {
  card: KanbanCardType
  onClick?: () => void
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.workOrderId}-${card.workOrderProcessId}`,
    data: { card },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isInProgress = card.processStatus === 'IN_PROGRESS'
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date()

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        'cursor-pointer p-3 transition-shadow hover:shadow-md',
        isDragging && 'opacity-50 shadow-lg',
        isInProgress && 'border-l-4 border-l-orange-500'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab touch-none text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {card.orderNumber}
            </span>
            <Badge
              variant={
                isInProgress ? 'warning' : card.processStatus === 'COMPLETED' ? 'success' : 'secondary'
              }
              className="text-xs"
            >
              {card.currentProcessOrder}/{card.totalProcesses}
            </Badge>
          </div>

          <h4 className="font-medium leading-tight">{card.orderName}</h4>

          {card.productName && (
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Package className="h-3 w-3" />
              {card.productName}
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{card.quantity}개</span>
            {card.dueDate && (
              <div
                className={cn(
                  'flex items-center gap-1 text-xs',
                  isOverdue ? 'text-destructive' : 'text-muted-foreground'
                )}
              >
                <Clock className="h-3 w-3" />
                {format(new Date(card.dueDate), 'M/d', { locale: ko })}
              </div>
            )}
          </div>

          {card.customerName && (
            <div className="text-xs text-muted-foreground">
              {card.customerName}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
