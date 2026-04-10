import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { workOrderService } from '@/services/workOrderService'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function WorkHistoryPage() {
  const { data: response, isLoading } = useQuery({
    queryKey: ['work-orders', 'history'],
    queryFn: () => workOrderService.getHistory(0, 100),
  })

  const workOrders = response?.content || []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">작업 내역</h1>
        <p className="text-muted-foreground">완료된 작업지시서 목록입니다.</p>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">로딩 중...</div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>작업번호</TableHead>
                <TableHead>작업명</TableHead>
                <TableHead>상품</TableHead>
                <TableHead>고객</TableHead>
                <TableHead>수량</TableHead>
                <TableHead>완료일</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((workOrder) => (
                <TableRow key={workOrder.id}>
                  <TableCell className="font-mono text-sm">
                    {workOrder.orderNumber}
                  </TableCell>
                  <TableCell className="font-medium">
                    {workOrder.orderName}
                  </TableCell>
                  <TableCell>{workOrder.product?.name || '-'}</TableCell>
                  <TableCell>{workOrder.customer?.name || '-'}</TableCell>
                  <TableCell>{workOrder.quantity}개</TableCell>
                  <TableCell>
                    {workOrder.completedAt
                      ? format(new Date(workOrder.completedAt), 'yyyy-MM-dd HH:mm', { locale: ko })
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="success">완료</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {workOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    완료된 작업이 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
