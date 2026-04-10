import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/features/kanban/KanbanBoard'
import { CreateWorkOrderDialog } from '@/components/features/work-order/CreateWorkOrderDialog'

export function WorkStatusPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">작업 현황 관리</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          새 작업 생성
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>

      <CreateWorkOrderDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </div>
  )
}
