import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { History, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { customerService } from '@/services/customerService'
import { openAddressSearch } from '@/lib/daumPostcode'
import { cn } from '@/lib/utils'
import { SHIPPING_METHOD_LABELS, type Customer, type ShippingInfo, type ShippingMethod } from '@/types'

interface ShippingSectionProps {
  shippingMethod?: ShippingMethod
  onShippingMethodChange: (method: ShippingMethod) => void
  shippingInfo: ShippingInfo
  onShippingInfoChange: (info: ShippingInfo) => void
  customer?: Customer
}

const METHODS = Object.keys(SHIPPING_METHOD_LABELS) as ShippingMethod[]

const formatAddress = (info: ShippingInfo) =>
  [info.zipCode && `(${info.zipCode})`, info.address, info.addressDetail].filter(Boolean).join(' ')

/**
 * 출고 방식 + 배송지 + 수취인 입력
 * - 출고 방식을 먼저 선택 (방문이어도 배송지 입력란은 유지)
 * - 해외배송은 주소 검색 대신 우편번호/주소 직접 입력
 */
export function ShippingSection({
  shippingMethod,
  onShippingMethodChange,
  shippingInfo,
  onShippingInfoChange,
  customer,
}: ShippingSectionProps) {
  const [sameAsOrderer, setSameAsOrderer] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const isOverseas = shippingMethod === 'OVERSEAS'

  const { data: savedAddresses = [] } = useQuery({
    queryKey: ['customer-shipping-addresses', customer?.id],
    queryFn: () => customerService.getShippingAddresses(customer!.id),
    enabled: !!customer?.id,
  })

  const update = (patch: Partial<ShippingInfo>) => onShippingInfoChange({ ...shippingInfo, ...patch })

  const handleAddressSearch = async () => {
    try {
      const { zipCode, address } = await openAddressSearch()
      update({ zipCode, address })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '주소 검색에 실패했습니다.')
    }
  }

  const handleSameAsOrderer = (checked: boolean) => {
    setSameAsOrderer(checked)
    if (checked && customer) {
      update({ recipientName: customer.name, recipientPhone: customer.phone ?? shippingInfo.recipientPhone })
    }
  }

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

      {/* 배송지 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>배송지</Label>
          <Popover open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <PopoverTrigger asChild>
              <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" disabled={!customer}>
                <History className="mr-1 h-3 w-3" />
                배송지 불러오기
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              {savedAddresses.length === 0 ? (
                <p className="p-2 text-sm text-muted-foreground">이 고객의 이전 배송지가 없습니다.</p>
              ) : (
                <ul className="max-h-64 space-y-1 overflow-y-auto">
                  {savedAddresses.map((saved, index) => (
                    <li key={index}>
                      <button
                        type="button"
                        className="w-full rounded p-2 text-left text-sm hover:bg-muted"
                        onClick={() => {
                          onShippingInfoChange({ ...saved, deliveryMessage: shippingInfo.deliveryMessage })
                          setIsHistoryOpen(false)
                        }}
                      >
                        <span className="font-medium">{saved.recipientName ?? '수취인 미입력'}</span>
                        <span className="block text-xs text-muted-foreground">{formatAddress(saved)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {isOverseas ? (
          <div className="space-y-2">
            <Input
              id="shipping-zip-overseas"
              placeholder="우편번호 (Zip / Postal code)"
              value={shippingInfo.zipCode ?? ''}
              onChange={(e) => update({ zipCode: e.target.value })}
            />
            <Textarea
              id="shipping-address-overseas"
              placeholder="해외 주소를 입력하세요 (국가, 도시, 상세주소)"
              rows={3}
              value={shippingInfo.address ?? ''}
              onChange={(e) => update({ address: e.target.value })}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                id="shipping-address"
                readOnly
                placeholder="배송지 주소"
                value={shippingInfo.address ? `(${shippingInfo.zipCode ?? ''}) ${shippingInfo.address}` : ''}
                onClick={handleAddressSearch}
                className="cursor-pointer"
              />
              <Button type="button" variant="outline" onClick={handleAddressSearch}>
                <Search className="mr-1 h-4 w-4" />
                주소 검색
              </Button>
            </div>
            <Input
              id="shipping-address-detail"
              placeholder="상세주소"
              value={shippingInfo.addressDetail ?? ''}
              onChange={(e) => update({ addressDetail: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* 수취인 */}
      <div className="space-y-2">
        <Label>수취인</Label>
        <Input
          id="recipient-name"
          placeholder="이름"
          value={shippingInfo.recipientName ?? ''}
          onChange={(e) => update({ recipientName: e.target.value })}
        />
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
        <Input
          id="recipient-phone"
          placeholder="010-0000-0000"
          value={shippingInfo.recipientPhone ?? ''}
          onChange={(e) => update({ recipientPhone: e.target.value })}
        />
        <Textarea
          id="delivery-message"
          placeholder="배송 메시지"
          rows={3}
          value={shippingInfo.deliveryMessage ?? ''}
          onChange={(e) => update({ deliveryMessage: e.target.value })}
        />
      </div>
    </div>
  )
}
