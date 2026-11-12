import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CheckCircle2, GripVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CompletedProcessInfo, KanbanCard as KanbanCardType } from '@/types'

interface CompletedProcessMiniCardProps {
  processInfo: CompletedProcessInfo
  workOrderId: number
  orderName: string
  quantity: number
  /** 배송중 품목처럼 공정 복구를 막아야 할 때 드래그 비활성화 (표시만) */
  disabled?: boolean
}

export function CompletedProcessMiniCard({
  processInfo,
  workOrderId,
  orderName,
  quantity,
  disabled = false,
}: CompletedProcessMiniCardProps) {
  // 드래그를 위한 가상 KanbanCard 데이터 생성
  const virtualCard: Partial<KanbanCardType> = {
    workOrderId,
    workOrderProcessId: processInfo.workOrderProcessId,
    orderName,
    quantity,
    processName: processInfo.processName,
    processStatus: 'COMPLETED',
    workOrderStatus: 'IN_PROGRESS', // 드래그 시 복구되므로
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `mini-card-${workOrderId}-${processInfo.workOrderProcessId}`,
    data: { card: virtualCard },
    disabled,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(disabled ? {} : { ...attributes, ...listeners })}
      className={cn(
        'flex items-center gap-2 rounded-md border bg-white p-2 overflow-hidden',
        disabled
          ? 'cursor-default'
          : 'cursor-grab touch-none hover:shadow-md hover:border-primary/50 hover:bg-gray-50 active:cursor-grabbing',
        'transition-all duration-150',
        isDragging && 'opacity-60 shadow-lg scale-105 ring-2 ring-primary'
      )}
    >
      {!disabled && <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />}
      <CheckCircle2
        className="h-4 w-4 flex-shrink-0"
        style={{ color: processInfo.processColor || '#14b8a6' }}
      />
      <span className="text-sm font-medium truncate flex-1 min-w-0">{processInfo.processName}</span>
    </div>
  )
}
