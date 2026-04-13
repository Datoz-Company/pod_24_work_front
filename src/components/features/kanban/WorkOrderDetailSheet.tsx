import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
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
} from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { workOrderService } from '@/services/workOrderService'
import { kanbanService } from '@/services/kanbanService'
import { attachmentService } from '@/services/attachmentService'
import { FileUploader } from '@/components/features/attachment/FileUploader'
import { AttachmentList } from '@/components/features/attachment/AttachmentList'
import type { ProcessStatus } from '@/types'
import { useState } from 'react'

interface WorkOrderDetailSheetProps {
  workOrderId: number | null
  /** 수정 가능한 공정 ID (해당 공정 카드에서 열었을 때만 수정 가능) */
  editableProcessId?: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
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

export function WorkOrderDetailSheet({
  workOrderId,
  editableProcessId,
  open,
  onOpenChange,
}: WorkOrderDetailSheetProps) {
  const queryClient = useQueryClient()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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

  const handleFileUpload = async (file: File) => {
    await uploadMutation.mutateAsync(file)
  }

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
    mutationFn: ({ workOrderProcessId, status }: { workOrderProcessId: number; status: ProcessStatus }) =>
      kanbanService.updateProcessStatus(workOrderProcessId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['workOrder', workOrderId] })
    },
  })

  const handleDeleteConfirm = () => {
    if (workOrderId) {
      deleteMutation.mutate(workOrderId)
    }
  }

  const handleProcessStatusChange = (workOrderProcessId: number, newStatus: ProcessStatus) => {
    updateProcessStatusMutation.mutate({
      workOrderProcessId,
      status: newStatus,
    })
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'yyyy.MM.dd (EEE)', { locale: ko })
  }

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false
    return new Date(dueDate) < new Date()
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
              <AlertTriangle className="h-8 w-8" />
              <p>작업지시서를 불러올 수 없습니다.</p>
            </div>
          ) : workOrder ? (
            <>
              <SheetHeader className="space-y-1">
                <div className="flex items-center gap-2">
                  <SheetTitle className="text-lg">
                    {workOrder.orderNumber}
                  </SheetTitle>
                  <Badge variant={statusConfig[workOrder.status]?.variant ?? 'secondary'}>
                    {statusConfig[workOrder.status]?.label ?? workOrder.status}
                  </Badge>
                </div>
                <SheetDescription className="text-base font-medium text-foreground">
                  {workOrder.orderName}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-6 h-[calc(100vh-280px)]">
                <div className="space-y-6 pr-4">
                  {/* 기본 정보 */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">기본 정보</h3>
                    <div className="grid gap-3">
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
                        <span className={`ml-auto text-sm font-medium ${isOverdue(workOrder.dueDate) && workOrder.status !== 'COMPLETED' ? 'text-destructive' : ''}`}>
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
                          <span className="ml-auto text-right text-sm">
                            {workOrder.memo}
                          </span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* 공정 현황 - 상태 선택 가능 */}
                  <section className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground">공정 현황</h3>
                    <div className="space-y-2">
                      {workOrder.processes
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((wop) => {
                          const isCurrentProcess = wop.id === editableProcessId
                          // 현재 공정이고 작업지시서가 IN_PROGRESS 상태일 때만 상태 변경 가능
                          const isEditable = isCurrentProcess && workOrder.status === 'IN_PROGRESS'

                          return (
                            <div
                              key={wop.id}
                              className={`flex items-center gap-3 rounded-lg border p-3 ${
                                isCurrentProcess ? 'border-primary/50 bg-primary/5' : ''
                              }`}
                            >
                              <div
                                className="h-3 w-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: wop.process.color ?? '#6b7280' }}
                              />
                              <span className="flex-1 text-sm font-medium">
                                {wop.process.name}
                                {isCurrentProcess && (
                                  <span className="ml-2 text-xs text-primary">(현재)</span>
                                )}
                              </span>
                              {/* 상태 선택 드롭다운 */}
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
                            </div>
                          )
                        })}
                      {workOrder.processes.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-4">
                          등록된 공정이 없습니다.
                        </p>
                      )}
                    </div>
                  </section>

                  {/* 옵션 정보 */}
                  {workOrder.options && workOrder.options.length > 0 && (
                    <section className="space-y-3">
                      <h3 className="text-sm font-semibold text-muted-foreground">옵션</h3>
                      <div className="space-y-2">
                        {workOrder.options.map((option, index) => {
                          const snapshot = (() => {
                            try {
                              return JSON.parse(option.snapshot)
                            } catch {
                              return null
                            }
                          })()
                          const optionName = snapshot?.name ?? `옵션 ${index + 1}`

                          return (
                            <div
                              key={option.id ?? index}
                              className="flex items-center justify-between rounded-lg border p-3"
                            >
                              <span className="text-sm font-medium">{optionName}</span>
                              <span className="text-sm text-muted-foreground">
                                {option.optionCount}개 · ₩{option.optionTotalAmount.toLocaleString()}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  )}

                  {/* 첨부파일 */}
                  <section className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <h3 className="text-sm font-semibold text-muted-foreground">첨부파일</h3>
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
                  </section>
                </div>
              </ScrollArea>

              {/* 하단 액션 버튼 */}
              <div className="absolute bottom-0 left-0 right-0 border-t bg-background p-4">
                <Button
                  onClick={() => setShowDeleteConfirm(true)}
                  variant="destructive"
                  className="w-full gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  작업지시서 삭제
                </Button>
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>작업지시서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {workOrder && (
                <>
                  <strong>{workOrder.orderNumber}</strong> ({workOrder.orderName})을(를) 삭제하시겠습니까?
                  <br />
                  <span className="text-destructive">이 작업은 되돌릴 수 없습니다.</span>
                </>
              )}
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
    </>
  )
}
