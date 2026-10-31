import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ORDER_STATUS } from '@/lib/status'
import { formatDate, formatDueDate, isOverdue } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ORDER_SOURCE_LABELS, SHIPPING_METHOD_LABELS, type Order } from '@/types'

interface OrderListTableProps {
  orders: readonly Order[]
  isLoading?: boolean
  emptyText?: string
  /** 행 오른쪽 끝 액션 (예: 더보기 메뉴) */
  renderActions?: (order: Order) => ReactNode
}

/**
 * 주문 목록 표 — 주문 관리 · 회사 상세 · 고객 상세에서 같은 컬럼으로 표시
 */
export function OrderListTable({ orders, isLoading = false, emptyText = '주문이 없습니다.', renderActions }: OrderListTableProps) {
  const navigate = useNavigate()
  const columnCount = renderActions ? 9 : 8

  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-32">주문번호</TableHead>
            <TableHead>주문명</TableHead>
            <TableHead className="w-40">상호 / 주문자</TableHead>
            <TableHead className="w-28">경로 / 출고</TableHead>
            <TableHead className="w-24 text-center">작업현황</TableHead>
            <TableHead className="w-24 text-center">상태</TableHead>
            <TableHead className="w-28">주문일</TableHead>
            <TableHead className="w-36">출고 예정일</TableHead>
            {renderActions && <TableHead className="w-16" />}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                로딩 중...
              </TableCell>
            </TableRow>
          ) : orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order) => (
              <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/orders/${order.id}`)}>
                <TableCell className="font-mono text-sm">{order.orderNumber}</TableCell>
                <TableCell className="font-medium">{order.orderName}</TableCell>
                <TableCell>
                  <div className="truncate">{order.clientCompany?.displayName || '-'}</div>
                  {order.customer && <div className="truncate text-xs text-muted-foreground">{order.customer.name}</div>}
                </TableCell>
                <TableCell>
                  <div className="truncate text-sm">{order.orderSource ? ORDER_SOURCE_LABELS[order.orderSource] : '-'}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {order.shippingMethod ? SHIPPING_METHOD_LABELS[order.shippingMethod] : '-'}
                  </div>
                </TableCell>
                <TableCell className="text-center text-sm">
                  {order.completedCount}/{order.workOrderCount}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={ORDER_STATUS[order.status].variant}>{ORDER_STATUS[order.status].label}</Badge>
                </TableCell>
                <TableCell>{formatDate(order.orderDate)}</TableCell>
                <TableCell
                  className={cn(isOverdue(order.dueDate) && order.status !== 'COMPLETED' && order.status !== 'CANCELLED' && 'text-destructive')}
                >
                  {formatDueDate(order.dueDate)}
                </TableCell>
                {renderActions && <TableCell onClick={(e) => e.stopPropagation()}>{renderActions(order)}</TableCell>}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
