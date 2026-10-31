import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  ChevronRight,
  MoreHorizontal,
  Edit,
  ExternalLink,
  Phone,
  Mail,
  Truck,
  FileSpreadsheet,
} from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { orderService } from '@/services/orderService'
import { AddWorkOrderDialog } from '@/components/features/order/AddWorkOrderDialog'
import { KanbanBoard } from '@/components/features/kanban/KanbanBoard'
import { cn } from '@/lib/utils'
import { ORDER_SOURCE_LABELS, SHIPPING_METHOD_LABELS, type OrderStatus } from '@/types'
import { OrderFilesPanel } from '@/components/features/order/OrderFilesPanel'
import { excelService } from '@/services/excelService'
import { toast } from 'sonner'
import { ORDER_STATUS, WORK_ORDER_STATUS } from '@/lib/status'
import { formatDate, formatDateTime, formatDueDate, isOverdue } from '@/lib/format'
import { invalidateWorkData } from '@/lib/queryInvalidation'

const statusConfig = ORDER_STATUS

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState('info')

  const orderId = Number(id)

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getById(orderId),
    enabled: !!orderId,
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      invalidateWorkData(queryClient)
      toast.success('상태가 변경되었습니다.')
    },
    onError: () => {
      toast.error('상태 변경에 실패했습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (cascadeDelete: boolean) =>
      orderService.delete(orderId, cascadeDelete),
    onSuccess: () => {
      invalidateWorkData(queryClient)
      toast.success('주문이 삭제되었습니다.')
      navigate('/orders')
    },
    onError: () => {
      toast.error('주문 삭제에 실패했습니다.')
    },
  })

  // 총 수량 계산
  const totalQuantity = useMemo(() => {
    return order?.workOrders?.reduce((sum, wo) => sum + wo.quantity, 0) || 0
  }, [order])

  // 완료 수량 계산 (완료된 작업의 수량 합)
  const completedQuantity = useMemo(() => {
    return order?.workOrders?.filter(wo => wo.status === 'COMPLETED')
      .reduce((sum, wo) => sum + wo.quantity, 0) || 0
  }, [order])

  // 진행률 계산
  const progressPercent = totalQuantity > 0
    ? Math.round((completedQuantity / totalQuantity) * 100)
    : 0

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">주문을 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => navigate('/orders')}>
          목록으로 돌아가기
        </Button>
      </div>
    )
  }

  const shippingAddress = [
    order.shippingInfo?.zipCode && `(${order.shippingInfo.zipCode})`,
    order.shippingInfo?.address,
    order.shippingInfo?.addressDetail,
  ].filter(Boolean).join(' ')
  const overdue = isOverdue(order.dueDate) && order.status !== 'COMPLETED'

  // 한 화면에 정보를 가로로 펼치고, 헤더(액션·상태 변경)는 스크롤해도 상단에 고정
  return (
    <div className="space-y-4">
      {/* 고정 헤더 — main의 p-6 여백만큼 당겨서 스크롤 시 내용이 비치지 않도록 */}
      <div className="sticky -top-6 z-20 -mx-6 -mt-6 border-b bg-white/95 px-6 pb-3 pt-4 backdrop-blur">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/orders" className="hover:text-foreground">주문 관리</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">주문 상세</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h1 className="truncate text-xl font-bold">{order.orderName}</h1>
            <span className="font-mono text-sm text-muted-foreground">{order.orderNumber}</span>
            <Badge variant={statusConfig[order.status].variant}>
              {statusConfig[order.status].label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 상태 변경 — 작업 진행에 따라 자동으로 바뀌며, 필요할 때만 직접 변경 */}
            <div className="flex rounded-md border p-0.5" role="group" aria-label="주문 상태 변경">
              {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as OrderStatus[]).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => statusMutation.mutate({ id: order.id, status })}
                  disabled={statusMutation.isPending || order.status === status}
                  aria-pressed={order.status === status}
                  className={cn(
                    'rounded px-2.5 py-1 text-xs font-medium transition-colors',
                    order.status === status
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {statusConfig[status].label}
                </button>
              ))}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  작업 옵션
                  <MoreHorizontal className="ml-1 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsAddWorkOrderOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  품목 추가
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    excelService
                      .orderWorkInstructions(order.id, order.orderNumber)
                      .catch(() => toast.error('작업 지시서 생성에 실패했습니다. 주문에 작업이 있는지 확인하세요.'))
                  }
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  작업 지시서 엑셀
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  주문 삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" onClick={() => setIsAddWorkOrderOpen(true)}>
              <Plus className="mr-1 h-4 w-4" />
              품목 추가
            </Button>
            <Button size="sm" onClick={() => navigate(`/orders/${orderId}/edit`)}>
              <Edit className="mr-1 h-4 w-4" />
              주문 수정
            </Button>
          </div>
        </div>
      </div>

      {/* 요약 지표 한 줄 */}
      <Card>
        <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm md:grid-cols-3 lg:grid-cols-6">
          <div>
            <div className="mb-1 text-muted-foreground">품목(작업)</div>
            <div className="font-semibold">{order.workOrderCount || 0}건</div>
          </div>
          <div>
            <div className="mb-1 text-muted-foreground">총 수량</div>
            <div className="font-semibold">{totalQuantity.toLocaleString()} EA</div>
          </div>
          <div>
            <div className="mb-1 text-muted-foreground">완료 수량</div>
            <div className="font-semibold text-green-600">{completedQuantity.toLocaleString()} EA</div>
          </div>
          <div>
            <div className="mb-1 text-muted-foreground">진행률</div>
            <div className="flex items-center gap-2">
              <Progress value={progressPercent} className="h-2 flex-1" />
              <span className="text-xs font-semibold">{progressPercent}%</span>
            </div>
          </div>
          <div>
            <div className="mb-1 text-muted-foreground">출고 예정일</div>
            <div className={cn('font-semibold', overdue && 'text-destructive')}>
              {formatDueDate(order.dueDate)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-muted-foreground">완료일</div>
            <div className="font-semibold">{formatDate(order.completedAt)}</div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="info">주문 정보</TabsTrigger>
          <TabsTrigger value="work">작업 보드 ({order.workOrderCount || 0})</TabsTrigger>
        </TabsList>

        {/* 주문 정보 탭 — 넓은 화면에서 4열로 펼쳐 스크롤 최소화 */}
        <TabsContent value="info" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[84px_1fr] gap-y-2 text-sm">
                  <dt className="text-muted-foreground">회사 / 상호</dt>
                  <dd className="min-w-0 break-words">{order.clientCompany?.displayName ?? '-'}</dd>
                  <dt className="text-muted-foreground">주문 경로</dt>
                  <dd>{order.orderSource ? ORDER_SOURCE_LABELS[order.orderSource] : '-'}</dd>
                  <dt className="text-muted-foreground">주문일</dt>
                  <dd>{order.orderDate ? formatDateTime(order.orderDate) : '-'}</dd>
                  <dt className="text-muted-foreground">등록일</dt>
                  <dd>{formatDateTime(order.createdAt)}</dd>
                  {order.completedAt && (
                    <>
                      <dt className="text-muted-foreground">완료일</dt>
                      <dd>{formatDateTime(order.completedAt)}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">주문자</CardTitle>
              </CardHeader>
              <CardContent>
                {order.customer ? (
                  <dl className="grid grid-cols-[84px_1fr] gap-y-2 text-sm">
                    <dt className="text-muted-foreground">이름</dt>
                    <dd>
                      <Link to={`/customers/${order.customer.id}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        {order.customer.name}
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </dd>
                    <dt className="flex items-center gap-1 text-muted-foreground"><Phone className="h-3 w-3" />연락처</dt>
                    <dd>{order.customer.phone || '-'}</dd>
                    <dt className="flex items-center gap-1 text-muted-foreground"><Mail className="h-3 w-3" />이메일</dt>
                    <dd className="min-w-0 break-all">{order.customer.email || '-'}</dd>
                  </dl>
                ) : (
                  <p className="text-sm text-muted-foreground">주문자 정보가 없습니다.</p>
                )}
                {order.memo && (
                  <div className="mt-3 border-t pt-3">
                    <div className="mb-1 text-xs text-muted-foreground">메모</div>
                    <p className="whitespace-pre-wrap text-sm">{order.memo}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-sm font-medium">
                  <Truck className="h-4 w-4" />
                  출고 · 배송
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-[84px_1fr] gap-y-2 text-sm">
                  <dt className="text-muted-foreground">출고 방식</dt>
                  <dd className="font-medium">{order.shippingMethod ? SHIPPING_METHOD_LABELS[order.shippingMethod] : '-'}</dd>
                  <dt className="text-muted-foreground">수취인</dt>
                  <dd>{[order.shippingInfo?.recipientName, order.shippingInfo?.recipientPhone].filter(Boolean).join(' · ') || '-'}</dd>
                  <dt className="text-muted-foreground">배송지</dt>
                  <dd className="min-w-0 whitespace-pre-wrap break-words">{shippingAddress || '-'}</dd>
                  {order.shippingInfo?.deliveryMessage && (
                    <>
                      <dt className="text-muted-foreground">배송 메시지</dt>
                      <dd className="whitespace-pre-wrap">{order.shippingInfo.deliveryMessage}</dd>
                    </>
                  )}
                </dl>
              </CardContent>
            </Card>

            {/* 품목 — 작업 보드 탭으로 가지 않아도 진행 상태를 바로 확인 */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium">품목 ({order.workOrders?.length ?? 0})</CardTitle>
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setIsAddWorkOrderOpen(true)}>
                  <Plus className="mr-1 h-3 w-3" />
                  추가
                </Button>
              </CardHeader>
              <CardContent>
                {order.workOrders?.length ? (
                  <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
                    {order.workOrders.map((wo) => (
                      <li key={wo.id}>
                        <Link
                          to={`/work-orders/${wo.id}`}
                          className="flex items-center gap-2 rounded px-1.5 py-1 hover:bg-muted"
                        >
                          <span className="min-w-0 flex-1 truncate">{wo.orderName}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{wo.quantity.toLocaleString()}개</span>
                          <Badge variant={WORK_ORDER_STATUS[wo.status].variant} className="shrink-0 text-[11px]">
                            {WORK_ORDER_STATUS[wo.status].label}
                          </Badge>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">등록된 품목이 없습니다.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 파일: 견적서(관리자) / 주문·디자인 파일 — 내부 2열 */}
          <OrderFilesPanel
            orderId={order.id}
            clientCompanyId={order.clientCompany?.id}
            quoteAction={
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  excelService
                    .quote(order.id, order.orderNumber)
                    .catch(() => toast.error('견적서 생성에 실패했습니다'))
                }
              >
                <FileSpreadsheet className="mr-1 h-4 w-4" />
                견적서 자동 생성
              </Button>
            }
          />
        </TabsContent>

        {/* 작업 보드 탭 - 칸반 (WorkStatusPage와 동일한 KanbanBoard 사용) */}
        <TabsContent value="work" className="mt-4">
          <Card>
            <CardContent className="h-[calc(100vh-320px)] min-h-[480px] p-4">
              <KanbanBoard orderId={orderId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* 작업 추가 다이얼로그 */}
      <AddWorkOrderDialog
        orderId={order.id}
        orderCustomerId={order.customer?.id}
        orderDueDate={order.dueDate}
        open={isAddWorkOrderOpen}
        onOpenChange={setIsAddWorkOrderOpen}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>주문을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <strong>"{order.orderName}"</strong> 주문을 삭제합니다.
                </p>
                {(order.workOrderCount || 0) > 0 ? (
                  <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                    <p className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      이 주문에는 {order.workOrderCount}개의 작업이 연결되어 있습니다.
                    </p>
                    <p className="mt-1 text-sm ml-6">
                      삭제하면 연결된 모든 작업과 공정이 함께 삭제됩니다.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    이 작업은 되돌릴 수 없습니다.
                  </p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(true)}
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
