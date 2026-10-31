import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { productService } from '@/services/productService'
import { workOrderService } from '@/services/workOrderService'
import {
  OrderItemCard,
  createEmptyOrderItem,
  getOrderItemLabel,
  validateOrderItems,
  type OrderItemFormData,
} from './OrderItemCard'
import { invalidateWorkData } from '@/lib/queryInvalidation'

interface AddWorkOrderDialogProps {
  orderId: number
  orderCustomerId?: number
  /** 주문의 출고 예정일 — 추가하는 작업에 그대로 적용 */
  orderDueDate?: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * 기존 주문에 품목(작업) 추가
 * 주문 등록 화면과 같은 품목 카드(상품 종류 → 상품, 품명, 옵션, 공정, 수량)를 사용
 */
export function AddWorkOrderDialog({
  orderId,
  orderCustomerId,
  orderDueDate,
  open,
  onOpenChange,
}: AddWorkOrderDialogProps) {
  const queryClient = useQueryClient()
  const [items, setItems] = useState<OrderItemFormData[]>([createEmptyOrderItem()])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
  })

  useEffect(() => {
    if (open) setItems([createEmptyOrderItem()])
  }, [open])

  const updateItem = (key: string, patch: Partial<OrderItemFormData>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const addItem = () => {
    setItems((prev) => [...prev.map((item) => ({ ...item, isExpanded: false })), createEmptyOrderItem()])
  }

  const handleSubmit = async () => {
    const error = validateOrderItems(items, products)
    if (error) {
      toast.error(error)
      return
    }
    setIsSubmitting(true)
    try {
      for (const item of items) {
        await workOrderService.create({
          orderName: getOrderItemLabel(item, products),
          productId: item.productId,
          customerId: orderCustomerId,
          orderId,
          quantity: item.quantity,
          dueDate: orderDueDate,
          options: item.options.length > 0 ? item.options : undefined,
          processIds: item.processIds.length > 0 ? item.processIds : undefined,
        })
      }
      invalidateWorkData(queryClient)
      toast.success(`품목 ${items.length}건을 추가했습니다.`)
      onOpenChange(false)
    } catch (e) {
      console.error(e)
      toast.error('작업 추가에 실패했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>품목 추가</DialogTitle>
          <DialogDescription>추가한 품목은 각각 작업으로 생성되어 작업 현황에 표시됩니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {items.map((item, index) => (
            <OrderItemCard
              key={item.key}
              item={item}
              index={index}
              products={products}
              canDelete={items.length > 1}
              onChange={(patch) => updateItem(item.key, patch)}
              onRemove={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
            />
          ))}
          <Button type="button" variant="outline" size="sm" className="w-full" onClick={addItem}>
            <Plus className="mr-1 h-4 w-4" />
            품목 추가
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {items.length}건 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
