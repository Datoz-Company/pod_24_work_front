import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { productService } from '@/services/productService'
import { customerService } from '@/services/customerService'
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

interface CreateWorkOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateWorkOrderDialog({
  open,
  onOpenChange,
}: CreateWorkOrderDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<WorkOrderCreateRequest>({
    orderName: '',
    productId: 0,
    customerId: undefined,
    quantity: 1,
    dueDate: undefined,
    memo: '',
  })
  const [showNoProcessWarning, setShowNoProcessWarning] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
  })

  const { data: customers = [] } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: customerService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: workOrderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      onOpenChange(false)
      resetForm()
    },
    onError: (error: Error) => {
      if (error.message.includes('공정')) {
        setShowNoProcessWarning(true)
      }
    },
  })

  const resetForm = () => {
    setFormData({
      orderName: '',
      productId: 0,
      customerId: undefined,
      quantity: 1,
      dueDate: undefined,
      memo: '',
    })
    setShowNoProcessWarning(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const selectedProduct = products.find((p) => p.id === formData.productId)
    if (selectedProduct && (!selectedProduct.processes || selectedProduct.processes.length === 0)) {
      setShowNoProcessWarning(true)
      return
    }

    createMutation.mutate(formData)
  }

  const handleProductChange = (value: string) => {
    const productId = Number(value)
    setFormData({ ...formData, productId })

    const selectedProduct = products.find((p) => p.id === productId)
    if (selectedProduct && (!selectedProduct.processes || selectedProduct.processes.length === 0)) {
      setShowNoProcessWarning(true)
    } else {
      setShowNoProcessWarning(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
            <Label htmlFor="customerId">고객</Label>
            <Select
              value={formData.customerId ? String(formData.customerId) : ''}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  customerId: value ? Number(value) : undefined,
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="고객을 선택하세요 (선택사항)" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((customer) => (
                  <SelectItem key={customer.id} value={String(customer.id)}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <DialogFooter>
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
              type="submit"
              disabled={
                createMutation.isPending ||
                !formData.productId ||
                !formData.orderName ||
                showNoProcessWarning
              }
            >
              {createMutation.isPending ? '생성 중...' : '생성'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
