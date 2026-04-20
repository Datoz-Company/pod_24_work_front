import { useState, useEffect, useCallback, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { X, Paperclip, Check } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
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
import type { WorkOrderCreateRequest } from '@/types'
import type { WorkOrderOptionRequest } from '@/types/option'

interface CreateWorkOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormData extends Omit<WorkOrderCreateRequest, 'options' | 'processIds'> {
  options: WorkOrderOptionRequest[]
  processIds: number[]
}

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
}: CreateWorkOrderDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<FormData>({
    orderName: '',
    productId: 0,
    customerId: undefined,
    orderId: undefined,
    quantity: 1,
    dueDate: undefined,
    memo: '',
    options: [],
    processIds: [],
  })
  const [showNoProcessWarning, setShowNoProcessWarning] = useState(false)
  const [requiredOptionError, setRequiredOptionError] = useState<string | null>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
  })

  const { data: activeOrders = [] } = useQuery({
    queryKey: ['orders', 'active'],
    queryFn: orderService.getActive,
  })

  // 선택된 상품의 옵션 조회
  const { data: productOptions = [], isLoading: isLoadingOptions } = useQuery({
    queryKey: ['product-options', formData.productId],
    queryFn: () => optionService.getProductOptions(formData.productId),
    enabled: formData.productId > 0,
  })

  // 상품 변경 시 옵션 선택 초기화
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      options: [],
    }))
    setRequiredOptionError(null)
  }, [formData.productId])

  const createMutation = useMutation({
    mutationFn: (data: WorkOrderCreateRequest) => workOrderService.create(data),
  })

  const resetForm = () => {
    setFormData({
      orderName: '',
      productId: 0,
      customerId: undefined,
      orderId: undefined,
      quantity: 1,
      dueDate: undefined,
      memo: '',
      options: [],
      processIds: [],
    })
    setShowNoProcessWarning(false)
    setRequiredOptionError(null)
    setPendingFiles([])
  }

  const handleFileSelect = useCallback(async (file: File) => {
    setPendingFiles((prev) => [...prev, file])
  }, [])

  const handleRemoveFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 필수 옵션 검증
  const validateRequiredOptions = (): boolean => {
    const requiredOptions = productOptions.filter((po) => po.isRequired)

    for (const requiredOpt of requiredOptions) {
      const selectedOption = formData.options.find(
        (opt) => opt.optionId === requiredOpt.optionId
      )

      if (!selectedOption || selectedOption.selectedAttributeValueIds.length === 0) {
        setRequiredOptionError(
          `필수 옵션 "${requiredOpt.option?.name}"을(를) 선택해주세요.`
        )
        return false
      }
    }

    setRequiredOptionError(null)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (selectedProduct && (!selectedProduct.processes || selectedProduct.processes.length === 0)) {
      setShowNoProcessWarning(true)
      return
    }

    // 필수 옵션 검증
    if (!validateRequiredOptions()) {
      return
    }

    // 선택된 공정이 없으면 경고
    const nonSystemProcessIds = formData.processIds.filter((id) => {
      const process = selectedProduct?.processes?.find((p) => p.id === id)
      return process && !process.isSystem
    })
    if (nonSystemProcessIds.length === 0 && selectedProduct?.processes?.some((p) => !p.isSystem)) {
      return // 공정이 하나도 선택되지 않음
    }

    // options를 WorkOrderCreateRequest 형태로 변환
    const requestData: WorkOrderCreateRequest = {
      orderName: formData.orderName,
      productId: formData.productId,
      customerId: formData.customerId,
      orderId: formData.orderId,
      quantity: formData.quantity,
      dueDate: formData.dueDate,
      memo: formData.memo,
      options: formData.options.length > 0 ? formData.options : undefined,
      processIds: formData.processIds.length > 0 ? formData.processIds : undefined,
    }

    try {
      // 1. 작업지시서 생성
      const workOrder = await createMutation.mutateAsync(requestData)

      // 2. 파일 업로드 (있는 경우)
      if (pendingFiles.length > 0) {
        setIsUploading(true)
        try {
          await Promise.all(
            pendingFiles.map((file) => attachmentService.upload(workOrder.id, file))
          )
        } catch (uploadError) {
          console.error('파일 업로드 실패:', uploadError)
          // 작업지시서는 생성되었으므로 계속 진행
        } finally {
          setIsUploading(false)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onOpenChange(false)
      resetForm()
    } catch (error) {
      if (error instanceof Error && error.message.includes('공정')) {
        setShowNoProcessWarning(true)
      }
    }
  }

  const handleProductChange = (value: string) => {
    const productId = Number(value)
    const selectedProduct = products.find((p) => p.id === productId)

    // 상품의 공정을 기본으로 모두 선택
    const defaultProcessIds = selectedProduct?.processes?.map((p) => p.id) || []

    setFormData({ ...formData, productId, options: [], processIds: defaultProcessIds })

    if (selectedProduct && (!selectedProduct.processes || selectedProduct.processes.length === 0)) {
      setShowNoProcessWarning(true)
    } else {
      setShowNoProcessWarning(false)
    }
  }

  const handleOptionsChange = (options: WorkOrderOptionRequest[]) => {
    setFormData({ ...formData, options })
    setRequiredOptionError(null)
  }

  // 공정 선택/해제 핸들러
  const handleProcessToggle = (processId: number, isSystem: boolean) => {
    // 시스템 공정은 해제 불가
    if (isSystem) return

    setFormData((prev) => {
      const isSelected = prev.processIds.includes(processId)
      if (isSelected) {
        return { ...prev, processIds: prev.processIds.filter((id) => id !== processId) }
      } else {
        return { ...prev, processIds: [...prev.processIds, processId] }
      }
    })
  }

  // 선택된 상품의 공정 목록 (시스템 공정 제외한 것만 선택 가능)
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === formData.productId),
    [products, formData.productId]
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>새 작업 생성</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">상품 *</Label>
            <Select
              value={formData.productId ? String(formData.productId) : ''}
              onValueChange={handleProductChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="상품을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={String(product.id)}>
                    {product.name}
                    {(!product.processes || product.processes.length === 0) && (
                      <span className="ml-2 text-xs text-destructive">(공정 미설정)</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showNoProcessWarning && (
              <p className="text-sm text-destructive">
                선택한 상품에 공정이 설정되어 있지 않습니다. 먼저 상품별 작업 공정에서 공정을 설정해주세요.
              </p>
            )}
          </div>

          {/* 공정 선택 */}
          {selectedProduct && selectedProduct.processes && selectedProduct.processes.length > 0 && (
            <div className="space-y-2">
              <Label>공정 선택</Label>
              <div className="flex flex-wrap gap-2">
                {selectedProduct.processes.map((process) => {
                  const isSelected = formData.processIds.includes(process.id)
                  const isSystem = process.isSystem

                  return (
                    <button
                      key={process.id}
                      type="button"
                      onClick={() => handleProcessToggle(process.id, isSystem ?? false)}
                      disabled={isSystem}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-all
                        ${isSystem
                          ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
                          : isSelected
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-primary/50'
                        }
                      `}
                    >
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: process.color }}
                      />
                      <span>{process.name}</span>
                      {isSelected && <Check className="h-3 w-3" />}
                    </button>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                시스템 공정(작업 전, 작업 완료)은 자동으로 포함됩니다.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="orderName">작업명 *</Label>
            <Input
              id="orderName"
              value={formData.orderName}
              onChange={(e) =>
                setFormData({ ...formData, orderName: e.target.value })
              }
              placeholder="작업명을 입력하세요"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">수량 *</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              value={formData.quantity}
              onChange={(e) =>
                setFormData({ ...formData, quantity: Number(e.target.value) })
              }
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="orderId">주문</Label>
            <Select
              value={formData.orderId ? String(formData.orderId) : ''}
              onValueChange={(value) => {
                const orderId = value ? Number(value) : undefined
                const selectedOrder = activeOrders.find((o) => o.id === orderId)
                setFormData({
                  ...formData,
                  orderId,
                  customerId: selectedOrder?.customer?.id || formData.customerId,
                })
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="주문을 선택하세요 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {activeOrders.map((order) => (
                  <SelectItem key={order.id} value={String(order.id)}>
                    {order.orderName}
                    {order.customer && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({order.customer.name})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customerId">고객</Label>
            <CustomerCombobox
              value={formData.customerId}
              onChange={(customerId) =>
                setFormData({ ...formData, customerId })
              }
              placeholder="고객을 검색하세요 (선택사항)"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">출고 예정일</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate ? format(new Date(formData.dueDate), 'yyyy-MM-dd') : ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dueDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                })
              }
            />
          </div>

          {/* 옵션 선택 영역 */}
          {formData.productId > 0 && productOptions.length > 0 && (
            <>
              <Separator />
              {isLoadingOptions ? (
                <div className="text-sm text-muted-foreground">옵션 로딩 중...</div>
              ) : (
                <OptionSelector
                  productOptions={productOptions}
                  selectedOptions={formData.options}
                  onOptionsChange={handleOptionsChange}
                />
              )}
              {requiredOptionError && (
                <p className="text-sm text-destructive">{requiredOptionError}</p>
              )}
            </>
          )}

          {/* 파일 첨부 영역 */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <Label>첨부파일</Label>
              {pendingFiles.length > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {pendingFiles.length}
                </Badge>
              )}
            </div>
            <FileUploader onUpload={handleFileSelect} />
            {pendingFiles.length > 0 && (
              <div className="space-y-2">
                {pendingFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFile(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
              disabled={createMutation.isPending || isUploading}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                isUploading ||
                !formData.productId ||
                !formData.orderName ||
                showNoProcessWarning
              }
            >
              {createMutation.isPending
                ? '생성 중...'
                : isUploading
                ? '파일 업로드 중...'
                : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
