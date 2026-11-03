import { useState, useCallback } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronUp, ChevronDown, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompletedProcessMiniCard } from './CompletedProcessMiniCard'
import type { KanbanCard as KanbanCardType } from '@/types'
import { formatDueDate } from '@/lib/format'

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
  gray: '#9CA3AF',    // 대기/대기중
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

  // 대기중 컬럼 (PENDING 상태)
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

// 상호명 우선, 없으면 고객명으로 대체
const getDisplayName = (card: KanbanCardType): string =>
  card.clientName || card.customerName || '상호 미지정'

// 품명(작업명)이 상품명과 다를 때만 함께 표시
const getProductLabel = (card: KanbanCardType): string => {
  if (!card.productName) return card.orderName
  if (card.orderName && card.orderName !== card.productName) {
    return `${card.productName} · ${card.orderName}`
  }
  return card.productName
}

/** 칸반 카드(품목)의 고유 키 — 확장 상태 캐시와 dnd id에 공통 사용 */
const getCardKey = (card: KanbanCardType): string =>
  `${card.workOrderId}-${card.workOrderProcessId ?? 'completed'}`

// 작업 완료 컬럼의 카드 (completedProcessInfos가 있는 경우)
const isCompletedColumnCard = (card: KanbanCardType): boolean => card.completedProcessInfos != null

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-gray-500 flex-shrink-0">{label}</span>
      <span className="text-gray-800 truncate text-right">{value}</span>
    </div>
  )
}

function OrderGroupHeader({ name }: { name: string }) {
  return (
    <div className="px-3 pt-2 pb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground border-b border-gray-100">
      <Layers className="h-3 w-3 flex-shrink-0" />
      <span className="truncate">{name}</span>
    </div>
  )
}

interface KanbanItemRowProps {
  card: KanbanCardType
  onClick?: () => void
}

/**
 * 주문 그룹 안의 품목 한 줄 — 품목명 · 상태 점 · 펼치기 버튼, 펼치면 고객/수량/출고(완료 컬럼은 완료 공정 포함)
 * 품목 단위로 드래그해 공정을 이동한다 (작업 완료 컬럼의 품목은 드래그 불가, 완료 공정 미니 카드만 드래그).
 *
 * @param {KanbanItemRowProps} props - 칸반 카드 데이터와 클릭 핸들러
 */
export function KanbanItemRow({ card, onClick }: KanbanItemRowProps) {
  const cardKey = getCardKey(card)
  const completedColumn = isCompletedColumnCard(card)

  // 캐시된 상태 또는 기본값(닫힘)으로 초기화
  const [isExpanded, setIsExpanded] = useState(() => getExpandedCards().has(cardKey))

  // 확장 상태 토글 시 캐시 업데이트
  const handleToggleExpand = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsExpanded(prev => {
      const newValue = !prev
      const expandedSet = getExpandedCards()
      if (newValue) {
        expandedSet.add(cardKey)
      } else {
        expandedSet.delete(cardKey)
      }
      saveExpandedCards(expandedSet)
      return newValue
    })
  }, [cardKey])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `card-${cardKey}`,
    data: { card },
    disabled: completedColumn,
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

  const statusDotColor = getStatusDotColor(card, completedColumn)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(completedColumn ? {} : { ...attributes, ...listeners })}
      className={cn(
        'bg-white hover:bg-gray-50 transition-colors',
        completedColumn ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40'
      )}
      onClick={handleClick}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0" title={getProductLabel(card)}>
          {getProductLabel(card)}
        </h4>
        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: statusDotColor }} />
        <button
          type="button"
          onClick={handleToggleExpand}
          onPointerDown={(e) => e.stopPropagation()}
          className="p-0.5 -mr-1 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
          aria-label={isExpanded ? '품목 정보 접기' : '품목 정보 펼치기'}
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 -mt-1 space-y-1">
          <DetailRow label="고객" value={getDisplayName(card)} />
          <DetailRow label="수량" value={`${card.quantity.toLocaleString()}개`} />
          <DetailRow label="출고" value={card.dueDate ? formatDueDate(card.dueDate) : '미정'} />

          {/* 완료된 공정 미니 카드 리스트 (작업 완료 컬럼) */}
          {completedColumn && card.completedProcessInfos && card.completedProcessInfos.length > 0 && (
            <div className="pt-2 mt-2 border-t border-gray-100">
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

interface KanbanOrderGroupProps {
  /** 같은 컬럼 안에서 같은 주문에 속한 품목들 (주문 없는 단독 작업은 1개) */
  cards: KanbanCardType[]
  onCardClick?: (card: KanbanCardType) => void
}

/**
 * 한 주문의 품목들을 하나의 카드로 묶어 표시 — 상단에 주문명, 아래에 품목 행을 나열
 *
 * @param {KanbanOrderGroupProps} props - 같은 주문의 칸반 카드 목록과 클릭 핸들러
 */
export function KanbanOrderGroup({ cards, onCardClick }: KanbanOrderGroupProps) {
  const groupName = cards[0]?.orderGroupName
  return (
    <div className="w-full bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
      {groupName && <OrderGroupHeader name={groupName} />}
      <div className="divide-y divide-gray-100">
        {cards.map((card) => (
          <KanbanItemRow key={getCardKey(card)} card={card} onClick={() => onCardClick?.(card)} />
        ))}
      </div>
    </div>
  )
}

interface KanbanCardProps {
  card: KanbanCardType
}

/**
 * 드래그 중 커서를 따라다니는 품목 카드 (DragOverlay 전용)
 *
 * @param {KanbanCardProps} props - 드래그 중인 칸반 카드
 */
export function KanbanCard({ card }: KanbanCardProps) {
  return (
    <div className="w-[196px] bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden cursor-grabbing">
      {card.orderGroupName && <OrderGroupHeader name={card.orderGroupName} />}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <h4 className="font-semibold text-sm text-gray-900 truncate flex-1 min-w-0">{getProductLabel(card)}</h4>
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: getStatusDotColor(card, isCompletedColumnCard(card)) }}
        />
      </div>
    </div>
  )
}
