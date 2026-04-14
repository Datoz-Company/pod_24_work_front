import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Loader2, Package, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { WorkOrder, WorkOrderStatus } from '@/types'

interface CustomerWorkOrderListProps {
  workOrders: WorkOrder[]
  isLoading?: boolean
  error?: Error | null
  onSelectWorkOrder?: (workOrder: WorkOrder) => void
}

const statusConfig: Record<
  WorkOrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: '대기', variant: 'secondary' },
  IN_PROGRESS: { label: '진행 중', variant: 'default' },
  COMPLETED: { label: '완료', variant: 'outline' },
  REJECTED: { label: '반려', variant: 'destructive' },
}

export function CustomerWorkOrderList({
  workOrders,
  isLoading,
  error,
  onSelectWorkOrder,
}: CustomerWorkOrderListProps) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy.MM.dd', { locale: ko })
  }

  const isOverdue = (dueDate?: string, status?: WorkOrderStatus) => {
    if (!dueDate || status === 'COMPLETED') return false
    return new Date(dueDate) < new Date()
  }

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
        <AlertTriangle className="h-8 w-8" />
        <p className="text-sm">주문 내역을 불러올 수 없습니다.</p>
      </div>
    )
  }

  if (workOrders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mb-2" />
        <p className="text-sm">주문 내역이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">주문번호</TableHead>
            <TableHead>작업명</TableHead>
            <TableHead>상품</TableHead>
            <TableHead className="w-[70px] text-right">수량</TableHead>
            <TableHead className="w-[80px]">상태</TableHead>
            <TableHead className="w-[90px]">출고일</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workOrders.map((wo) => (
            <TableRow
              key={wo.id}
              className={onSelectWorkOrder ? 'cursor-pointer hover:bg-muted/50' : ''}
              onClick={() => onSelectWorkOrder?.(wo)}
            >
              <TableCell className="font-mono text-xs">{wo.orderNumber}</TableCell>
              <TableCell className="font-medium">{wo.orderName}</TableCell>
              <TableCell className="text-muted-foreground">
                {wo.product?.name || '-'}
              </TableCell>
              <TableCell className="text-right">
                {wo.quantity.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant={statusConfig[wo.status].variant}>
                  {statusConfig[wo.status].label}
                </Badge>
              </TableCell>
              <TableCell
                className={
                  isOverdue(wo.dueDate, wo.status) ? 'text-destructive' : ''
                }
              >
                {formatDate(wo.dueDate)}
                {isOverdue(wo.dueDate, wo.status) && (
                  <span className="ml-1 text-xs">(지연)</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
