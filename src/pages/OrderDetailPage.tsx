import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
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
  MapPin,
  Clock,
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
import type { OrderStatus } from '@/types'
import { toast } from 'sonner'

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: '대기', variant: 'secondary' },
  IN_PROGRESS: { label: '진행중', variant: 'default' },
  COMPLETED: { label: '완료', variant: 'outline' },
  CANCELLED: { label: '취소', variant: 'destructive' },
}

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState('work')

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
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
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
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
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

  return (
    <div className="space-y-4">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/orders" className="hover:text-foreground">주문 관리</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">주문 상세</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{order.orderNumber}</h1>
            <Badge variant={statusConfig[order.status].variant}>
              {statusConfig[order.status].label}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {order.orderDate && (
              <>
                <span>주문일</span>
                <span className="text-foreground">{format(new Date(order.orderDate), 'yyyy-MM-dd HH:mm')}</span>
                <span>|</span>
              </>
            )}
            {order.customer && (
              <>
                <span>고객명</span>
                <span className="text-foreground">{order.customer.name}</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
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
                작업 추가
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="mr-2 h-4 w-4" />
                주문 수정
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
          <Button size="sm">
            <Edit className="mr-1 h-4 w-4" />
            주문 수정
          </Button>
        </div>
      </div>

      {/* 요약 카드 */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground mb-1">총 작업 수</div>
              <div className="font-semibold">{order.workOrderCount || 0}건</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">총 수량</div>
              <div className="font-semibold">{totalQuantity.toLocaleString()} EA</div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">완료 수량</div>
              <div className="font-semibold text-green-600">
                {completedQuantity.toLocaleString()} EA ({progressPercent}%)
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">출고 예정일</div>
              <div className={cn(
                "font-semibold",
                order.dueDate && new Date(order.dueDate) < new Date() && order.status !== 'COMPLETED' && "text-destructive"
              )}>
                {order.dueDate ? format(new Date(order.dueDate), 'yyyy-MM-dd') : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">완료일</div>
              <div className="font-semibold">
                {order.completedAt ? format(new Date(order.completedAt), 'yyyy-MM-dd') : '-'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground mb-1">진행률</div>
              <div className="flex items-center gap-2">
                <Progress value={progressPercent} className="flex-1 h-2" />
                <span className="font-semibold text-xs">{progressPercent}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메인 컨텐츠 */}
      <div className="grid gap-4 lg:grid-cols-4">
        {/* 좌측: 탭 컨텐츠 */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="info">주문 정보</TabsTrigger>
              <TabsTrigger value="work">
                작업 ({order.workOrderCount || 0})
              </TabsTrigger>
            </TabsList>

            {/* 주문 정보 탭 */}
            <TabsContent value="info" className="mt-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                    <span className="text-muted-foreground">주문명</span>
                    <span className="font-medium">{order.orderName}</span>

                    <span className="text-muted-foreground">주문번호</span>
                    <span className="font-mono">{order.orderNumber}</span>

                    {order.customer && (
                      <>
                        <span className="text-muted-foreground">고객명</span>
                        <Link to={`/customers/${order.customer.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                          {order.customer.name}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </>
                    )}

                    {order.orderDate && (
                      <>
                        <span className="text-muted-foreground">주문일</span>
                        <span>{format(new Date(order.orderDate), 'yyyy-MM-dd HH:mm')}</span>
                      </>
                    )}

                    {order.dueDate && (
                      <>
                        <span className="text-muted-foreground">출고 예정일</span>
                        <span className={cn(
                          new Date(order.dueDate) < new Date() && order.status !== 'COMPLETED' && "text-destructive"
                        )}>
                          {format(new Date(order.dueDate), 'yyyy-MM-dd')}
                        </span>
                      </>
                    )}

                    <span className="text-muted-foreground">등록일</span>
                    <span>{format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm')}</span>

                    {order.completedAt && (
                      <>
                        <span className="text-muted-foreground">완료일</span>
                        <span>{format(new Date(order.completedAt), 'yyyy-MM-dd HH:mm')}</span>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* 메모 */}
              {order.memo && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">메모</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{order.memo}</p>
                  </CardContent>
                </Card>
              )}

              {/* 상태 변경 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">상태 변경</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as OrderStatus[]).map(
                      (status) => (
                        <Button
                          key={status}
                          variant={order.status === status ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => statusMutation.mutate({ id: order.id, status })}
                          disabled={statusMutation.isPending}
                        >
                          {statusConfig[status].label}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* 작업 탭 - 칸반 보드 (WorkStatusPage와 동일한 KanbanBoard 사용) */}
            <TabsContent value="work" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      작업 진행 보드
                    </CardTitle>
                    <Button size="sm" onClick={() => setIsAddWorkOrderOpen(true)}>
                      <Plus className="mr-1 h-4 w-4" />
                      작업 추가
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 h-[500px]">
                  <KanbanBoard orderId={orderId} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* 우측 사이드바 */}
        <div className="space-y-4">
          {/* 주문 요약 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">주문 요약</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">총 작업 수</span>
                <span className="font-medium">{order.workOrderCount || 0}건</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">총 수량</span>
                <span className="font-medium">{totalQuantity.toLocaleString()} EA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">완료 수량</span>
                <span className="font-medium text-green-600">
                  {completedQuantity.toLocaleString()} EA ({progressPercent}%)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 고객 정보 */}
          {order.customer && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">고객 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">고객명</span>
                  <Link to={`/customers/${order.customer.id}`} className="font-medium text-primary hover:underline">
                    {order.customer.name}
                  </Link>
                </div>
                {order.customer.phone && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> 연락처
                    </span>
                    <span>{order.customer.phone}</span>
                  </div>
                )}
                {order.customer.email && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> 이메일
                    </span>
                    <span className="truncate max-w-[140px]">{order.customer.email}</span>
                  </div>
                )}
                {order.customer.address && (
                  <div className="pt-2 border-t">
                    <div className="text-muted-foreground flex items-center gap-1 mb-1">
                      <MapPin className="h-3 w-3" /> 주소
                    </div>
                    <p className="text-xs">{order.customer.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* 일정 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                일정
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {order.orderDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">주문일</span>
                  <span>{format(new Date(order.orderDate), 'MM.dd')}</span>
                </div>
              )}
              {order.dueDate && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">출고 예정일</span>
                  <span className={cn(
                    "font-medium",
                    new Date(order.dueDate) < new Date() && order.status !== 'COMPLETED' && "text-destructive"
                  )}>
                    {format(new Date(order.dueDate), 'MM.dd')}
                  </span>
                </div>
              )}
              {order.completedAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">완료일</span>
                  <span className="text-green-600">{format(new Date(order.completedAt), 'MM.dd')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 작업 추가 다이얼로그 */}
      <AddWorkOrderDialog
        orderId={order.id}
        orderCustomerId={order.customer?.id}
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
