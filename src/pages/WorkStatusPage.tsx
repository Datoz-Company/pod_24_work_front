import { useNavigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/features/kanban/KanbanBoard'

export function WorkStatusPage() {
  const navigate = useNavigate()

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">작업 현황 관리</h1>
        {/* 작업은 항상 주문의 품목으로 생성 — 주문 등록 화면 하나로 통일 (배송지·주문 경로 누락 방지) */}
        <Button onClick={() => navigate('/orders/new')}>
          <Plus className="mr-2 h-4 w-4" />
          새 주문 등록
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <KanbanBoard />
      </div>
    </div>
  )
}
