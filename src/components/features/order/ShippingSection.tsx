import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { BookmarkPlus, History, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { customerService } from '@/services/customerService'
import { cn } from '@/lib/utils'
import { SHIPPING_METHOD_LABELS, type Customer, type ShippingInfo, type ShippingMethod } from '@/types'
import { ShippingAddressFields, formatShippingAddress } from './ShippingAddressFields'

interface ShippingSectionProps {
  shippingMethod?: ShippingMethod
  onShippingMethodChange: (method: ShippingMethod) => void
  shippingInfo: ShippingInfo
  onShippingInfoChange: (info: ShippingInfo) => void
  customer?: Customer
  /** 주문자 선택 시 비어 있는 배송지를 고객의 기본 배송지로 채움 (신규 등록에서만) */
  autoFillDefault?: boolean
}

const METHODS = Object.keys(SHIPPING_METHOD_LABELS) as ShippingMethod[]

const sameAddress = (a: ShippingInfo, b: ShippingInfo) =>
  (a.address ?? '') === (b.address ?? '') &&
  (a.addressDetail ?? '').trim() === (b.addressDetail ?? '').trim() &&
  (a.recipientName ?? '').trim() === (b.recipientName ?? '').trim()

/**
 * 출고 방식 + 배송지 + 수취인 입력
 * - 출고 방식을 먼저 선택 (방문이어도 배송지 입력란은 유지)
 * - 해외배송은 주소 검색 대신 우편번호/주소 직접 입력
 * - 배송지 불러오기: 고객 주소록 → 이전 주문 배송지 순
 */
export function ShippingSection({
  shippingMethod,
  onShippingMethodChange,
  shippingInfo,
  onShippingInfoChange,
  customer,
  autoFillDefault = false,
}: ShippingSectionProps) {
  const queryClient = useQueryClient()
  const [sameAsOrderer, setSameAsOrderer] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const { data: addressBook = [] } = useQuery({
    queryKey: ['customer-addresses', customer?.id],
    queryFn: () => customerService.getAddresses(customer!.id),
    enabled: !!customer?.id,
  })

  const { data: recentAddresses = [] } = useQuery({
    queryKey: ['customer-shipping-addresses', customer?.id],
    queryFn: () => customerService.getShippingAddresses(customer!.id),
    enabled: !!customer?.id,
  })

  // 주소록에 이미 있는 이전 배송지는 중복 표시하지 않음
  const historyOnly = recentAddresses.filter(
    (recent) => !addressBook.some((saved) => sameAddress(saved.shippingInfo, recent))
  )
  const isSavedInBook = addressBook.some((saved) => sameAddress(saved.shippingInfo, shippingInfo))

  // 주문자를 고르면 기본 배송지 자동 입력 (이미 입력한 주소는 덮어쓰지 않음)
  useEffect(() => {
    if (!autoFillDefault || shippingInfo.address) return
    const defaultAddress = addressBook.find((a) => a.isDefault)
    if (defaultAddress) {
      onShippingInfoChange({ ...defaultAddress.shippingInfo, deliveryMessage: shippingInfo.deliveryMessage })
    }
    // 고객이 바뀌어 주소록이 새로 로드될 때만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addressBook])

  const saveToBookMutation = useMutation({
    mutationFn: () =>
      customerService.createAddress(customer!.id, {
        shippingInfo: { ...shippingInfo, deliveryMessage: undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-addresses', customer?.id] })
      toast.success(`${customer?.name} 고객의 배송지 목록에 저장했습니다.`)
    },
    onError: () => toast.error('배송지 저장에 실패했습니다.'),
  })

  const handleSameAsOrderer = (checked: boolean) => {
    setSameAsOrderer(checked)
    if (checked && customer) {
      onShippingInfoChange({
        ...shippingInfo,
        recipientName: customer.name,
        recipientPhone: customer.phone ?? shippingInfo.recipientPhone,
      })
    }
  }

  const applyAddress = (info: ShippingInfo) => {
    onShippingInfoChange({ ...info, deliveryMessage: shippingInfo.deliveryMessage })
    setIsHistoryOpen(false)
  }

  const hasNoSaved = addressBook.length === 0 && historyOnly.length === 0

  return (
    <div className="space-y-5">
      {/* 출고 방식 */}
      <div className="space-y-2">
        <Label>출고 방식</Label>
        <div className="flex flex-wrap gap-2">
          {METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => onShippingMethodChange(method)}
              className={cn(
                'rounded-md border px-4 py-1.5 text-sm transition-colors',
                shippingMethod === method
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
              aria-pressed={shippingMethod === method}
            >
              {SHIPPING_METHOD_LABELS[method]}
            </button>
          ))}
        </div>
        {shippingMethod === 'VISIT' && (
          <p className="text-xs text-muted-foreground">방문 수령이어도 배송지를 남겨두면 택배로 바뀔 때 다시 확인하지 않아도 됩니다.</p>
        )}
      </div>

      {/* 저장된 배송지 */}
      <div className="flex items-center justify-between gap-2">
        <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm" disabled={!customer}>
              <History className="mr-1 h-3.5 w-3.5" />
              배송지 불러오기
              {addressBook.length > 0 && <span className="ml-1 text-muted-foreground">({addressBook.length})</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 p-2">
            {hasNoSaved ? (
              <p className="p-2 text-sm text-muted-foreground">
                저장된 배송지가 없습니다. 입력 후 "배송지 목록에 저장"을 누르면 다음 주문부터 불러올 수 있습니다.
              </p>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {addressBook.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">고객 배송지 목록</p>
                    {addressBook.map((saved) => (
                      <button
                        key={saved.id}
                        type="button"
                        className="w-full rounded p-2 text-left text-sm hover:bg-muted"
                        onClick={() => applyAddress(saved.shippingInfo)}
                      >
                        <span className="flex items-center gap-1 font-medium">
                          {saved.isDefault && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                          {saved.label || saved.shippingInfo.recipientName || '수취인 미입력'}
                        </span>
                        <span className="block text-xs text-muted-foreground">{formatShippingAddress(saved.shippingInfo)}</span>
                      </button>
                    ))}
                  </div>
                )}
                {historyOnly.length > 0 && (
                  <div>
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">이전 주문 배송지</p>
                    {historyOnly.map((recent, index) => (
                      <button
                        key={index}
                        type="button"
                        className="w-full rounded p-2 text-left text-sm hover:bg-muted"
                        onClick={() => applyAddress(recent)}
                      >
                        <span className="font-medium">{recent.recipientName ?? '수취인 미입력'}</span>
                        <span className="block text-xs text-muted-foreground">{formatShippingAddress(recent)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>
        {!customer && <span className="text-xs text-muted-foreground">주문자를 먼저 선택하세요</span>}
      </div>

      <ShippingAddressFields
        value={shippingInfo}
        onChange={onShippingInfoChange}
        isOverseas={shippingMethod === 'OVERSEAS'}
        recipientExtra={
          <div className="flex items-center gap-2">
            <Checkbox
              id="same-as-orderer"
              checked={sameAsOrderer}
              onCheckedChange={(checked) => handleSameAsOrderer(checked === true)}
              disabled={!customer}
            />
            <label htmlFor="same-as-orderer" className="text-sm text-gray-700">
              주문자 정보와 동일하게 입력
            </label>
          </div>
        }
      />

      {/* 반복 배송지는 고객 정보에 연결해 관리 */}
      {customer && shippingInfo.address && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full"
          disabled={isSavedInBook || saveToBookMutation.isPending}
          onClick={() => saveToBookMutation.mutate()}
        >
          <BookmarkPlus className="mr-1 h-4 w-4" />
          {isSavedInBook ? '고객 배송지 목록에 저장됨' : `${customer.name} 고객의 배송지 목록에 저장`}
        </Button>
      )}
    </div>
  )
}
