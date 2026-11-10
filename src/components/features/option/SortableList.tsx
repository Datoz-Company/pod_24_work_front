import { createContext, useContext, type CSSProperties, type ReactNode } from 'react'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  type SortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

/**
 * 칩처럼 너비가 제각각인 목록용 전략: 다른 항목은 제자리에 두고(겹침 방지) 끌고 있는 항목만 포인터를 따라감.
 * 놓일 위치는 SortableItem이 세로선으로 표시합니다.
 */
const staticStrategy: SortingStrategy = () => null

/** grid 레이아웃이면 항목이 놓일 위치 표시선을 그림 */
const ShowDropIndicatorContext = createContext(false)

interface SortableGroupProps {
  /** 현재 순서의 id 목록 */
  ids: readonly number[]
  /** 드롭 후 새 순서의 id 목록 */
  onReorder: (ids: number[]) => void
  /** vertical: 세로 목록, grid: 줄바꿈되는 칩 목록 */
  layout?: 'vertical' | 'grid'
  children: ReactNode
}

/**
 * 드래그로 순서를 바꿀 수 있는 목록 영역.
 * 중첩해서 사용할 수 있으며(속성 목록 안의 값 목록 등), 각 그룹은 자기 항목끼리만 정렬됩니다.
 */
export function SortableGroup({ ids, onReorder, layout = 'vertical', children }: SortableGroupProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = ids.indexOf(Number(active.id))
    const to = ids.indexOf(Number(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove([...ids], from, to))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext
        items={[...ids]}
        strategy={layout === 'grid' ? staticStrategy : verticalListSortingStrategy}
      >
        <ShowDropIndicatorContext.Provider value={layout === 'grid'}>{children}</ShowDropIndicatorContext.Provider>
      </SortableContext>
    </DndContext>
  )
}

interface DragHandleProps {
  label: string
  size?: 'sm' | 'md'
}

interface SortableItemProps {
  id: number
  className?: string
  disabled?: boolean
  /** handle: 이 항목의 드래그 손잡이 컴포넌트 (원하는 위치에 렌더링) */
  children: (handle: (props: DragHandleProps) => ReactNode) => ReactNode
}

/**
 * SortableGroup 안의 정렬 가능한 항목. 손잡이(GripVertical)를 잡아야만 드래그되므로
 * 항목 안의 버튼 클릭은 그대로 동작합니다.
 */
export function SortableItem({ id, className = '', disabled = false, children }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver, index, activeIndex } =
    useSortable({ id, disabled })
  const showDropIndicator = useContext(ShowDropIndicatorContext)

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    // 끄는 동안 아래 항목 글자가 비치지 않도록 불투명 배경
    ...(isDragging ? { backgroundColor: 'hsl(var(--background))' } : {}),
  }

  // 앞에서 끌어오면 이 항목 뒤에, 뒤에서 끌어오면 앞에 들어감 (arrayMove 결과와 동일)
  let dropIndicator = ''
  if (showDropIndicator && isOver && !isDragging) {
    dropIndicator = activeIndex < index
      ? 'shadow-[4px_0_0_0_hsl(var(--primary))]'
      : 'shadow-[-4px_0_0_0_hsl(var(--primary))]'
  }

  const handle = ({ label, size = 'md' }: DragHandleProps) =>
    disabled ? null : (
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`${label} 순서 변경`}
        title="드래그해서 순서 변경"
        className="flex shrink-0 cursor-grab touch-none items-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
      >
        <GripVertical className={size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} />
      </button>
    )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${dropIndicator} ${isDragging ? 'relative z-10 shadow-lg ring-1 ring-primary/40' : ''}`}
    >
      {children(handle)}
    </div>
  )
}
