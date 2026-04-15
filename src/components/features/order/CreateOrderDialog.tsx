import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
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
import { Textarea } from '@/components/ui/textarea'
import { CustomerCombobox } from '@/components/features/customer/CustomerCombobox'
import type { OrderCreateRequest } from '@/types'
import { toast } from 'sonner'

interface CreateOrderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateOrderDialog({ open, onOpenChange }: CreateOrderDialogProps) {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState<OrderCreateRequest>({
    orderName: '',
    customerId: undefined,
    orderDate: undefined,
    dueDate: undefined,
    memo: '',
  })

  const createMutation = useMutation({
    mutationFn: orderService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      toast.success('주문이 생성되었습니다.')
      onOpenChange(false)
      resetForm()
    },
    onError: () => {
      toast.error('주문 생성에 실패했습니다.')
    },
  })

  const resetForm = () => {
    setFormData({
      orderName: '',
      customerId: undefined,
      orderDate: undefined,
      dueDate: undefined,
      memo: '',
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>새 주문 등록</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="orderName">주문명 *</Label>
            <Input
              id="orderName"
              value={formData.orderName}
              onChange={(e) =>
                setFormData({ ...formData, orderName: e.target.value })
              }
              placeholder="주문명을 입력해주세요"
              required
            />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="orderDate">주문일</Label>
              <Input
                id="orderDate"
                type="date"
                value={
                  formData.orderDate
                    ? format(new Date(formData.orderDate), 'yyyy-MM-dd')
                    : ''
                }
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    orderDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : undefined,
                  })
                }
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">메모</Label>
            <Textarea
              id="memo"
              value={formData.memo}
              onChange={(e) =>
                setFormData({ ...formData, memo: e.target.value })
              }
              placeholder="주문에 대한 메모를 입력하세요"
              rows={3}
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
              disabled={createMutation.isPending || !formData.orderName}
            >
              {createMutation.isPending ? '생성 중...' : '주문 등록'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
