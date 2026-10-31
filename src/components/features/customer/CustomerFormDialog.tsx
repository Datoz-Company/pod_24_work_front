import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ClientCompanyCombobox } from '@/components/features/client/ClientCompanyCombobox'
import { customerService } from '@/services/customerService'
import type { Customer, CustomerCreateRequest } from '@/types'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 수정할 고객 (없으면 새 고객 추가) */
  customer?: Customer | null
  onSaved?: (customer: Customer) => void
}

const EMPTY_FORM: CustomerCreateRequest = { name: '', phone: '', email: '', memo: '' }

/**
 * 고객 추가 / 수정 다이얼로그 — 고객 목록과 고객 상세에서 공용
 * 배송지는 고객 상세의 "배송지 목록"에서 여러 개 관리
 */
export function CustomerFormDialog({ open, onOpenChange, customer, onSaved }: CustomerFormDialogProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CustomerCreateRequest>(EMPTY_FORM)

  useEffect(() => {
    if (!open) return
    setForm(
      customer
        ? {
            name: customer.name,
            phone: customer.phone ?? '',
            email: customer.email ?? '',
            memo: customer.memo ?? '',
            clientCompanyId: customer.clientCompanyId,
          }
        : EMPTY_FORM
    )
  }, [open, customer])

  const saveMutation = useMutation({
    mutationFn: (data: CustomerCreateRequest) =>
      customer ? customerService.update(customer.id, data) : customerService.create(data),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', saved.id] })
      queryClient.invalidateQueries({ queryKey: ['client-companies'] })
      toast.success(customer ? '고객 정보를 수정했습니다.' : '고객을 추가했습니다.')
      onOpenChange(false)
      onSaved?.(saved)
    },
    onError: () => toast.error('고객 저장에 실패했습니다.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    saveMutation.mutate(form)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{customer ? '고객 수정' : '새 고객 추가'}</DialogTitle>
          <DialogDescription>배송지는 저장 후 고객 상세의 "배송지 목록"에서 추가할 수 있습니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customer-name">고객명 *</Label>
            <Input
              id="customer-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>소속 회사</Label>
            <ClientCompanyCombobox
              value={form.clientCompanyId}
              onChange={(clientCompanyId) => setForm({ ...form, clientCompanyId })}
              placeholder="비워두면 고객명으로 회사가 생성됩니다"
              companiesOnly
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customer-phone">전화번호</Label>
              <Input
                id="customer-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-email">이메일</Label>
              <Input
                id="customer-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customer-memo">메모</Label>
            <Textarea
              id="customer-memo"
              rows={3}
              value={form.memo}
              onChange={(e) => setForm({ ...form, memo: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '저장 중...' : customer ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
