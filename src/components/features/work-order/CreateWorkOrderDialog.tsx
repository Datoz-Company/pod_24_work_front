import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  X,
  Paperclip,
  Check,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Plus,
  Trash2,
} from 'lucide-react'
import { productService } from '@/services/productService'
import { workOrderService } from '@/services/workOrderService'
import { optionService } from '@/services/optionService'
import { attachmentService } from '@/services/attachmentService'
import { orderService } from '@/services/orderService'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OptionSelector } from '@/components/features/option/OptionSelector'
import { FileUploader } from '@/components/features/attachment/FileUploader'
import { CustomerCombobox } from '@/components/features/customer/CustomerCombobox'
import { cn } from '@/lib/utils'
import type { WorkOrderCreateRequest, OrderCreateRequest, Product } from '@/types'
import type { WorkOrderOptionRequest } from '@/types/option'
import { toast } from 'sonner'

interface CreateWorkOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface WorkOrderFormData {
  id: string // 임시 ID (UI용)
  orderName: string
  productId: number
  quantity: number
  dueDate?: string
  memo: string
  options: WorkOrderOptionRequest[]
  processIds: number[]
  pendingFiles: File[]
  isExpanded: boolean
  isNameCustomized: boolean // 사용자가 직접 이름을 수정했는지 여부
}

type OrderMode = 'create' | 'skip'

