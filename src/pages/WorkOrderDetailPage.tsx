import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Trash2,
  Loader2,
  AlertTriangle,
  Upload,
  ExternalLink,
  CheckCircle2,
  Circle,
  PlayCircle,
  FileText,
  MoreHorizontal,
  Copy,
  Edit,
  ChevronRight,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { workOrderService } from '@/services/workOrderService'
import { kanbanService } from '@/services/kanbanService'
import { attachmentService } from '@/services/attachmentService'
import { FileUploader } from '@/components/features/attachment/FileUploader'
import { cn } from '@/lib/utils'
import type { ProcessStatus } from '@/types'

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; color: string }
> = {
  PENDING: { label: '작업 전', variant: 'secondary', color: 'bg-gray-500' },
  IN_PROGRESS: { label: '진행중', variant: 'default', color: 'bg-blue-500' },
  COMPLETED: { label: '완료', variant: 'outline', color: 'bg-green-500' },
  REJECTED: { label: '반려', variant: 'destructive', color: 'bg-red-500' },
}

const processStatusConfig: Record<ProcessStatus, { label: string; icon: typeof Circle; color: string }> = {
  NOT_STARTED: { label: '대기중', icon: Circle, color: 'text-gray-400' },
  IN_PROGRESS: { label: '진행중', icon: PlayCircle, color: 'text-blue-500' },
  COMPLETED: { label: '완료', icon: CheckCircle2, color: 'text-green-500' },
}

