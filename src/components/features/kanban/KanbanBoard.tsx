import { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kanbanService } from '@/services/kanbanService'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { MiniCardDragOverlay } from './MiniCardDragOverlay'
import { ProcessGroupDropZone } from './ProcessGroupDropZone'
import { WorkOrderDetailSheet } from './WorkOrderDetailSheet'
import type { KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType } from '@/types'

interface KanbanBoardProps {
  onCardClick?: (card: KanbanCardType) => void
}

export function KanbanBoard({ onCardClick }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null)
  const [isDraggingMiniCard, setIsDraggingMiniCard] = useState(false)
  const [isDraggingFromPending, setIsDraggingFromPending] = useState(false)
  const [isDraggingFromMiddle, setIsDraggingFromMiddle] = useState(false)
  const [isOverProcessGroup, setIsOverProcessGroup] = useState(false)
  const [selectedWorkOrderId, setSelectedWorkOrderId] = useState<number | null>(null)
  const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const { data: columns = [], isLoading } = useQuery({
    queryKey: ['kanban'],
    queryFn: kanbanService.getBoard,
    refetchInterval: 30000,
  })

  const moveMutation = useMutation({
    mutationFn: kanbanService.moveCard,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })

  const startWorkMutation = useMutation({
    mutationFn: kanbanService.startWork,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
    },
  })

  const updateProcessStatusMutation = useMutation({
    mutationFn: ({ workOrderProcessId, status }: { workOrderProcessId: number; status: 'IN_PROGRESS' | 'COMPLETED' }) =>
      kanbanService.updateProcessStatus(workOrderProcessId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      // 상세 시트에서도 최신 상태를 보여주기 위해 workOrder 쿼리도 무효화
      queryClient.invalidateQueries({ queryKey: ['workOrder'] })
    },
  })

  // 컬럼 분류: 작업 전, 중간 공정, 작업 완료
  const { pendingColumns, middleColumns, completedColumns } = useMemo(() => {
    const pending = columns.filter(
      (c) => c.process.isSystem && c.process.systemType === 'PENDING'
    )
    const middle = columns.filter((c) => !c.process.isSystem)
    const completed = columns.filter(
      (c) => c.process.isSystem && c.process.systemType === 'COMPLETED'
    )
    return { pendingColumns: pending, middleColumns: middle, completedColumns: completed }
  }, [columns])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 더 빠른 드래그 시작
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 컬럼 우선 감지 커스텀 collision detection
  const customCollisionDetection: CollisionDetection = (args) => {
    // 먼저 pointerWithin으로 포인터가 직접 위에 있는 요소 찾기
    const pointerCollisions = pointerWithin(args)

    // 컬럼 충돌 우선 반환 (column-으로 시작하는 ID)
    const columnCollision = pointerCollisions.find(
      (collision) => String(collision.id).startsWith('column-')
    )
    if (columnCollision) {
      return [columnCollision]
    }

    // ProcessGroupDropZone 충돌
    const processGroupCollision = pointerCollisions.find(
      (collision) => collision.id === 'process-group-drop-zone'
    )
    if (processGroupCollision) {
      return [processGroupCollision]
    }

    // pointerWithin 결과가 있으면 반환
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }

    // 없으면 rectIntersection으로 폴백
    return rectIntersection(args)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = active.data.current?.card as KanbanCardType | undefined
    const isMiniCard = String(active.id).startsWith('mini-card-')

    if (card) {
      setActiveCard(card as KanbanCardType)
      setIsDraggingMiniCard(isMiniCard)
      // 드래그 중인 카드의 workOrderStatus가 PENDING인지 직접 확인
      const isFromPending = card.workOrderStatus === 'PENDING'
      setIsDraggingFromPending(isFromPending)

      // 중간 공정 카드인지 확인 (workOrderProcessId가 있고, IN_PROGRESS 상태)
      const isFromMiddle = !isMiniCard &&
        card.workOrderProcessId != null &&
        card.workOrderStatus === 'IN_PROGRESS'
      setIsDraggingFromMiddle(isFromMiddle)
    }
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setIsOverProcessGroup(false)
      return
    }

    // 중간 공정 그룹 위에 있는지 확인
    const isOverGroup = over.id === 'process-group-drop-zone'
    // 또는 중간 공정 컬럼 위에 있는 경우
    const overColumn = over.data.current?.column as KanbanColumnType | undefined
    const isOverMiddleColumn = overColumn && !overColumn.process.isSystem

    setIsOverProcessGroup(isOverGroup || Boolean(isOverMiddleColumn))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const wasDraggingFromPending = isDraggingFromPending
    const isMiniCard = String(active.id).startsWith('mini-card-')

    setActiveCard(null)
    setIsDraggingMiniCard(false)
    setIsDraggingFromPending(false)
    setIsDraggingFromMiddle(false)
    setIsOverProcessGroup(false)

    if (!over) return

    const activeCard = active.data.current?.card as KanbanCardType | undefined
    if (!activeCard) return

    // PENDING 상태 카드를 드래그한 경우: 작업 시작 처리
    if (wasDraggingFromPending) {
      // ProcessGroupDropZone에 드롭한 경우
      if (over.id === 'process-group-drop-zone') {
        startWorkMutation.mutate(activeCard.workOrderId)
        return
      }

      // 중간 공정 컬럼에 드롭한 경우
      const overColumn = over.data.current?.column as KanbanColumnType | undefined
      if (overColumn && !overColumn.process.isSystem) {
        startWorkMutation.mutate(activeCard.workOrderId)
        return
      }

      // 다른 곳에 드롭한 경우 아무 동작 안함
      return
    }

    // 미니 카드 드래그 처리 (작업 완료 컬럼의 완료된 공정 복구)
    if (isMiniCard && activeCard.workOrderProcessId != null) {
      const overColumn = over.data.current?.column as KanbanColumnType | undefined
      if (overColumn && !overColumn.process.isSystem) {
        // 중간 공정 컬럼으로 드롭: IN_PROGRESS로 상태 복구
        updateProcessStatusMutation.mutate({
          workOrderProcessId: activeCard.workOrderProcessId,
          status: 'IN_PROGRESS',
        })
      }
      return
    }

    // 일반 카드 이동 (기존 로직)
    const overColumn = over.data.current?.column as KanbanColumnType | undefined
    if (!overColumn) return

    const currentColumn = columns.find((col) =>
      col.cards.some((c) => c.workOrderId === activeCard.workOrderId && c.workOrderProcessId === activeCard.workOrderProcessId)
    )

    if (currentColumn?.process.id === overColumn.process.id) return

    // 작업 완료 컬럼에서 중간 공정으로 드래그한 경우: 공정 상태 복구 (IN_PROGRESS)
    const isDraggingFromCompleted = currentColumn?.process.isSystem && currentColumn.process.systemType === 'COMPLETED'
    const isTargetMiddleProcess = !overColumn.process.isSystem
    const hasProcessId = activeCard.workOrderProcessId != null

    if (isDraggingFromCompleted && isTargetMiddleProcess && hasProcessId) {
      updateProcessStatusMutation.mutate({
        workOrderProcessId: activeCard.workOrderProcessId!,
        status: 'IN_PROGRESS',
      })
      return
    }

    // 중간 공정 카드인지 확인
    const isMiddleProcessCard = activeCard.workOrderProcessId != null
    const isDraggingFromMiddle = currentColumn && !currentColumn.process.isSystem

    // 중간 공정 카드가 다른 중간 공정으로 이동하는 것을 차단
    // 중간 공정 카드는 오직 "작업 완료" 컬럼으로만 이동 가능
    if (isDraggingFromMiddle && isMiddleProcessCard && !overColumn.process.isSystem) {
      // 다른 중간 공정 컬럼으로 드롭한 경우 - 이동 불가
      return
    }

    // 작업 완료 컬럼으로 드래그한 경우: 공정 완료 처리
    const isCompletedColumn = overColumn.process.isSystem && overColumn.process.systemType === 'COMPLETED'

    if (isCompletedColumn && isMiddleProcessCard) {
      updateProcessStatusMutation.mutate({
        workOrderProcessId: activeCard.workOrderProcessId!,
        status: 'COMPLETED',
      })
      return
    }

    // 그 외의 경우 (예: 작업 전 → 작업 전 등)
    moveMutation.mutate({
      workOrderId: activeCard.workOrderId,
      targetProcessId: overColumn.process.id,
    })
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  // 하이라이트 상태: 작업 전에서 드래그 중이거나, 미니 카드(완료된 공정) 드래그 중일 때
  const shouldHighlightProcessGroup = (isDraggingFromPending || isDraggingMiniCard) && isOverProcessGroup
  // 중간 공정 컬럼 하이라이트: 작업 전에서 드래그 중이거나, 미니 카드 드래그 중일 때
  // (중간 공정 카드 드래그 중에는 하이라이트 안 함)
  const shouldHighlightMiddleColumns = isDraggingFromPending || isDraggingMiniCard
  // 작업 완료 컬럼 하이라이트: 중간 공정 카드 드래그 중일 때
  const shouldHighlightCompletedColumn = isDraggingFromMiddle

  const handleCardClick = (card: KanbanCardType) => {
    setSelectedWorkOrderId(card.workOrderId)
    // 중간 공정 카드인 경우 해당 공정 ID 저장 (수정 권한 판단용)
    setSelectedProcessId(card.workOrderProcessId ?? null)
    setIsSheetOpen(true)
    onCardClick?.(card)
  }

  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open)
    if (!open) {
      setSelectedWorkOrderId(null)
      setSelectedProcessId(null)
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {/* 작업 전 컬럼 */}
        {pendingColumns.map((column) => (
          <KanbanColumn
            key={column.process.id}
            column={column}
            onCardClick={handleCardClick}
          />
        ))}

        {/* 중간 공정 그룹 (드롭 영역) */}
        {middleColumns.length > 0 && (
          <ProcessGroupDropZone
            id="process-group-drop-zone"
            isHighlighted={shouldHighlightProcessGroup}
            overlayText={isDraggingMiniCard ? '여기에 놓아 공정 복구하기' : '여기에 놓아 작업 시작하기'}
          >
            {middleColumns.map((column) => (
              <KanbanColumn
                key={column.process.id}
                column={column}
                onCardClick={handleCardClick}
                isHighlighted={shouldHighlightMiddleColumns}
              />
            ))}
          </ProcessGroupDropZone>
        )}

        {/* 작업 완료 컬럼 */}
        {completedColumns.map((column) => (
          <KanbanColumn
            key={column.process.id}
            column={column}
            onCardClick={handleCardClick}
            isHighlighted={shouldHighlightCompletedColumn}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard && (
          isDraggingMiniCard
            ? <MiniCardDragOverlay card={activeCard} />
            : <KanbanCard card={activeCard} />
        )}
      </DragOverlay>

      {/* 작업지시서 상세 Sheet */}
      <WorkOrderDetailSheet
        workOrderId={selectedWorkOrderId}
        editableProcessId={selectedProcessId}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </DndContext>
  )
}
