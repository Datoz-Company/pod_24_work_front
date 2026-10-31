import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Trash2,
  Loader2,
  AlertTriangle,
  ExternalLink,
  CheckCircle2,
  Circle,
  PlayCircle,
  MoreHorizontal,
  Copy,
  Edit,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { excelService } from '@/services/excelService'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { workOrderService } from '@/services/workOrderService'
import { kanbanService } from '@/services/kanbanService'
import { WorkOrderAttachments } from '@/components/features/attachment/WorkOrderAttachments'
import { WorkOrderOptionsView } from '@/components/features/option/WorkOrderOptionsView'
import { EditWorkOrderDialog } from '@/components/features/work-order/EditWorkOrderDialog'
import { useCanViewQuotes } from '@/lib/permissions'
import { WorkOrderMemoEditor } from '@/components/features/kanban/WorkOrderMemoEditor'
import { SHIPPING_METHOD_LABELS } from '@/types'
import { cn, isNotNil } from '@/lib/utils'
import { toOptionRequest } from '@/lib/optionSnapshot'
import type { ProcessStatus } from '@/types'
import { PROCESS_STATUS, WORK_ORDER_STATUS } from '@/lib/status'
import { formatDateTime, formatDueDate, isOverdue } from '@/lib/format'
import { invalidateWorkData } from '@/lib/queryInvalidation'

const statusConfig = WORK_ORDER_STATUS

