import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { toast } from 'sonner'
import {
  Trash2,
  Package,
  User,
  Calendar,
  Hash,
  FileText,
  Loader2,
  AlertTriangle,
  Paperclip,
  ExternalLink,
  X,
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
  PeekPanel,
  PeekPanelSection,
  PeekPanelFooter,
} from '@/components/ui/peek-panel'
import { workOrderService } from '@/services/workOrderService'
import { kanbanService } from '@/services/kanbanService'
import { attachmentService } from '@/services/attachmentService'
import { FileUploader } from '@/components/features/attachment/FileUploader'
import { AttachmentList } from '@/components/features/attachment/AttachmentList'
import type { ProcessStatus } from '@/types'

interface WorkOrderPeekPanelProps {
  workOrderId: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusConfig: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: '작업 전', variant: 'secondary' },
  IN_PROGRESS: { label: '작업 중', variant: 'default' },
  COMPLETED: { label: '완료', variant: 'outline' },
  REJECTED: { label: '반려', variant: 'destructive' },
}

const processStatusConfig: Record<ProcessStatus, { label: string; color: string }> = {
  NOT_STARTED: { label: '작업 전', color: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: '작업 중', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: '작업 완료', color: 'bg-green-100 text-green-700' },
}

export function WorkOrderPeekPanel({
  workOrderId,
  open,
  onOpenChange,
}: WorkOrderPeekPanelProps) {
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showProcessDeleteConfirm, setShowProcessDeleteConfirm] = useState(false)
  const [processToDelete, setProcessToDelete] = useState<{ id: number; name: string } | null>(null)

  const { data: workOrder, isLoading, error } = useQuery({
    queryKey: ['workOrder', workOrderId],
    queryFn: () => workOrderService.getById(workOrderId!),
    enabled: !!workOrderId && open,
  })

  const { data: attachments = [], isLoading: isAttachmentsLoading } = useQuery({
    queryKey: ['attachments', workOrderId],
    queryFn: () => attachmentService.getAttachments(workOrderId!),
    enabled: !!workOrderId && open,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentService.upload(workOrderId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', workOrderId] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: workOrderService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['workOrders'] })
      setShowDeleteConfirm(false)
      onOpenChange(false)
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

  const deleteProcessMutation = useMutation({
    mutationFn: kanbanService.deleteWorkOrderProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
      toast.success('공정이 삭제되었습니다')
      setShowProcessDeleteConfirm(false)
      setProcessToDelete(null)
    },
    onError: () => {
      toast.error('공정 삭제에 실패했습니다')
    },
  })

  const handleFileUpload = async (file: File) => {
    await uploadMutation.mutateAsync(file)
  }

  const handleDeleteConfirm = () => {
    if (workOrderId) {
      deleteMutation.mutate(workOrderId)
    }
  }

  const handleProcessStatusChange = (
    workOrderProcessId: number,
    newStatus: ProcessStatus
  ) => {
    updateProcessStatusMutation.mutate({ workOrderProcessId, status: newStatus })
  }

  const handleProcessDeleteClick = (processId: number, processName: string) => {
    setProcessToDelete({ id: processId, name: processName })
    setShowProcessDeleteConfirm(true)
  }

  const handleProcessDeleteConfirm = () => {
    if (processToDelete) {
      deleteProcessMutation.mutate(processToDelete.id)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy.MM.dd (EEE)', { locale: ko })
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  // 상위 주문 링크 breadcrumb
  const breadcrumb = workOrder?.order ? (
    <Link
      to={`/orders/${workOrder.order.id}`}
      className="inline-flex items-center gap-1 text-primary hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      <span>주문: {workOrder.order.orderName || workOrder.order.orderNumber}</span>
      <ExternalLink className="h-3 w-3" />
    </Link>
  ) : null

  // 제목
  const title = workOrder ? (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm text-muted-foreground">
        {workOrder.orderNumber}
      </span>
      <Badge variant={statusConfig[workOrder.status]?.variant ?? 'secondary'}>
        {statusConfig[workOrder.status]?.label ?? workOrder.status}
      </Badge>
    </div>
  ) : null

  return (
    <>
      <PeekPanel
        open={open}
        onOpenChange={onOpenChange}
        expandTo={workOrderId ? `/work-orders/${workOrderId}` : undefined}
        title={title}
        breadcrumb={breadcrumb}
      >
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error || !workOrder ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-muted-foreground">
            <AlertTriangle className="h-8 w-8" />
            <p>작업지시서를 불러올 수 없습니다.</p>
          </div>
        ) : (
          <>
            {/* 작업명 */}
            <div className="px-4 py-3 border-b bg-gray-50">
              <h2 className="font-semibold text-lg">{workOrder.orderName}</h2>
            </div>

            {/* 기본 정보 */}
            <PeekPanelSection title="기본 정보">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">상품</span>
                  <span className="ml-auto text-sm font-medium">
                    {workOrder.product?.name ?? '-'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">수량</span>
                  <span className="ml-auto text-sm font-medium">
                    {workOrder.quantity.toLocaleString()}개
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">고객</span>
                  <span className="ml-auto text-sm font-medium">
                    {workOrder.customer?.name ?? '-'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">출고일</span>
                  <span
                    className={`ml-auto text-sm font-medium ${
                      isOverdue(workOrder.dueDate) && workOrder.status !== 'COMPLETED'
                        ? 'text-destructive'
                        : ''
                    }`}
                  >
                    {formatDate(workOrder.dueDate)}
                    {isOverdue(workOrder.dueDate) && workOrder.status !== 'COMPLETED' && (
                      <span className="ml-1 text-xs">(지연)</span>
                    )}
                  </span>
                </div>
                {workOrder.memo && (
                  <div className="flex items-start gap-3">
                    <FileText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">메모</span>
                    <span className="ml-auto text-right text-sm">{workOrder.memo}</span>
                  </div>
                )}
              </div>
            </PeekPanelSection>

            {/* 공정 현황 - 시스템 공정(작업 전, 작업 완료) 제외 */}
            <PeekPanelSection title="공정 현황" className="border-t">
              <div className="space-y-2">
                {workOrder.processes
                  .filter((wop) => !wop.process.isSystem)
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((wop) => {
                    const isEditable = workOrder.status === 'IN_PROGRESS'

                    // 시스템 공정은 삭제 불가 (이미 필터링되어 있지만 안전장치)
                    const isSystemProcess = wop.process.isSystem

                    return (
                      <div
                        key={wop.id}
                        className="flex items-center gap-3 rounded-lg border p-3 group"
                      >
                        <div
                          className="h-3 w-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: wop.process.color ?? '#6b7280' }}
                        />
                        <span className="flex-1 text-sm font-medium">
                          {wop.process.name}
                        </span>
                        {isEditable ? (
                          <Select
                            value={wop.status}
                            onValueChange={(value: ProcessStatus) =>
                              handleProcessStatusChange(wop.id, value)
                            }
                            disabled={updateProcessStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-[100px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NOT_STARTED">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-gray-400" />
                                  작업 전
                                </span>
                              </SelectItem>
                              <SelectItem value="IN_PROGRESS">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-blue-500" />
                                  작업 중
                                </span>
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-green-500" />
                                  작업 완료
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={processStatusConfig[wop.status].color}
                          >
                            {processStatusConfig[wop.status].label}
                          </Badge>
                        )}
                        {/* 공정 삭제 버튼 (시스템 공정 제외) */}
                        {!isSystemProcess && (
                          <button
                            onClick={() => handleProcessDeleteClick(wop.id, wop.process.name)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                            title="공정 삭제"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                {workOrder.processes.filter((wop) => !wop.process.isSystem).length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    등록된 공정이 없습니다.
                  </p>
                )}
              </div>
            </PeekPanelSection>

            {/* 옵션 정보 */}
            {workOrder.options && workOrder.options.length > 0 && (
              <PeekPanelSection title="옵션" className="border-t">
                <div className="divide-y">
                  {workOrder.options.map((option, index) => {
                    const snapshot = (() => {
                      try {
                        return JSON.parse(option.snapshot)
                      } catch {
                        return null
                      }
                    })()
                    const optionName = snapshot?.optionName

                    return (
                      <div
                        key={option.id ?? index}
                        className="py-3 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{optionName}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.optionCount}개 · ₩{option.optionTotalAmount.toLocaleString()}
                          </span>
                        </div>
                        {snapshot?.attributes && snapshot.attributes.length > 0 && (
                          <div className="space-y-1.5">
                            {snapshot.attributes.map(
                              (attr: {
                                attributeId: number
                                attributeName: string
                                selectedValues: {
                                  valueId: number
                                  value: string
                                  price: number
                                }[]
                              }) => (
                                <div
                                  key={attr.attributeId}
                                  className="flex items-start gap-2 text-xs"
                                >
                                  <span className="text-muted-foreground min-w-[60px]">
                                    {attr.attributeName}:
                                  </span>
                                  <div className="flex flex-wrap gap-1">
                                    {attr.selectedValues?.map(
                                      (val: {
                                        valueId: number
                                        value: string
                                        price: number
                                      }) => (
                                        <Badge
                                          key={val.valueId}
                                          variant="secondary"
                                          className="text-xs font-normal"
                                        >
                                          {val.value}
                                          {val.price > 0 && (
                                            <span className="ml-1 text-muted-foreground">
                                              +₩{val.price.toLocaleString()}
                                            </span>
                                          )}
                                        </Badge>
                                      )
                                    )}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </PeekPanelSection>
            )}

            {/* 첨부파일 */}
            <PeekPanelSection title="첨부파일" className="border-t">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-muted-foreground" />
                  {attachments.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                      {attachments.length}
                    </Badge>
                  )}
                </div>
                <FileUploader
                  onUpload={handleFileUpload}
                  isUploading={uploadMutation.isPending}
                />
                <AttachmentList
                  workOrderId={workOrderId!}
                  attachments={attachments}
                  isLoading={isAttachmentsLoading}
                />
              </div>
            </PeekPanelSection>

            {/* 하단 삭제 버튼 */}
            <PeekPanelFooter>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="destructive"
                className="w-full gap-2"
                size="sm"
              >
                <Trash2 className="h-4 w-4" />
                작업지시서 삭제
              </Button>
            </PeekPanelFooter>
          </>
        )}
      </PeekPanel>

      {/* 작업지시서 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작업지시서 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                {workOrder && (
                  <>
                    <p>
                      <strong>{workOrder.orderNumber}</strong> ({workOrder.orderName})
                      을(를) 삭제하시겠습니까?
                    </p>
                    {workOrder.processes.length > 0 && (
                      <div className="rounded-md bg-destructive/10 p-3 text-destructive text-sm">
                        <p className="flex items-center gap-2 font-medium">
                          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                          {workOrder.processes.length}개의 공정이 함께 삭제됩니다.
                        </p>
                      </div>
                    )}
                    <p className="text-destructive text-sm">
                      이 작업은 되돌릴 수 없습니다.
                    </p>
                  </>
                )}
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

      {/* 공정 삭제 확인 다이얼로그 */}
      <AlertDialog open={showProcessDeleteConfirm} onOpenChange={(open) => {
        setShowProcessDeleteConfirm(open)
        if (!open) setProcessToDelete(null)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공정 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  <strong>{processToDelete?.name}</strong> 공정을 삭제하시겠습니까?
                </p>
                <p className="text-sm text-muted-foreground">
                  이 공정만 작업지시서에서 제거됩니다. 다른 공정은 유지됩니다.
                </p>
                <p className="text-destructive text-sm">
                  이 작업은 되돌릴 수 없습니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleProcessDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProcessMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
