import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ProcessGroupDropZoneProps {
  id: string
  isHighlighted: boolean
  overlayText?: string
  children: ReactNode
}

export function ProcessGroupDropZone({
  id,
  isHighlighted,
  overlayText = '여기에 놓아 작업 시작하기',
  children,
}: ProcessGroupDropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
    data: { type: 'process-group' },
  })

  const showOverlay = isHighlighted || isOver

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative flex gap-4 rounded-lg p-2 transition-all duration-200',
        showOverlay && 'ring-4 ring-primary ring-offset-2 bg-primary/5'
      )}
    >
      {children}

      {showOverlay && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-primary/10">
          <div className="rounded-lg bg-gradient-pod24 px-6 py-3 text-lg font-semibold text-white shadow-lg">
            {overlayText}
          </div>
        </div>
      )}
    </div>
  )
}
