import { useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronUp, ChevronDown, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompletedProcessMiniCard } from './CompletedProcessMiniCard'
import type { KanbanCard as KanbanCardType } from '@/types'

// 칸반 카드 확장 상태 캐싱
const KANBAN_EXPANDED_KEY = 'kanban-expanded-cards'

const getExpandedCards = (): Set<string> => {
  try {
    const saved = localStorage.getItem(KANBAN_EXPANDED_KEY)
    return saved ? new Set(JSON.parse(saved)) : new Set()
  } catch {
    return new Set()
  }
}

const saveExpandedCards = (expandedSet: Set<string>) => {
  localStorage.setItem(KANBAN_EXPANDED_KEY, JSON.stringify([...expandedSet]))
}

// 상태 색상 정의
const STATUS_COLORS = {
  gray: '#9CA3AF',    // 대기/작업 전
  blue: '#3B82F6',    // 진행 중
  green: '#10B981',   // 완료
} as const

// 카드 상태에 따른 dot 색상 결정
const getStatusDotColor = (card: KanbanCardType, isCompletedColumnCard: boolean): string => {
  // 작업 완료 컬럼의 카드
  if (isCompletedColumnCard) {
    // 전체 작업이 완료된 경우 (workOrderStatus가 COMPLETED)
    if (card.workOrderStatus === 'COMPLETED') {
      return STATUS_COLORS.green
    }
    // 완료된 공정이 하나도 없는 경우
    if (!card.completedProcessInfos || card.completedProcessInfos.length === 0) {
      return STATUS_COLORS.gray
    }
    // 일부만 완료된 경우
    return STATUS_COLORS.blue
  }

  // 작업 전 컬럼 (PENDING 상태)
  if (card.workOrderStatus === 'PENDING') {
    return STATUS_COLORS.gray
  }

  // 중간 공정 컬럼 - processStatus 기반
  switch (card.processStatus) {
    case 'IN_PROGRESS':
      return STATUS_COLORS.blue
    case 'COMPLETED':
      return STATUS_COLORS.green
    case 'NOT_STARTED':
    default:
      return STATUS_COLORS.gray
  }
}

interface KanbanCardProps {
  card: KanbanCardType
  onClick?: () => void
}

export function KanbanCard({ card, onClick }: KanbanCardProps) {
  // 카드 고유 ID 생성
  const cardId = `${card.workOrderId}-${card.workOrderProcessId ?? 'completed'}`

  // 캐시된 상태 또는 기본값(닫힘)으로 초기화
  const [isExpanded, setIsExpanded] = useState(() => {
    return getExpandedCards().has(cardId)
  })

  // 확장 상태 토글 시 캐시 업데이트
  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(prev => {
      const newValue = !prev
      const expandedSet = getExpandedCards()
      if (newValue) {
        expandedSet.add(cardId)
      } else {
        expandedSet.delete(cardId)
      }
      saveExpandedCards(expandedSet)
      return newValue
    })
  }, [cardId])

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

  const statusDotColor = getStatusDotColor(card, isCompletedColumnCard)

  // 작업 완료 컬럼의 카드
  if (isCompletedColumnCard) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="w-full bg-white rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
        onClick={handleClick}
      >
        {/* 주문 정보 (상위 주문이 있는 경우) */}
        {card.orderGroupName && (
          <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-xs text-muted-foreground border-b border-gray-100">
            <Layers className="h-3 w-3" />
            <span className="truncate">{card.orderGroupName}</span>
          </div>
        )}

        {/* 카드 헤더 */}
        <div className={cn(
          "flex items-center justify-between gap-2 p-3",
          isExpanded && "pb-0"
        )}>
          <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0">{card.orderName}</h4>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 상태 dot */}
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: statusDotColor }}
            />
            <button
              onClick={handleToggleExpand}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* 카드 내용 */}
        {isExpanded && (
          <div className="px-3 pb-3 pt-2">
            <div className="text-xs text-gray-500 space-y-1">
              {card.customerName && (
                <div className="flex justify-between gap-2">
                  <span className="flex-shrink-0">고객</span>
                  <span className="text-gray-700 truncate">{card.customerName}</span>
                </div>
              )}
              {card.dueDate && (
                <div className="flex justify-between gap-2">
                  <span className="flex-shrink-0">출고일</span>
                  <span className="text-gray-700">
                    {format(new Date(card.dueDate), 'yyyy-MM-dd', { locale: ko })}
                  </span>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <span className="flex-shrink-0">수량</span>
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
        'w-full bg-white rounded-lg shadow-sm border border-gray-200 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow overflow-hidden',
        isDragging && 'shadow-lg opacity-90'
      )}
      onClick={handleClick}
    >
      {/* 주문 정보 (상위 주문이 있는 경우) */}
      {card.orderGroupName && (
        <div className="px-3 pt-2 pb-1 flex items-center gap-1.5 text-xs text-muted-foreground border-b border-gray-100">
          <Layers className="h-3 w-3" />
          <span className="truncate">{card.orderGroupName}</span>
        </div>
      )}

      {/* 카드 헤더 */}
      <div className={cn(
        "flex items-center justify-between gap-2 p-3",
        isExpanded && "pb-0"
      )}>
        <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0">{card.orderName}</h4>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* 상태 dot */}
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: statusDotColor }}
          />
          <button
            onClick={handleToggleExpand}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* 카드 내용 */}
      {isExpanded && (
        <div className="px-3 pb-3 pt-2">
          <div className="text-xs text-gray-500 space-y-1">
            {card.customerName && (
              <div className="flex justify-between gap-2">
                <span className="flex-shrink-0">고객</span>
                <span className="text-gray-700 truncate">{card.customerName}</span>
              </div>
            )}
            {card.dueDate && (
              <div className="flex justify-between gap-2">
                <span className="flex-shrink-0">출고일</span>
                <span className="text-gray-700">
                  {format(new Date(card.dueDate), 'yyyy-MM-dd', { locale: ko })}
                </span>
              </div>
            )}
            <div className="flex justify-between gap-2">
              <span className="flex-shrink-0">수량</span>
              <span className="text-gray-700">{card.quantity}개</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