const createEmptyWorkOrder = (orderName: string = ''): WorkOrderFormData => ({
  id: crypto.randomUUID(),
  orderName,
  productId: 0,
  quantity: 1,
  dueDate: undefined,
  memo: '',
  options: [],
  processIds: [],
  pendingFiles: [],
  isExpanded: true,
  isNameCustomized: false, // 사용자가 직접 수정했는지 여부
})

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
}: CreateWorkOrderDialogProps) {
  const queryClient = useQueryClient()

  // 스텝 상태 (1: 주문 선택/생성, 2: 작업 상세)
  const [step, setStep] = useState(1)

  // 주문 관련 상태
  const [orderMode, setOrderMode] = useState<OrderMode>('create')
  const [selectedOrderId, setSelectedOrderId] = useState<number | undefined>()
  const [newOrderData, setNewOrderData] = useState<OrderCreateRequest>({
    orderName: '',
    customerId: undefined,
    dueDate: undefined,
    memo: '',
  })

  // 작업 목록 (여러 작업 지원)
  const [workOrders, setWorkOrders] = useState<WorkOrderFormData[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
  })

  const { data: activeOrders = [], refetch: refetchOrders } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: orderService.getActive,
  })

  const createWorkOrderMutation = useMutation({
    mutationFn: (data: WorkOrderCreateRequest) => workOrderService.create(data),
  })

  const createOrderMutation = useMutation({
    mutationFn: (data: OrderCreateRequest) => orderService.create(data),
  })

  const resetForm = () => {
    setStep(1)
    setOrderMode('create')
    setSelectedOrderId(undefined)
    setNewOrderData({
      orderName: '',
      customerId: undefined,
      dueDate: undefined,
      memo: '',
    })
    setWorkOrders([])
    setIsSubmitting(false)
  }

  // 중복되지 않는 작업명 생성
  const generateWorkOrderName = (baseName: string, existingNames: string[]): string => {
    if (!existingNames.includes(baseName)) {
      return baseName
    }
    let counter = 2
    while (existingNames.includes(`${baseName} (${counter})`)) {
      counter++
    }
    return `${baseName} (${counter})`
  }

  // 주문명 가져오기 (주문 생성 모드 또는 주문 없이 모드)
  const getOrderName = (): string => {
    if (orderMode === 'create') {
      return newOrderData.orderName || ''
    }
    return ''
  }

  // 작업 추가
  const handleAddWorkOrder = () => {
    // 기존 작업들 모두 접기
    setWorkOrders(prev => [
      ...prev.map(wo => ({ ...wo, isExpanded: false })),
      createEmptyWorkOrder(),
    ])
  }

  // 자동 작업명 생성 (상품 선택 시)
  const generateAutoWorkOrderName = (productId: number, workOrderId: string): string => {
    const product = products.find(p => p.id === productId)
    if (!product) return ''

    const orderName = getOrderName()
    const baseName = orderName ? `${orderName} ${product.name}` : product.name

    // 현재 작업을 제외한 다른 작업들의 이름 목록
    const existingNames = workOrders
      .filter(wo => wo.id !== workOrderId)
      .map(wo => wo.orderName)

    return generateWorkOrderName(baseName, existingNames)
  }

  // 작업 삭제
  const handleRemoveWorkOrder = (id: string) => {
    setWorkOrders(prev => prev.filter(wo => wo.id !== id))
  }

  // 작업 토글 (접기/펼치기)
  const handleToggleWorkOrder = (id: string) => {
    setWorkOrders(prev =>
      prev.map(wo => wo.id === id ? { ...wo, isExpanded: !wo.isExpanded } : wo)
    )
  }

  // 작업 데이터 업데이트
  const handleUpdateWorkOrder = (id: string, updates: Partial<WorkOrderFormData>) => {
    setWorkOrders(prev =>
      prev.map(wo => wo.id === id ? { ...wo, ...updates } : wo)
    )
  }

  // 상품 변경 핸들러
  const handleProductChange = (workOrderId: string, productId: number) => {
    const selectedProduct = products.find((p) => p.id === productId)
    const defaultProcessIds = selectedProduct?.processes?.map((p) => p.id) || []

    // 현재 작업 찾기
    const currentWorkOrder = workOrders.find(wo => wo.id === workOrderId)

    // 이름이 커스터마이즈되지 않았으면 자동 생성
    const updates: Partial<WorkOrderFormData> = {
      productId,
      options: [],
      processIds: defaultProcessIds,
    }

    if (!currentWorkOrder?.isNameCustomized) {
      updates.orderName = generateAutoWorkOrderName(productId, workOrderId)
    }

    handleUpdateWorkOrder(workOrderId, updates)
  }

  // 작업명 직접 수정 핸들러
  const handleOrderNameChange = (workOrderId: string, orderName: string) => {
    handleUpdateWorkOrder(workOrderId, {
      orderName,
      isNameCustomized: true, // 사용자가 직접 수정함
    })
  }

  // 공정 토글 핸들러
  const handleProcessToggle = (workOrderId: string, processId: number, currentProcessIds: number[], isSystem: boolean) => {
    if (isSystem) return

    const isSelected = currentProcessIds.includes(processId)
    const newProcessIds = isSelected
      ? currentProcessIds.filter((id) => id !== processId)
      : [...currentProcessIds, processId]

    handleUpdateWorkOrder(workOrderId, { processIds: newProcessIds })
  }

  // 파일 추가
  const handleFileSelect = (workOrderId: string, file: File) => {
    setWorkOrders(prev =>
      prev.map(wo => wo.id === workOrderId
        ? { ...wo, pendingFiles: [...wo.pendingFiles, file] }
        : wo
      )
    )
  }

  // 파일 제거
  const handleRemoveFile = (workOrderId: string, fileIndex: number) => {
    setWorkOrders(prev =>
      prev.map(wo => wo.id === workOrderId
        ? { ...wo, pendingFiles: wo.pendingFiles.filter((_, i) => i !== fileIndex) }
        : wo
      )
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 1단계 → 2단계로 이동
  const handleNextStep = async () => {
    if (orderMode === 'create') {
      if (!newOrderData.orderName.trim()) return
      try {
        const newOrder = await createOrderMutation.mutateAsync(newOrderData)
        setSelectedOrderId(newOrder.id)
        // 첫 번째 작업에 주문 정보 적용
        setWorkOrders(prev => prev.map((wo, idx) => idx === 0
          ? { ...wo, dueDate: newOrder.dueDate || wo.dueDate }
          : wo
        ))
        await refetchOrders()
        setStep(2)
      } catch (error) {
        console.error('주문 생성 실패:', error)
      }
    } else {
      setStep(2)
    }
  }

  // 2단계 → 1단계로 이동
  const handlePrevStep = () => {
    setStep(1)
  }

  // 전체 제출
  const handleSubmit = async () => {
    // 유효성 검사
    for (const wo of workOrders) {
      if (!wo.productId || !wo.orderName.trim()) {
        toast.error('모든 작업의 상품과 작업명을 입력해주세요.')
        return
      }
      const product = products.find(p => p.id === wo.productId)
      if (product && (!product.processes || product.processes.length === 0)) {
        toast.error(`"${product.name}" 상품에 공정이 설정되어 있지 않습니다.`)
        return
      }
    }

    setIsSubmitting(true)

    try {
      // 모든 작업 생성
      for (const wo of workOrders) {
        const requestData: WorkOrderCreateRequest = {
          orderName: wo.orderName,
          productId: wo.productId,
          customerId: newOrderData.customerId,
          orderId: selectedOrderId,
          quantity: wo.quantity,
          dueDate: wo.dueDate,
          memo: wo.memo,
          options: wo.options.length > 0 ? wo.options : undefined,
          processIds: wo.processIds.length > 0 ? wo.processIds : undefined,
        }

        const workOrder = await createWorkOrderMutation.mutateAsync(requestData)

        // 파일 업로드
        if (wo.pendingFiles.length > 0) {
          await Promise.all(
            wo.pendingFiles.map((file) => attachmentService.upload(workOrder.id, file))
          )
        }
      }

      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success(`${workOrders.length}개의 작업이 생성되었습니다.`)
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error('작업 생성 중 오류가 발생했습니다.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 1단계 다음 버튼 활성화 조건
  const canProceedToStep2 = useMemo(() => {
    if (orderMode === 'create') {
      return newOrderData.orderName.trim().length > 0
    }
    return true
  }, [orderMode, newOrderData.orderName])

  // 선택된 주문 정보
  const selectedOrder = useMemo(
    () => activeOrders.find(o => o.id === selectedOrderId),
    [activeOrders, selectedOrderId]
  )

  // 생성 버튼 활성화 조건
  const canSubmit = useMemo(() => {
    return workOrders.length > 0 && workOrders.every(wo => wo.productId > 0 && wo.orderName.trim().length > 0)
  }, [workOrders])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 작업 생성</DialogTitle>
          {/* 스텝 인디케이터 */}
          <div className="flex items-center gap-2 pt-2">
            <div className={cn(
              "flex items-center gap-1.5 text-xs",
              step === 1 ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium",
                step === 1 ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                1
              </div>
              <span>주문</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-1.5 text-xs",
              step === 2 ? "text-primary font-medium" : "text-muted-foreground"
            )}>
              <div className={cn(
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium",
                step === 2 ? "bg-primary text-primary-foreground" : "bg-muted"
              )}>
                2
              </div>
              <span>작업 상세</span>
            </div>
          </div>
        </DialogHeader>

        {/* 1단계: 주문 생성 */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => setOrderMode('create')}
                className={cn(
                  "flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors",
                  orderMode === 'create'
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                새 주문 생성
              </button>
              <button
                type="button"
                onClick={() => setOrderMode('skip')}
                className={cn(
                  "flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors",
                  orderMode === 'skip'
                    ? "bg-white text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                주문 없이
              </button>
            </div>

            {orderMode === 'create' && (
              <div className="space-y-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>새 주문 정보 입력</span>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="newOrderName" className="text-xs">주문명 *</Label>
                  <Input
                    id="newOrderName"
                    className="h-9"
                    value={newOrderData.orderName}
                    onChange={(e) => setNewOrderData({ ...newOrderData, orderName: e.target.value })}
                    placeholder="주문명을 입력하세요"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">고객</Label>
                    <CustomerCombobox
                      value={newOrderData.customerId}
                      onChange={(customerId) => setNewOrderData({ ...newOrderData, customerId })}
                      placeholder="고객 선택"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="newOrderDueDate" className="text-xs">출고 예정일</Label>
                    <Input
                      id="newOrderDueDate"
                      type="date"
                      className="h-9"
                      value={newOrderData.dueDate ? format(new Date(newOrderData.dueDate), 'yyyy-MM-dd') : ''}
                      onChange={(e) =>
                        setNewOrderData({
                          ...newOrderData,
                          dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        })
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {orderMode === 'skip' && (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <p>주문 없이 단독 작업으로 생성합니다.</p>
                <p className="text-xs mt-1">나중에 주문에 연결할 수 있습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 2단계: 작업 상세 */}
        {step === 2 && (
          <div className="space-y-3 py-2">
            {/* 선택된 주문 정보 표시 */}
            {selectedOrderId && selectedOrder && (
              <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 text-xs">
                <Badge variant="outline" className="text-[10px]">주문</Badge>
                <span className="font-medium">{selectedOrder.orderName}</span>
                <span className="text-muted-foreground">{selectedOrder.orderNumber}</span>
              </div>
            )}

            {/* 작업 목록 */}
            {workOrders.length > 0 ? (
              <div className="space-y-0">
                {workOrders.map((workOrder, index) => (
                  <WorkOrderItem
                    key={workOrder.id}
                    workOrder={workOrder}
                    index={index}
                    products={products}
                    isLast={index === workOrders.length - 1}
                    canDelete={true}
                    onToggle={() => handleToggleWorkOrder(workOrder.id)}
                    onRemove={() => handleRemoveWorkOrder(workOrder.id)}
                    onUpdate={(updates) => handleUpdateWorkOrder(workOrder.id, updates)}
                    onProductChange={(productId) => handleProductChange(workOrder.id, productId)}
                    onOrderNameChange={(name) => handleOrderNameChange(workOrder.id, name)}
                    onProcessToggle={(processId, currentIds, isSystem) =>
                      handleProcessToggle(workOrder.id, processId, currentIds, isSystem)
                    }
                    onFileSelect={(file) => handleFileSelect(workOrder.id, file)}
                    onFileRemove={(fileIndex) => handleRemoveFile(workOrder.id, fileIndex)}
                    formatFileSize={formatFileSize}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <p>추가된 작업이 없습니다.</p>
                <p className="text-xs mt-1">아래 버튼을 눌러 작업을 추가하세요.</p>
              </div>
            )}

            {/* 작업 추가 버튼 */}
            <button
              type="button"
              onClick={handleAddWorkOrder}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" />
              작업 추가
            </button>
          </div>
        )}

        <DialogFooter>
          {step === 1 ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                  resetForm()
                }}
              >
                취소
              </Button>
              <Button
                type="button"
                onClick={handleNextStep}
                disabled={!canProceedToStep2 || createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? '주문 생성 중...' : (
                  <>
                    다음
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                disabled={isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                이전
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? '생성 중...' : `생성 (${workOrders.length})`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// 개별 작업 아이템 컴포넌트
interface WorkOrderItemProps {
  workOrder: WorkOrderFormData
  index: number
  products: Product[]
  isLast: boolean
  canDelete: boolean
  onToggle: () => void
  onRemove: () => void
  onUpdate: (updates: Partial<WorkOrderFormData>) => void
  onProductChange: (productId: number) => void
  onOrderNameChange: (name: string) => void
  onProcessToggle: (processId: number, currentIds: number[], isSystem: boolean) => void
  onFileSelect: (file: File) => void
  onFileRemove: (fileIndex: number) => void
  formatFileSize: (bytes: number) => string
}

function WorkOrderItem({
  workOrder,
  index,
  products,
  isLast,
  canDelete,
  onToggle,
  onRemove,
  onUpdate,
  onProductChange,
  onOrderNameChange,
  onProcessToggle,
  onFileSelect,
  onFileRemove,
  formatFileSize,
}: WorkOrderItemProps) {
  const selectedProduct = products.find(p => p.id === workOrder.productId)

  // 해당 상품의 옵션 조회
  const { data: productOptions = [], isLoading: isLoadingOptions } = useQuery({
    queryKey: ['product-options', workOrder.productId],
    queryFn: () => optionService.getProductOptions(workOrder.productId),
    enabled: workOrder.productId > 0,
  })

  return (
    <div className={cn("py-3", !isLast && "border-b border-gray-200")}>
      {/* 헤더 (클릭으로 토글) */}
      <div
        className="flex items-center justify-between cursor-pointer group"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm font-medium truncate">
            작업 {index + 1}
            {workOrder.orderName && (
              <span className="ml-2 font-normal text-muted-foreground">
                - {workOrder.orderName}
              </span>
            )}
          </span>
          {selectedProduct && (
            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
              {selectedProduct.name}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <button type="button" className="p-0.5 hover:bg-muted rounded transition-colors">
            {workOrder.isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* 내용 (펼쳐진 경우) */}
      {workOrder.isExpanded && (
        <div className="mt-3 space-y-3">
          {/* 상품 & 작업명 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">상품 *</Label>
              <Select
                value={workOrder.productId ? String(workOrder.productId) : ''}
                onValueChange={(v) => onProductChange(Number(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="상품 선택" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">작업명 *</Label>
              <Input
                className="h-9"
                value={workOrder.orderName}
                onChange={(e) => onOrderNameChange(e.target.value)}
                placeholder="작업명"
              />
            </div>
          </div>

          {/* 공정 선택 */}
          {selectedProduct?.processes && selectedProduct.processes.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-xs">공정</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedProduct.processes.map((process) => {
                  const isSelected = workOrder.processIds.includes(process.id)
                  const isSystem = process.isSystem
                  return (
                    <button
                      key={process.id}
                      type="button"
                      onClick={() => onProcessToggle(process.id, workOrder.processIds, isSystem ?? false)}
                      disabled={isSystem}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-all",
                        isSystem
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                          : isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-primary/50'
                      )}
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: process.color }} />
                      <span>{process.name}</span>
                      {isSelected && !isSystem && <Check className="h-2.5 w-2.5" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* 수량 & 출고일 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">수량 *</Label>
              <Input
                type="number"
                min={1}
                className="h-9"
                value={workOrder.quantity}
                onChange={(e) => onUpdate({ quantity: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">출고 예정일</Label>
              <Input
                type="date"
                className="h-9"
                value={workOrder.dueDate ? format(new Date(workOrder.dueDate), 'yyyy-MM-dd') : ''}
                onChange={(e) =>
                  onUpdate({
                    dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                  })
                }
              />
            </div>
          </div>

          {/* 옵션 선택 */}
          {workOrder.productId > 0 && productOptions.length > 0 && (
            <div className="pt-2 border-t">
              {isLoadingOptions ? (
                <div className="text-xs text-muted-foreground">옵션 로딩 중...</div>
              ) : (
                <OptionSelector
                  productOptions={productOptions}
                  selectedOptions={workOrder.options}
                  onOptionsChange={(options) => onUpdate({ options })}
                />
              )}
            </div>
          )}

          {/* 첨부파일 */}
          <div className="pt-2 border-t space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
                <Label className="text-xs">첨부파일</Label>
                {workOrder.pendingFiles.length > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                    {workOrder.pendingFiles.length}
                  </Badge>
                )}
              </div>
              <FileUploader onUpload={async (file) => onFileSelect(file)} compact />
            </div>
            {workOrder.pendingFiles.length > 0 && (
              <div className="space-y-1">
                {workOrder.pendingFiles.map((file, fileIndex) => (
                  <div
                    key={fileIndex}
                    className="flex items-center justify-between rounded border px-2 py-1.5 bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => onFileRemove(fileIndex)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