export function WorkOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false)
  const [editFormData, setEditFormData] = useState({
    orderName: '',
    quantity: 1,
    dueDate: '',
    memo: '',
  })

  const workOrderId = Number(id)

  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: () => workOrderService.getById(workOrderId),
    enabled: !!workOrderId,
  })

  const { data: attachments = [], isLoading: isAttachmentsLoading } = useQuery({
    queryKey: ['attachments', workOrderId],
    queryFn: () => attachmentService.getAttachments(workOrderId),
    enabled: !!workOrderId,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentService.upload(workOrderId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', workOrderId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: workOrderService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['workOrders'] })
      toast.success('작업이 삭제되었습니다')
      navigate('/work-status')
    },
    onError: () => {
      toast.error('작업 삭제에 실패했습니다')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: { orderName: string; quantity: number; dueDate?: string; memo?: string }) =>
      workOrderService.update(workOrderId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['workOrders'] })
      setShowEditDialog(false)
      toast.success('작업이 수정되었습니다')
    },
    onError: () => {
      toast.error('작업 수정에 실패했습니다')
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
      })
    },
    onSuccess: (newWorkOrder) => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['workOrders'] })
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
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
    },
  })

  const handleFileUpload = async (file: File) => {
    await uploadMutation.mutateAsync(file)
  }

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(workOrderId)
  }

  const handleOpenEditDialog = () => {
    if (workOrder) {
      setEditFormData({
        orderName: workOrder.orderName,
        quantity: workOrder.quantity,
        dueDate: workOrder.dueDate ? workOrder.dueDate.split('T')[0] : '',
        memo: workOrder.memo || '',
      })
      setShowEditDialog(true)
    }
  }

  const handleEditSubmit = () => {
    updateMutation.mutate({
      orderName: editFormData.orderName,
      quantity: editFormData.quantity,
      dueDate: editFormData.dueDate || undefined,
      memo: editFormData.memo || undefined,
    })
  }

  const handleDuplicateConfirm = () => {
    duplicateMutation.mutate()
  }

  const handleProcessStatusChange = (workOrderProcessId: number, newStatus: ProcessStatus) => {
    updateProcessStatusMutation.mutate({ workOrderProcessId, status: newStatus })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy-MM-dd HH:mm', { locale: ko })
  }

  const formatShortDate = (dateString?: string) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'MM.dd (EEE)', { locale: ko })
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
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
                <span>고객명</span>
                <span className="text-foreground">{workOrder.customer.name}</span>
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
              <DropdownMenuItem onClick={() => setShowDuplicateConfirm(true)}>
                <Copy className="mr-2 h-4 w-4" />
                작업 복제
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleOpenEditDialog}>
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
                {workOrder.dueDate ? formatShortDate(workOrder.dueDate) : '-'}
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

                {workOrder.customer && (
                  <>
                    <span className="text-muted-foreground">고객명</span>
                    <span>{workOrder.customer.name}</span>
                  </>
                )}

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
                      {formatDate(workOrder.dueDate)}
                    </span>
                  </>
                )}

                <span className="text-muted-foreground">생성일</span>
                <span>{formatDate(workOrder.createdAt)}</span>

                {workOrder.completedAt && (
                  <>
                    <span className="text-muted-foreground">완료일</span>
                    <span>{formatDate(workOrder.completedAt)}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 옵션 정보 */}
          {workOrder.options && workOrder.options.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">옵션 정보</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
                  {workOrder.options.map((option) => {
                    const snapshot = (() => {
                      try {
                        return JSON.parse(option.snapshot)
                      } catch {
                        return null
                      }
                    })()

                    return snapshot?.attributes?.map(
                      (attr: {
                        attributeId: number
                        attributeName: string
                        previewType?: string
                        selectedValues?: { valueId: number; value: string }[]
                        inputValue?: string
                        isToggleOn?: boolean
                      }) => {
                        // 표시할 값 결정
                        let displayValue: string | null = null

                        if (attr.previewType === 'TOGGLE_BUTTON') {
                          // 토글이 OFF이면 표시하지 않음
                          if (!attr.isToggleOn) return null
                          displayValue = 'ON'
                        } else if (attr.previewType === 'INPUT_TEXT' || attr.previewType === 'INPUT_NUMBER') {
                          // 입력값이 비어있으면 표시하지 않음
                          if (!attr.inputValue || attr.inputValue.trim() === '') return null
                          displayValue = attr.inputValue
                        } else {
                          // 일반 선택값
                          if (!attr.selectedValues || attr.selectedValues.length === 0) return null
                          displayValue = attr.selectedValues.map(v => v.value).join(', ')
                        }

                        return (
                          <React.Fragment key={`${option.id}-${attr.attributeId}`}>
                            <span className="text-muted-foreground">{attr.attributeName}</span>
                            <span>{displayValue}</span>
                          </React.Fragment>
                        )
                      }
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 메모 */}
          {workOrder.memo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">메모</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{workOrder.memo}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
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
                    const isEditable = workOrder.status === 'IN_PROGRESS' && !isSystemProcess
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
                                  <Badge className="h-5 text-[10px] bg-blue-500">진행중</Badge>
                                )}
                                {!isSystemProcess && wop.status === 'NOT_STARTED' && (
                                  <Badge variant="outline" className="h-5 text-[10px]">대기중</Badge>
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
                                  <SelectTrigger className="w-[70px] h-6 text-[10px] border-0 bg-transparent hover:bg-muted">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="NOT_STARTED">대기</SelectItem>
                                    <SelectItem value="IN_PROGRESS">진행</SelectItem>
                                    <SelectItem value="COMPLETED">완료</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>

                            {/* 완료 시간 */}
                            {wop.completedAt && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                완료: {formatDate(wop.completedAt)}
                              </div>
                            )}
                            {wop.startedAt && wop.status === 'IN_PROGRESS' && (
                              <div className="text-xs text-muted-foreground mt-0.5">
                                시작: {formatDate(wop.startedAt)}
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  첨부 파일
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      {attachments.length}
                    </Badge>
                  )}
                </CardTitle>
                <FileUploader onUpload={handleFileUpload} isUploading={uploadMutation.isPending} compact />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {isAttachmentsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : attachments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                  <Upload className="h-6 w-6 mb-2 opacity-50" />
                  <p className="text-xs">첨부된 파일이 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* 이미지 파일 - 썸네일 그리드 */}
                  {attachments.filter(a => a.contentType?.startsWith('image/')).length > 0 && (
                    <div className="grid grid-cols-3 gap-2">
                      {attachments
                        .filter(a => a.contentType?.startsWith('image/'))
                        .map((attachment) => (
                          <a
                            key={attachment.id}
                            href={attachment.downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group relative aspect-square rounded-lg overflow-hidden border bg-muted hover:ring-2 hover:ring-primary transition-all"
                          >
                            <img
                              src={attachment.thumbnailUrl || attachment.downloadUrl}
                              alt={attachment.originalFilename}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                              <span className="text-white text-[10px] truncate w-full text-center">
                                {attachment.originalFilename}
                              </span>
                              <span className="text-white/70 text-[9px]">
                                {(attachment.fileSize / 1024).toFixed(0)}KB
                              </span>
                            </div>
                          </a>
                        ))}
                    </div>
                  )}

                  {/* 기타 파일 - 리스트 */}
                  {attachments.filter(a => !a.contentType?.startsWith('image/')).map((attachment) => {
                    const ext = attachment.originalFilename.split('.').pop()?.toUpperCase() || 'FILE'
                    const isPdf = attachment.contentType === 'application/pdf'

                    return (
                      <a
                        key={attachment.id}
                        href={attachment.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className={cn(
                          "h-9 w-9 rounded flex items-center justify-center text-[10px] font-medium",
                          isPdf ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {ext}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate group-hover:text-primary">
                            {attachment.originalFilename}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {(attachment.fileSize / 1024).toFixed(0)}KB · {format(new Date(attachment.createdAt), 'yyyy-MM-dd HH:mm')}
                          </p>
                        </div>
                      </a>
                    )
                  })}
                </div>
              )}
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

      {/* 수정 다이얼로그 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>작업 수정</DialogTitle>
            <DialogDescription>
              작업의 기본 정보를 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="orderName">작업명</Label>
              <Input
                id="orderName"
                value={editFormData.orderName}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, orderName: e.target.value }))}
                placeholder="작업명을 입력하세요"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quantity">수량</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                value={editFormData.quantity}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">출고 예정일</Label>
              <Input
                id="dueDate"
                type="date"
                value={editFormData.dueDate}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="memo">메모</Label>
              <Textarea
                id="memo"
                value={editFormData.memo}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, memo: e.target.value }))}
                placeholder="메모를 입력하세요"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              취소
            </Button>
            <Button onClick={handleEditSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                  동일한 상품, 수량, 공정 정보로 새 작업이 생성됩니다.
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
