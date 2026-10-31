import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { OrderItemCard, UNCATEGORIZED, type OrderItemFormData } from '@/components/features/order/OrderItemCard'
import { productService } from '@/services/productService'
import { workOrderService } from '@/services/workOrderService'
import { toOptionRequest } from '@/lib/optionSnapshot'
import { isNotNil } from '@/lib/utils'
import type { WorkOrder } from '@/types'
import { invalidateWorkData } from '@/lib/queryInvalidation'

interface EditWorkOrderDialogProps {
  workOrder: WorkOrder
  open: boolean
  onOpenChange: (open: boolean) => void
}

const toDateInput = (value?: string) => (value ? value.split('T')[0] : '')

function toFormItem(workOrder: WorkOrder): OrderItemFormData {
  return {
    key: String(workOrder.id),
    category: workOrder.product.category?.trim() || UNCATEGORIZED,
    productId: workOrder.product.id,
    itemName: workOrder.orderName,
    quantity: workOrder.quantity,
    processIds: workOrder.processes.filter((p) => !p.process.isSystem).map((p) => p.process.id),
    options: (workOrder.options ?? []).map(toOptionRequest).filter(isNotNil),
    isExpanded: true,
  }
}

/**
 * 작업 수정 — 주문 등록과 같은 품목 카드로 품명·수량·옵션·공정을 수정 (상품은 고정)
 * 남는 공정의 진행 상태는 유지되고, 새로 추가한 공정은 미착수로 시작
 */
export function EditWorkOrderDialog({ workOrder, open, onOpenChange }: EditWorkOrderDialogProps) {
  const queryClient = useQueryClient()
  const [item, setItem] = useState<OrderItemFormData>(() => toFormItem(workOrder))
  const [dueDate, setDueDate] = useState(toDateInput(workOrder.dueDate))

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
    enabled: open,
  })

  useEffect(() => {
    if (!open) return
    setItem(toFormItem(workOrder))
    setDueDate(toDateInput(workOrder.dueDate))
  }, [open, workOrder])

  const saveMutation = useMutation({
    mutationFn: () =>
      workOrderService.update(workOrder.id, {
        orderName: item.itemName.trim() || workOrder.product.name,
        quantity: item.quantity,
        dueDate: dueDate ? `${dueDate}T00:00:00` : undefined,
        options: item.options,
        processIds: item.processIds,
      }),
    onSuccess: () => {
      invalidateWorkData(queryClient)
      toast.success('작업을 수정했습니다.')
      onOpenChange(false)
    },
    onError: () => toast.error('작업 수정에 실패했습니다.'),
  })

  const handleSave = () => {
    if (item.processIds.length === 0) {
      toast.error('공정을 하나 이상 선택해주세요.')
      return
    }
    saveMutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>작업 수정 · {workOrder.orderNumber}</DialogTitle>
          <DialogDescription>
            공정을 빼면 해당 공정의 진행 기록이 삭제되고, 새로 넣은 공정은 미착수로 시작합니다. 메모는 상세 화면에서 바로 편집합니다.
          </DialogDescription>
        </DialogHeader>

        <OrderItemCard
          item={item}
          index={0}
          products={products}
          canDelete={false}
          lockProduct
          onChange={(patch) => setItem((prev) => ({ ...prev, ...patch, isExpanded: true }))}
          onRemove={() => undefined}
        />

        <div className="max-w-xs space-y-1.5">
          <Label htmlFor="edit-due-date">출고 예정일</Label>
          <Input id="edit-due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saveMutation.isPending}>
            취소
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
