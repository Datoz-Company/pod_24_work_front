import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { workOrderService } from '@/services/workOrderService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDateTime } from '@/lib/format'
import { WORK_ORDER_STATUS } from '@/lib/status'
import type { WorkOrderStatus } from '@/types'

const PAGE_SIZE = 20

// 작업 내역의 상태 배지 — 작업 완료 / 배송중 / 배송 완료
const HISTORY_BADGE_CLASS: Partial<Record<WorkOrderStatus, string>> = {
  COMPLETED: 'bg-green-100 text-green-700 hover:bg-green-100',
  SHIPPING: 'bg-amber-100 text-amber-700 hover:bg-amber-100',
  DELIVERED: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
}

export function WorkHistoryPage() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(0)

  // 입력이 멈춘 뒤 서버 검색 (전체 완료 작업 대상)
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchTerm.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const { data: response, isLoading } = useQuery({
    queryKey: ['work-orders', 'history', page, keyword],
    queryFn: () => workOrderService.getHistory(page, PAGE_SIZE, keyword),
    placeholderData: keepPreviousData,
  })

  const workOrders = response?.content || []

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">작업 내역</h1>
        <p className="text-muted-foreground">
          작업 완료 · 배송중 · 배송 완료된 작업지시서 목록입니다. 행을 누르면 상세 화면으로 이동합니다.
        </p>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="작업번호, 작업명, 상품, 고객으로 검색"
          className="pl-9"
        />
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
                <TableHead>배송 완료일</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workOrders.map((workOrder) => (
                <TableRow
                  key={workOrder.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/work-orders/${workOrder.id}`)}
                >
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
                      ? formatDateTime(workOrder.completedAt)
                      : '-'}
                  </TableCell>
                  <TableCell>{workOrder.deliveredAt ? formatDateTime(workOrder.deliveredAt) : '-'}</TableCell>
                  <TableCell>
                    <Badge className={HISTORY_BADGE_CLASS[workOrder.status] ?? ''} variant="outline">
                      {WORK_ORDER_STATUS[workOrder.status]?.label ?? workOrder.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {workOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    {keyword ? '검색 결과가 없습니다' : '완료된 작업이 없습니다'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {response && response.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {response.totalPages} · 총 {response.totalElements}건
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= response.totalPages - 1}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  )
}
