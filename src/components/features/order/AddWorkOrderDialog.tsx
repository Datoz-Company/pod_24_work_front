import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { productService } from '@/services/productService'
import { workOrderService } from '@/services/workOrderService'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorkOrderCreateRequest } from '@/types'
import { toast } from 'sonner'

interface AddWorkOrderDialogProps {
  orderId: number
  orderCustomerId?: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddWorkOrderDialog({
  orderId,
  orderCustomerId,
  open,
  onOpenChange,
}: AddWorkOrderDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<Partial<WorkOrderCreateRequest>>({
    orderName: '',
    productId: 0,
    quantity: 1,
    dueDate: undefined,
    orderId: orderId,
    customerId: orderCustomerId,
  })
  const [showNoProcessWarning, setShowNoProcessWarning] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
  })

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      orderId: orderId,
      customerId: orderCustomerId,
    }))
  }, [orderId, orderCustomerId])

  const createMutation = useMutation({
    mutationFn: (data: WorkOrderCreateRequest) => workOrderService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['order', orderId] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      toast.success('작업이 추가되었습니다.')
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      if (error.message.includes('공정')) {
        setShowNoProcessWarning(true)
      } else {
        toast.error('작업 추가에 실패했습니다.')
      }
    },
  })

  const resetForm = () => {
    setFormData({
      orderName: '',
      productId: 0,
      quantity: 1,
      dueDate: undefined,
      orderId: orderId,
      customerId: orderCustomerId,
    })
    setShowNoProcessWarning(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const selectedProduct = products.find((p) => p.id === formData.productId)
    if (
      selectedProduct &&
      (!selectedProduct.processes || selectedProduct.processes.length === 0)
    ) {
      setShowNoProcessWarning(true)
      return
    }

    const requestData: WorkOrderCreateRequest = {
      orderName: formData.orderName!,
      productId: formData.productId!,
      customerId: formData.customerId,
      orderId: formData.orderId,
      quantity: formData.quantity!,
      dueDate: formData.dueDate,
      memo: '',
    }

    createMutation.mutate(requestData)
  }

  const handleProductChange = (value: string) => {
    const productId = Number(value)
    setFormData({ ...formData, productId })

    const selectedProduct = products.find((p) => p.id === productId)
    if (
      selectedProduct &&
      (!selectedProduct.processes || selectedProduct.processes.length === 0)
    ) {
      setShowNoProcessWarning(true)
    } else {
      setShowNoProcessWarning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>작업 추가</DialogTitle>
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
                      <span className="ml-2 text-xs text-destructive">
                        (공정 미설정)
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showNoProcessWarning && (
              <p className="text-sm text-destructive">
                선택한 상품에 공정이 설정되어 있지 않습니다.
              </p>
            )}
          </div>

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
            <Label htmlFor="dueDate">납기일</Label>
            <Input
              id="dueDate"
              type="date"
              value={
                formData.dueDate
                  ? format(new Date(formData.dueDate), 'yyyy-MM-dd')
                  : ''
              }
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dueDate: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : undefined,
                })
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
                resetForm()
              }}
              disabled={createMutation.isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.productId ||
                !formData.orderName ||
                showNoProcessWarning
              }
            >
              {createMutation.isPending ? '추가 중...' : '작업 추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
