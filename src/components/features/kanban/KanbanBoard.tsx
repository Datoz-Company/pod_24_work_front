import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kanbanService } from '@/services/kanbanService'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import type { KanbanCard as KanbanCardType, KanbanColumn as KanbanColumnType } from '@/types'

interface KanbanBoardProps {
  onCardClick?: (card: KanbanCardType) => void
}

export function KanbanBoard({ onCardClick }: KanbanBoardProps) {
  const queryClient = useQueryClient()
  const [activeCard, setActiveCard] = useState<KanbanCardType | null>(null)

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const card = active.data.current?.card as KanbanCardType | undefined
    if (card) {
      setActiveCard(card)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveCard(null)

    if (!over) return

    const activeCard = active.data.current?.card as KanbanCardType | undefined
    const overColumn = over.data.current?.column as KanbanColumnType | undefined

    if (!activeCard || !overColumn) return

    const currentColumn = columns.find((col) =>
      col.cards.some((c) => c.workOrderId === activeCard.workOrderId)
    )

    if (currentColumn?.process.id === overColumn.process.id) return

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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full gap-4 overflow-x-auto p-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.process.id}
            column={column}
            onCardClick={onCardClick}
          />
        ))}
      </div>

      <DragOverlay>
        {activeCard && <KanbanCard card={activeCard} />}
      </DragOverlay>
    </DndContext>
  )
}
