import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompletedProcessMiniCard } from './CompletedProcessMiniCard'
import type { KanbanCard as KanbanCardType } from '@/types'

interface KanbanCardProps {
  card: KanbanCardType
  onClick?: () => void
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  const [isExpanded, setIsExpanded] = useState(true)

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

  // 드래그 중에는 onClick 방지
  const handleClick = () => {
    if (!isDragging) {
      onClick?.()
    }
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(!isExpanded)
  }

  // 작업 완료 컬럼의 카드
  if (isCompletedColumnCard) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full bg-white rounded-lg shadow-sm border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
        onClick={handleClick}
      >
        {/* 카드 헤더 */}
        <div className={cn(
          "flex items-center justify-between gap-2 p-3",
          isExpanded && "pb-0"
        )}>
          <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0">{card.orderName}</h4>
          <button
            onClick={handleToggle}
            className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>

        {/* 카드 내용 */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-2">
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between gap-2">
                <span className="flex-shrink-0">주문번호</span>
                <span className="text-gray-700 truncate">{card.orderNumber}</span>
              </div>
              {card.customerName && (
                <div className="flex justify-between gap-2">
                  <span className="flex-shrink-0">주문자</span>
                  <span className="text-gray-700 truncate">{card.customerName}</span>
                </div>
              )}
              {card.dueDate && (
                <div className="flex justify-between gap-2">
                  <span className="flex-shrink-0">주문일</span>
                  <span className="text-gray-700">
                    {format(new Date(card.dueDate), 'yyyy-MM-dd', { locale: ko })}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="flex-shrink-0">주문수량</span>
                <span className="text-gray-700">{card.quantity}개</span>
              </div>
            </div>

            {/* 완료된 공정 미니 카드 리스트 */}
            {card.completedProcessInfos && card.completedProcessInfos.length > 0 && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500 mb-2">
                  완료된 공정 ({card.completedProcessInfos.length})
                </div>
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
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  // 일반 카드 (작업 전, 중간 공정)
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'w-full bg-white rounded-lg shadow-sm border-l-4 border-l-blue-500 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow overflow-hidden',
        isDragging && 'shadow-lg opacity-90'
      )}
      onClick={handleClick}
    >
      {/* 카드 헤더 */}
      <div className={cn(
        "flex items-center justify-between gap-2 p-3",
        isExpanded && "pb-0"
      )}>
        <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0">{card.orderName}</h4>
        <button
          onClick={handleToggle}
          className="p-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>

      {/* 카드 내용 */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2">
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between gap-2">
              <span className="flex-shrink-0">주문번호</span>
              <span className="text-gray-700 truncate">{card.orderNumber}</span>
            </div>
            {card.customerName && (
              <div className="flex justify-between gap-2">
                <span className="flex-shrink-0">주문자</span>
                <span className="text-gray-700 truncate">{card.customerName}</span>
              </div>
            )}
            {card.dueDate && (
              <div className="flex justify-between gap-2">
                <span className="flex-shrink-0">주문일</span>
                <span className="text-gray-700">
                  {format(new Date(card.dueDate), 'yyyy-MM-dd', { locale: ko })}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="flex-shrink-0">주문수량</span>
              <span className="text-gray-700">{card.quantity}개</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
