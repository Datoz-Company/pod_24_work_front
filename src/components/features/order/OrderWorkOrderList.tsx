import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Package, Calendar, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { orderService } from '@/services/orderService'
import type { WorkOrderSummary, WorkOrderStatus } from '@/types'
import { toast } from 'sonner'

interface OrderWorkOrderListProps {
  orderId: number
  workOrders: WorkOrderSummary[]
}

const statusConfig: Record<
  WorkOrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: '대기', variant: 'secondary' },
  IN_PROGRESS: { label: '진행중', variant: 'default' },
  COMPLETED: { label: '완료', variant: 'outline' },
  REJECTED: { label: '반려', variant: 'destructive' },
}

export function OrderWorkOrderList({ orderId, workOrders }: OrderWorkOrderListProps) {
  const queryClient = useQueryClient()

  const removeWorkOrderMutation = useMutation({
    mutationFn: (workOrderId: number) =>
      orderService.removeWorkOrder(orderId, workOrderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      toast.success('작업이 주문에서 제거되었습니다.')
    },
    onError: () => {
      toast.error('작업 제거에 실패했습니다.')
    },
  })

  const handleRemoveWorkOrder = (workOrderId: number) => {
    if (confirm('이 작업을 주문에서 제거하시겠습니까?')) {
      removeWorkOrderMutation.mutate(workOrderId)
    }
  }

  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground">등록된 작업이 없습니다.</p>
        <p className="text-sm text-muted-foreground mt-1">
          "작업 추가" 버튼을 클릭하여 작업을 추가하세요.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {workOrders.map((workOrder) => (
        <div
          key={workOrder.id}
          className="flex items-start gap-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground">
                {workOrder.orderNumber}
              </span>
              <Badge variant={statusConfig[workOrder.status].variant} className="text-xs">
                {statusConfig[workOrder.status].label}
              </Badge>
            </div>
            <p className="font-medium truncate">{workOrder.orderName}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {workOrder.productName && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {workOrder.productName}
                </span>
              )}
              <span>수량: {workOrder.quantity}</span>
              {workOrder.dueDate && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(workOrder.dueDate), 'M/d', { locale: ko })}
                </span>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemoveWorkOrder(workOrder.id)}
            disabled={removeWorkOrderMutation.isPending}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