const processStatusConfig: Record<ProcessStatus, { label: string; icon: typeof Circle; color: string }> = {
  NOT_STARTED: { label: PROCESS_STATUS.NOT_STARTED.label, icon: Circle, color: 'text-gray-400' },
  IN_PROGRESS: { label: PROCESS_STATUS.IN_PROGRESS.label, icon: PlayCircle, color: 'text-blue-500' },
  COMPLETED: { label: PROCESS_STATUS.COMPLETED.label, icon: CheckCircle2, color: 'text-green-500' },
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canViewPrices = useCanViewQuotes()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)

  const workOrderId = Number(id)

  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: () => workOrderService.getById(workOrderId),
    enabled: !!workOrderId,
  })

  const deleteMutation = useMutation({
    mutationFn: workOrderService.delete,
    onSuccess: () => {
      invalidateWorkData(queryClient)
      toast.success('작업이 삭제되었습니다')
      navigate('/work-status')
    },
    onError: () => {
      toast.error('작업 삭제에 실패했습니다')
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: () => {
      if (!workOrder) throw new Error('작업 정보가 없습니다')
      return workOrderService.create({
        orderName: `${workOrder.orderName} (복사본)`,
        productId: workOrder.product.id,
        customerId: workOrder.customer?.id,
        orderId: workOrder.order?.id,
        quantity: workOrder.quantity,
        dueDate: workOrder.dueDate,
        memo: workOrder.memo,
        processIds: workOrder.processes
          .filter(p => !p.process.isSystem)
          .map(p => p.process.id),
        options: (workOrder.options ?? []).map(toOptionRequest).filter(isNotNil),
      })
    },
    onSuccess: (newWorkOrder) => {
      invalidateWorkData(queryClient)
      setShowDuplicateConfirm(false)
      toast.success('작업이 복제되었습니다')
      navigate(`/work-orders/${newWorkOrder.id}`)
    },
    onError: () => {
      toast.error('작업 복제에 실패했습니다')
    },
  })

  const updateProcessStatusMutation = useMutation({
    mutationFn: ({
      workOrderProcessId,
      status,
    }: {
      workOrderProcessId: number
      status: ProcessStatus
    }) => kanbanService.updateProcessStatus(workOrderProcessId, status),
    onSuccess: () => {
      invalidateWorkData(queryClient)
    },
  })

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(workOrderId)
  }

  const handleDuplicateConfirm = () => {
    duplicateMutation.mutate()
  }

  const handleProcessStatusChange = (workOrderProcessId: number, newStatus: ProcessStatus) => {
    updateProcessStatusMutation.mutate({ workOrderProcessId, status: newStatus })
  }

  // 중간 공정만 필터링 (시스템 공정 제외)
  const getMiddleProcesses = () => {
    if (!workOrder?.processes) return []
    return workOrder.processes.filter(p => !p.process.isSystem)
  }

  // 진행률 계산 (시스템 공정 제외)
  const calculateProgress = () => {
    const middleProcesses = getMiddleProcesses()
    if (middleProcesses.length === 0) return 0
    const completed = middleProcesses.filter(p => p.status === 'COMPLETED').length
    return Math.round((completed / middleProcesses.length) * 100)
  }

  // 현재 공정 찾기 (시스템 공정 제외)
  const getCurrentProcess = () => {
    const middleProcesses = getMiddleProcesses()
    if (middleProcesses.length === 0) return null
    const sorted = [...middleProcesses].sort((a, b) => a.displayOrder - b.displayOrder)
    return sorted.find(p => p.status === 'IN_PROGRESS') || sorted.find(p => p.status === 'NOT_STARTED')
  }

  // 다음 공정 찾기 (시스템 공정 제외)
  const getNextProcess = () => {
    const middleProcesses = getMiddleProcesses()
    if (middleProcesses.length === 0) return null
    const sorted = [...middleProcesses].sort((a, b) => a.displayOrder - b.displayOrder)
    const currentIndex = sorted.findIndex(p => p.status === 'IN_PROGRESS')
    if (currentIndex >= 0 && currentIndex < sorted.length - 1) {
      return sorted[currentIndex + 1]
    }
    return null
  }

  const progress = calculateProgress()
  const currentProcess = getCurrentProcess()
  const nextProcess = getNextProcess()

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !workOrder) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">작업지시서를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => navigate('/work-status')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          작업 현황으로 돌아가기
        </Button>
      </div>
    )
  }

  // 상단·하단에 동일하게 노출하는 작업 액션 (긴 페이지에서 다시 올라가지 않도록)
  const actions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          excelService
            .workInstruction(workOrder.id, workOrder.orderNumber)
            .catch(() => toast.error('작업 지시서 생성에 실패했습니다'))
        }
      >
        <FileSpreadsheet className="mr-1 h-4 w-4" />
        작업 지시서 엑셀
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            작업 옵션
            <MoreHorizontal className="ml-1 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setShowDuplicateConfirm(true)}>
            <Copy className="mr-2 h-4 w-4" />
            작업 복제
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            작업 수정
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            작업 삭제
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* 브레드크럼 */}
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/work-status" className="hover:text-foreground">작업 현황</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">작업 상세</span>
      </div>

      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{workOrder.orderNumber}</h1>
            <Badge variant={statusConfig[workOrder.status]?.variant ?? 'secondary'}>
              {statusConfig[workOrder.status]?.label ?? workOrder.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {workOrder.order && (
              <>
                <span>주문번호</span>
                <Link to={`/orders/${workOrder.order.id}`} className="text-primary hover:underline">
                  {workOrder.order.orderNumber}
                </Link>
                <span>|</span>
              </>
            )}
            {workOrder.customer && (
              <>
                <span>주문자</span>
                <span className="text-foreground">{workOrder.customer.name}</span>
              </>
            )}
          </div>
        </div>

        {actions}
      </div>

      {/* 요약 카드 */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* 진행 상태 */}
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground mb-1">진행 상태</div>
              <div className="flex items-center gap-3">
                <Progress
                  value={progress}
                  className="flex-1 h-2"
                  indicatorClassName={progress === 100 ? 'bg-green-500' : undefined}
                />
                <span className={cn(
                  "text-sm font-medium",
                  progress === 100 && "text-green-600"
                )}>{progress}%</span>
              </div>
            </div>

            {/* 현재 단계 */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">현재 단계</div>
              <div className="flex items-center gap-1.5">
                {currentProcess && (
                  <>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: currentProcess.process.color }}
                    />
                    <span className="text-sm font-medium">{currentProcess.process.name}</span>
                  </>
                )}
                {!currentProcess && <span className="text-sm text-muted-foreground">-</span>}
              </div>
            </div>

            {/* 다음 단계 */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">다음 단계</div>
              <div className="flex items-center gap-1.5">
                {nextProcess && (
                  <>
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: nextProcess.process.color }}
                    />
                    <span className="text-sm font-medium">{nextProcess.process.name}</span>
                  </>
                )}
                {!nextProcess && <span className="text-sm text-muted-foreground">-</span>}
              </div>
            </div>

            {/* 출고 예정일 */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">출고 예정일</div>
              <div className={cn(
                "text-sm font-medium",
                isOverdue(workOrder.dueDate) && workOrder.status !== 'COMPLETED' && "text-destructive"
              )}>
                {formatDueDate(workOrder.dueDate)}
              </div>
            </div>

            {/* 수량 */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">수량</div>
              <div className="text-sm font-medium">{workOrder.quantity.toLocaleString()} EA</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 메인 컨텐츠 - 2열 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 좌측: 기본 정보 + 옵션 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 기본 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-[100px_1fr] gap-y-3 text-sm">
                <span className="text-muted-foreground">작업명</span>
                <span className="font-medium">{workOrder.orderName}</span>

                {workOrder.product && (
                  <>
                    <span className="text-muted-foreground">제품명</span>
                    <span>{workOrder.product.name}</span>
                  </>
                )}

                <span className="text-muted-foreground">상호</span>
                <span>{workOrder.order?.clientName ?? '-'}</span>

                {workOrder.customer && (
                  <>
                    <span className="text-muted-foreground">주문자</span>
                    <span>{workOrder.customer.name}</span>
                  </>
                )}

                <span className="text-muted-foreground">출고 방식</span>
                <span>{workOrder.order?.shippingMethod ? SHIPPING_METHOD_LABELS[workOrder.order.shippingMethod] : '-'}</span>

                {workOrder.order && (
                  <>
                    <span className="text-muted-foreground">주문번호</span>
                    <Link to={`/orders/${workOrder.order.id}`} className="text-primary hover:underline inline-flex items-center gap-1">
                      {workOrder.order.orderNumber}
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </>
                )}

                <span className="text-muted-foreground">수량</span>
                <span>{workOrder.quantity.toLocaleString()}개</span>

                {workOrder.dueDate && (
                  <>
                    <span className="text-muted-foreground">출고 예정일</span>
                    <span className={cn(
                      isOverdue(workOrder.dueDate) && workOrder.status !== 'COMPLETED' && "text-destructive"
                    )}>
                      {formatDueDate(workOrder.dueDate)}
                    </span>
                  </>
                )}

                <span className="text-muted-foreground">생성일</span>
                <span>{formatDateTime(workOrder.createdAt)}</span>

                {workOrder.completedAt && (
                  <>
                    <span className="text-muted-foreground">완료일</span>
                    <span>{formatDateTime(workOrder.completedAt)}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 옵션 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">옵션 정보</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <WorkOrderOptionsView options={workOrder.options ?? []} showPrices={canViewPrices} />
            </CardContent>
          </Card>

          {/* 메모 — 칸반 패널과 같은 인라인 편집기 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">메모</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <WorkOrderMemoEditor key={workOrder.id} workOrderId={workOrder.id} memo={workOrder.memo} />
            </CardContent>
          </Card>
        </div>

        {/* 우측: 공정 현황 + 첨부파일 + 관련 링크 */}
        <div className="space-y-4">
          {/* 단계 진행 현황 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">단계 진행 현황</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-0">
                {(() => {
                  // 모든 공정 표시 (시스템 공정 포함)
                  const allProcesses = workOrder.processes
                    .sort((a, b) => a.displayOrder - b.displayOrder)

                  return allProcesses.map((wop, index) => {
                    const StatusIcon = processStatusConfig[wop.status].icon
                    // 시스템 공정은 상태 변경 불가
                    const isSystemProcess = wop.process.isSystem
                    // 작업 상태와 무관하게 변경 가능 — 완료된 작업도 미착수로 되돌릴 수 있어야 함
                    const isEditable = !isSystemProcess
                    const isLast = index === allProcesses.length - 1

                    return (
                      <div key={wop.id} className="relative">
                        {/* 연결선 */}
                        {!isLast && (
                          <div className="absolute left-[11px] top-[24px] w-0.5 h-[calc(100%-8px)] bg-gray-200" />
                        )}

                        <div className={cn(
                          "flex items-start gap-3 py-2 px-2 rounded-lg transition-colors",
                          wop.status === 'IN_PROGRESS' && !isSystemProcess && "bg-blue-50",
                          isSystemProcess && "opacity-70"
                        )}>
                          {/* 아이콘 */}
                          <div className="relative z-10 mt-0.5">
                            <StatusIcon className={cn("h-5 w-5", processStatusConfig[wop.status].color)} />
                          </div>

                          {/* 내용 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "text-sm font-medium",
                                  isSystemProcess && "text-muted-foreground"
                                )}>
                                  {wop.process.name}
                                </span>
                                {!isSystemProcess && wop.status === 'IN_PROGRESS' && (
                                  <Badge className="h-5 text-[10px] bg-blue-500">{PROCESS_STATUS.IN_PROGRESS.label}</Badge>
                                )}
                                {!isSystemProcess && wop.status === 'NOT_STARTED' && (
                                  <Badge variant="outline" className="h-5 text-[10px]">{PROCESS_STATUS.NOT_STARTED.label}</Badge>
                                )}
                              </div>

                              {/* 상태 변경 (편집 가능할 때, 시스템 공정 제외) */}
                              {isEditable && (
                                <Select
                                  value={wop.status}
                                  onValueChange={(value: ProcessStatus) =>
                                    handleProcessStatusChange(wop.id, value)
                                  }
                                  disabled={updateProcessStatusMutation.isPending}
                                >
                                  <SelectTrigger className="w-[84px] h-6 text-[10px] border-0 bg-transparent hover:bg-muted">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(Object.keys(PROCESS_STATUS) as ProcessStatus[]).map((value) => (
                                      <SelectItem key={value} value={value}>{PROCESS_STATUS[value].label}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            {/* 완료 시간 */}
                            {wop.completedAt && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                완료: {formatDateTime(wop.completedAt)}
                              </div>
                            )}
                            {wop.startedAt && wop.status === 'IN_PROGRESS' && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                시작: {formatDateTime(wop.startedAt)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}

                {workOrder.processes.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    등록된 공정이 없습니다.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 첨부 파일 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">첨부 파일</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <WorkOrderAttachments workOrderId={workOrder.id} />
            </CardContent>
          </Card>

          {/* 관련 링크 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">관련 링크</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {workOrder.order && (
                <Link
                  to={`/orders/${workOrder.order.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-sm text-muted-foreground">주문 상세</span>
                  <span className="text-sm text-primary group-hover:underline flex items-center gap-1">
                    {workOrder.order.orderNumber}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </Link>
              )}
              {workOrder.customer && (
                <Link
                  to={`/customers/${workOrder.customer.id}`}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <span className="text-sm text-muted-foreground">고객 정보</span>
                  <span className="text-sm text-primary group-hover:underline flex items-center gap-1">
                    {workOrder.customer.name}
                    <ExternalLink className="h-3 w-3" />
                  </span>
                </Link>
              )}
              {workOrder.product && (
                <div className="flex items-center justify-between p-2">
                  <span className="text-sm text-muted-foreground">제품</span>
                  <span className="text-sm">{workOrder.product.name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 하단 액션바 */}
      <div className="sticky bottom-0 flex justify-end border-t bg-white/95 py-3 backdrop-blur">
        {actions}
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작업지시서 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <strong>{workOrder.orderNumber}</strong> ({workOrder.orderName})을(를)
                  삭제하시겠습니까?
                </p>
                {workOrder.processes.length > 0 && (
                  <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                    <p className="flex items-center gap-2 font-medium">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      {workOrder.processes.length}개의 공정이 함께 삭제됩니다.
                    </p>
                  </div>
                )}
                <p className="text-destructive text-sm">이 작업은 되돌릴 수 없습니다.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 수정 다이얼로그 — 품명·수량·옵션·공정·출고 예정일 */}
      <EditWorkOrderDialog workOrder={workOrder} open={showEditDialog} onOpenChange={setShowEditDialog} />

      {/* 복제 확인 다이얼로그 */}
      <AlertDialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작업 복제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <strong>{workOrder.orderName}</strong> 작업을 복제하시겠습니까?
                </p>
                <p className="text-muted-foreground text-sm">
                  동일한 상품, 수량, 옵션, 공정 정보로 새 작업이 생성됩니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDuplicateConfirm}
              disabled={duplicateMutation.isPending}
            >
              {duplicateMutation.isPending ? '복제 중...' : '복제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
