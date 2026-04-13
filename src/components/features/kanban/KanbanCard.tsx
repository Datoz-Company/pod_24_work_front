import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Clock, Package } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CompletedProcessMiniCard } from './CompletedProcessMiniCard'
import type { KanbanCard as KanbanCardType } from '@/types'

interface KanbanCardProps {
  card: KanbanCardType
  onClick?: () => void
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  // 작업 완료 컬럼의 카드 (completedProcessInfos가 있는 경우)
  const isCompletedColumnCard = card.completedProcessInfos != null && card.completedProcessInfos.length >= 0

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${card.workOrderId}-${card.workOrderProcessId ?? 'completed'}`,
    data: { card },
    // 작업 완료 컬럼의 메인 카드는 드래그 불가능
    disabled: isCompletedColumnCard,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const isInProgress = card.processStatus === 'IN_PROGRESS'
  const isCompleted = card.workOrderStatus === 'COMPLETED'
  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date()

  // 드래그 중에는 onClick 방지
  const handleClick = () => {
    if (!isDragging) {
      onClick?.()
    }
  }

  // 작업 완료 컬럼의 카드: WorkOrder 정보 + 완료된 공정 미니 카드들
  if (isCompletedColumnCard) {
    return (
      <Card
        ref={setNodeRef}
        style={style}
        className={cn(
          'p-3 transition-shadow',
          isCompleted
            ? 'border-l-4 border-l-pod24-teal bg-pod24-teal/5'
            : 'border-l-4 border-l-secondary bg-secondary/5'
        )}
        onClick={handleClick}
      >
        <div className="space-y-3">
          {/* 작업 정보 헤더 */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {card.orderNumber}
            </span>
            <Badge variant={isCompleted ? 'success' : 'default'} className="text-xs">
              {isCompleted ? '전체 완료' : '진행 중'}
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

          {/* 완료된 공정 미니 카드 리스트 */}
          <div className="mt-2 space-y-1.5 border-t pt-2">
            <div className="text-xs font-medium text-muted-foreground mb-2">
              완료된 공정 ({card.completedProcessInfos?.length || 0})
            </div>
            {card.completedProcessInfos && card.completedProcessInfos.length > 0 ? (
              <div className="space-y-1.5">
                {card.completedProcessInfos.map((processInfo) => (
                  <CompletedProcessMiniCard
                    key={processInfo.workOrderProcessId}
                    processInfo={processInfo}
                    workOrderId={card.workOrderId}
                    orderName={card.orderName}
                    quantity={card.quantity}
                  />
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground italic py-2 text-center">
                아직 완료된 공정이 없습니다
              </div>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // 일반 카드 (작업 전, 중간 공정)
  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab touch-none p-3 transition-shadow hover:shadow-md active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg',
        isInProgress && 'border-l-4 border-l-primary'
      )}
      onClick={handleClick}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            {card.orderNumber}
          </span>
          <Badge
            variant={isInProgress ? 'warning' : 'secondary'}
            className="text-xs"
          >
            {card.processStatus === 'IN_PROGRESS' ? '작업 중' : '작업 전'}
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
    </Card>
  )
}
