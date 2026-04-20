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

// 공정 색상을 연한 배경색으로 변환 (10% opacity 효과)
const hexToLightBg = (hexColor: string): string => {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  // 흰색과 블렌딩 (10% 원래 색상, 90% 흰색)
  const blendR = Math.round(r * 0.1 + 255 * 0.9)
  const blendG = Math.round(g * 0.1 + 255 * 0.9)
  const blendB = Math.round(b * 0.1 + 255 * 0.9)
  return `rgb(${blendR}, ${blendG}, ${blendB})`
}

// 시스템 공정별 기본 배경색 (참고 프로젝트 기준)
const getColumnBgColor = (process: KanbanColumnType['process']): string => {
  if (process.isSystem) {
    if (process.systemType === 'PENDING') return '#F2F2F2' // 작업 전: 연한 회색
    if (process.systemType === 'COMPLETED') return '#E8EFFF' // 작업 완료: 연한 파란색
  }
  // 일반 공정: 공정 색상을 연하게 적용
  return hexToLightBg(process.color)
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
    <div className="flex flex-col min-w-[220px] w-[220px] flex-shrink-0">
      {/* 컬럼 헤더 - 단순 텍스트 스타일 */}
      <div className="mb-3 px-2">
        <h3 className="text-sm font-medium text-gray-700">
          {column.process.name} ({column.cards.length})
        </h3>
      </div>

      {/* 컬럼 바디 */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-lg p-3 transition-all duration-200 min-h-[500px] overflow-hidden',
          isOver && 'ring-2 ring-blue-400',
          isHighlighted && !isOver && 'ring-2 ring-blue-300 ring-dashed'
        )}
        style={{ backgroundColor: getColumnBgColor(column.process) }}
      >
        <div className="space-y-3 w-full">
          <SortableContext items={allDraggableIds} strategy={verticalListSortingStrategy}>
            {column.cards.map((card) => (
              <KanbanCard
                key={`${card.workOrderId}-${card.workOrderProcessId ?? 'completed'}`}
                card={card}
                onClick={() => onCardClick?.(card)}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    </div>
  )
}
