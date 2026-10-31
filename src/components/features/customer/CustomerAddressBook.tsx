import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { ShippingAddressFields, formatShippingAddress } from '@/components/features/order/ShippingAddressFields'
import { customerService } from '@/services/customerService'
import type { CustomerAddress, CustomerAddressRequest } from '@/types'

interface CustomerAddressBookProps {
  customerId: number
}

const EMPTY_FORM: CustomerAddressRequest = { label: '', isDefault: false, shippingInfo: {} }

/**
 * 고객 배송지 목록 — 주문 등록의 "배송지 불러오기"에서 사용
 */
export function CustomerAddressBook({ customerId }: CustomerAddressBookProps) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<CustomerAddress | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [form, setForm] = useState<CustomerAddressRequest>(EMPTY_FORM)
  const [isOverseas, setIsOverseas] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CustomerAddress | null>(null)

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: () => customerService.getAddresses(customerId),
  })

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['customer-addresses', customerId] })

  const saveMutation = useMutation({
    mutationFn: (data: CustomerAddressRequest) =>
      editing
        ? customerService.updateAddress(customerId, editing.id, data)
        : customerService.createAddress(customerId, data),
    onSuccess: () => {
      invalidate()
      setIsFormOpen(false)
      toast.success(editing ? '배송지를 수정했습니다.' : '배송지를 추가했습니다.')
    },
    onError: () => toast.error('배송지 저장에 실패했습니다.'),
  })

  const setDefaultMutation = useMutation({
    mutationFn: (address: CustomerAddress) =>
      customerService.updateAddress(customerId, address.id, {
        label: address.label,
        isDefault: true,
        shippingInfo: address.shippingInfo,
      }),
    onSuccess: invalidate,
    onError: () => toast.error('기본 배송지 변경에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (addressId: number) => customerService.deleteAddress(customerId, addressId),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success('배송지를 삭제했습니다.')
    },
    onError: () => toast.error('배송지 삭제에 실패했습니다.'),
  })

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setIsOverseas(false)
    setIsFormOpen(true)
  }

  const openEdit = (address: CustomerAddress) => {
    setEditing(address)
    setForm({ label: address.label ?? '', isDefault: address.isDefault, shippingInfo: address.shippingInfo })
    // 국내 주소는 주소 검색으로만 입력되므로 상세주소가 없고 우편번호가 5자리 숫자가 아니면 해외로 간주
    setIsOverseas(!!address.shippingInfo.zipCode && !/^\d{5}$/.test(address.shippingInfo.zipCode))
    setIsFormOpen(true)
  }

  const handleSubmit = () => {
    if (!form.shippingInfo.address?.trim()) {
      toast.error('배송지 주소를 입력해주세요.')
      return
    }
    saveMutation.mutate({ ...form, label: form.label?.trim() || undefined })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          배송지 목록
          {addresses.length > 0 && <Badge variant="secondary">{addresses.length}</Badge>}
        </h3>
        <Button size="sm" variant="outline" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          배송지 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : addresses.length === 0 ? (
        <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
          등록된 배송지가 없습니다. 자주 쓰는 배송지를 추가하면 주문 등록 시 불러올 수 있습니다.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {addresses.map((address) => (
            <li key={address.id} className="flex items-start gap-3 p-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center gap-2 text-sm font-medium">
                  {address.label || address.shippingInfo.recipientName || '수취인 미입력'}
                  {address.isDefault && <Badge className="h-5 text-[10px]">기본</Badge>}
                </div>
                <p className="text-sm">{formatShippingAddress(address.shippingInfo)}</p>
                <p className="text-xs text-muted-foreground">
                  {[address.shippingInfo.recipientName, address.shippingInfo.recipientPhone].filter(Boolean).join(' · ') || '-'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!address.isDefault && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => setDefaultMutation.mutate(address)}
                    disabled={setDefaultMutation.isPending}
                  >
                    <Star className="mr-1 h-3.5 w-3.5" />
                    기본으로
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(address)} aria-label="배송지 수정">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteTarget(address)}
                  aria-label="배송지 삭제"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 추가 / 수정 */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? '배송지 수정' : '배송지 추가'}</DialogTitle>
            <DialogDescription>주문 등록 화면의 "배송지 불러오기"에서 바로 사용할 수 있습니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <Label htmlFor="address-label">별칭 (선택)</Label>
              <Input
                id="address-label"
                placeholder="예: 본사, 2호점"
                value={form.label ?? ''}
                onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="address-overseas" checked={isOverseas} onCheckedChange={(checked) => setIsOverseas(checked === true)} />
              <label htmlFor="address-overseas" className="text-sm">해외 주소 (직접 입력)</label>
            </div>
            <ShippingAddressFields
              value={form.shippingInfo}
              onChange={(shippingInfo) => setForm((prev) => ({ ...prev, shippingInfo }))}
              isOverseas={isOverseas}
              showDeliveryMessage={false}
            />
            <div className="flex items-center gap-2">
              <Checkbox
                id="address-default"
                checked={!!form.isDefault}
                onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isDefault: checked === true }))}
                disabled={editing?.isDefault}
              />
              <label htmlFor="address-default" className="text-sm">기본 배송지로 설정 (주문 등록 시 자동 입력)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>취소</Button>
            <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>배송지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && formatShippingAddress(deleteTarget.shippingInfo)} 배송지를 삭제하시겠습니까?
              이미 등록된 주문의 배송지는 바뀌지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
