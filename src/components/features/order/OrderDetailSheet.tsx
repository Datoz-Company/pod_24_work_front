import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Plus, Calendar, User, FileText, Package, Trash2, AlertTriangle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { orderService } from '@/services/orderService'
import { OrderWorkOrderList } from './OrderWorkOrderList'
import { AddWorkOrderDialog } from './AddWorkOrderDialog'
import type { Order, OrderStatus } from '@/types'
import { toast } from 'sonner'

interface OrderDetailSheetProps {
  order: Order | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusConfig: Record<
  OrderStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: '대기', variant: 'secondary' },
  IN_PROGRESS: { label: '진행중', variant: 'default' },
  COMPLETED: { label: '완료', variant: 'outline' },
  CANCELLED: { label: '취소', variant: 'destructive' },
}

export function OrderDetailSheet({
  order,
  open,
  onOpenChange,
}: OrderDetailSheetProps) {
  const queryClient = useQueryClient()
  const [isAddWorkOrderOpen, setIsAddWorkOrderOpen] = useState(false)

  const { data: orderDetail } = useQuery({
    queryKey: ['order', order?.id],
    queryFn: () => orderService.getById(order!.id),
    enabled: !!order?.id && open,
  })

  const currentOrder = orderDetail || order

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: OrderStatus }) =>
      orderService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', order?.id] })
      toast.success('상태가 변경되었습니다.')
    },
    onError: () => {
      toast.error('상태 변경에 실패했습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (cascadeDelete: boolean) =>
      orderService.delete(order!.id, cascadeDelete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      toast.success('주문이 삭제되었습니다.')
      onOpenChange(false)
    },
    onError: () => {
      toast.error('주문 삭제에 실패했습니다.')
    },
  })

  if (!currentOrder) return null

  const handleStatusChange = (status: OrderStatus) => {
    statusMutation.mutate({ id: currentOrder.id, status })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-muted-foreground">
                  {currentOrder.orderNumber}
                </span>
                <Badge variant={statusConfig[currentOrder.status].variant}>
                  {statusConfig[currentOrder.status].label}
                </Badge>
              </div>
            </div>
            <SheetTitle className="text-xl">{currentOrder.orderName}</SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="info" className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">기본 정보</TabsTrigger>
              <TabsTrigger value="work-orders">
                작업 목록 ({currentOrder.workOrderCount || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="mt-4 space-y-6">
              {/* 고객 정보 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <User className="h-4 w-4" />
                  고객
                </div>
                <div className="rounded-lg border p-3">
                  <p className="font-medium">
                    {currentOrder.customer?.name || '미지정'}
                  </p>
                  {currentOrder.customer?.phone && (
                    <p className="text-sm text-muted-foreground">
                      {currentOrder.customer.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* 진행 상황 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Package className="h-4 w-4" />
                  진행 상황
                </div>
                <div className="rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">작업 완료</span>
                    <span className="font-medium">
                      {currentOrder.completedCount || 0} / {currentOrder.workOrderCount || 0}
                    </span>
                  </div>
                  {currentOrder.workOrderCount > 0 && (
                    <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-gradient-pod24 transition-all duration-300"
                        style={{
                          width: `${
                            ((currentOrder.completedCount || 0) /
                              currentOrder.workOrderCount) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 날짜 정보 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  날짜
                </div>
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">주문일</span>
                    <span>
                      {currentOrder.orderDate
                        ? format(new Date(currentOrder.orderDate), 'yyyy년 M월 d일', {
                            locale: ko,
                          })
                        : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">납기일</span>
                    <span>
                      {currentOrder.dueDate
                        ? format(new Date(currentOrder.dueDate), 'yyyy년 M월 d일', {
                            locale: ko,
                          })
                        : '-'}
                    </span>
                  </div>
                  {currentOrder.completedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">완료일</span>
                      <span>
                        {format(new Date(currentOrder.completedAt), 'yyyy년 M월 d일', {
                          locale: ko,
                        })}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">등록일</span>
                    <span>
                      {format(new Date(currentOrder.createdAt), 'yyyy년 M월 d일', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* 메모 */}
              {currentOrder.memo && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    메모
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-sm whitespace-pre-wrap">{currentOrder.memo}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* 상태 변경 버튼 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">상태 변경</p>
                <div className="flex flex-wrap gap-2">
                  {(
                    ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as OrderStatus[]
                  ).map((status) => (
                    <Button
                      key={status}
                      variant={currentOrder.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      disabled={statusMutation.isPending}
                    >
                      {statusConfig[status].label}
                    </Button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* 삭제 버튼 */}
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">주문 삭제</p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      주문 삭제
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>주문을 삭제하시겠습니까?</AlertDialogTitle>
                      <AlertDialogDescription asChild>
                        <div className="space-y-2">
                          <p>
                            <strong>"{currentOrder.orderName}"</strong> 주문을 삭제합니다.
                          </p>
                          {(currentOrder.workOrderCount || 0) > 0 ? (
                            <div className="rounded-md bg-destructive/10 p-3 text-destructive">
                              <p className="flex items-center gap-2 font-medium">
                                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                                이 주문에는 {currentOrder.workOrderCount}개의 작업이 연결되어 있습니다.
                              </p>
                              <p className="mt-1 text-sm ml-6">
                                삭제하면 연결된 모든 작업과 공정이 함께 삭제됩니다.
                                이 작업은 되돌릴 수 없습니다.
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
            </TabsContent>

            <TabsContent value="work-orders" className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  이 주문에 포함된 작업 목록입니다.
                </p>
                <Button size="sm" onClick={() => setIsAddWorkOrderOpen(true)}>
                  <Plus className="mr-1 h-4 w-4" />
                  작업 추가
                </Button>
              </div>
              <OrderWorkOrderList
                orderId={currentOrder.id}
                workOrders={currentOrder.workOrders || []}
              />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AddWorkOrderDialog
        orderId={currentOrder.id}
        orderCustomerId={currentOrder.customer?.id}
        open={isAddWorkOrderOpen}
        onOpenChange={setIsAddWorkOrderOpen}
      />
    </>
  )
}
