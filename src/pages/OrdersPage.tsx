import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Plus, Search, Filter, MoreHorizontal, Trash2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { OrderListTable } from '@/components/features/order/OrderListTable'
import { orderService } from '@/services/orderService'
import { ORDER_STATUS } from '@/lib/status'
import type { Order, OrderStatus } from '@/types'
import { invalidateWorkData } from '@/lib/queryInvalidation'

export function OrdersPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const [page, setPage] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)

  // 입력이 멈춘 뒤 서버 검색 (전체 주문 대상)
  useEffect(() => {
    const timer = setTimeout(() => {
      setKeyword(searchTerm.trim())
      setPage(0)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const status = statusFilter === 'all' ? undefined : statusFilter

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', page, keyword, status],
    queryFn: () => orderService.getAll(page, 20, { keyword, status }),
    placeholderData: keepPreviousData,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => orderService.delete(id, true),
    onSuccess: () => {
      invalidateWorkData(queryClient)
      setDeleteTarget(null)
      toast.success('주문이 삭제되었습니다.')
    },
    onError: () => {
      toast.error('주문 삭제에 실패했습니다.')
    },
  })

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">주문 관리</h1>
        <Button onClick={() => navigate('/orders/new')}>
          <Plus className="mr-2 h-4 w-4" />
          새 주문 등록
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="주문번호, 주문명, 주문자, 회사·브랜드로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as OrderStatus | 'all')
              setPage(0)
            }}
          >
            <SelectTrigger className="w-32">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(ORDER_STATUS).map(([value, meta]) => (
                <SelectItem key={value} value={value}>{meta.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <OrderListTable
          orders={ordersData?.content ?? []}
          isLoading={isLoading}
          emptyText={keyword || status ? '조건에 맞는 주문이 없습니다.' : '등록된 주문이 없습니다.'}
          renderActions={(order) => (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="주문 메뉴">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate(`/orders/${order.id}`)}>
                  <Eye className="mr-2 h-4 w-4" />
                  상세 보기
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(order)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        />

        {ordersData && ordersData.totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              이전
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {ordersData.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= ordersData.totalPages - 1}
            >
              다음
            </Button>
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p><strong>"{deleteTarget?.orderName}"</strong> 주문을 삭제합니다.</p>
                {(deleteTarget?.workOrderCount ?? 0) > 0 ? (
                  <p className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                    연결된 작업 {deleteTarget?.workOrderCount}건과 공정이 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">이 작업은 되돌릴 수 없습니다.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
