import { toast } from 'sonner'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { openAddressSearch } from '@/lib/daumPostcode'
import type { ShippingInfo } from '@/types'

interface ShippingAddressFieldsProps {
  value: ShippingInfo
  onChange: (info: ShippingInfo) => void
  /** 해외 주소: 주소 검색 대신 우편번호/주소 직접 입력 */
  isOverseas?: boolean
  /** 수취인 이름 아래에 끼워 넣을 요소 (예: "주문자 정보와 동일") */
  recipientExtra?: React.ReactNode
  showDeliveryMessage?: boolean
}

/**
 * 배송지 + 수취인 입력 필드 묶음
 * 주문 등록(출고·배송)과 고객 배송지 주소록에서 같은 입력 방식을 쓰도록 공용화
 */
export function ShippingAddressFields({
  value,
  onChange,
  isOverseas = false,
  recipientExtra,
  showDeliveryMessage = true,
}: ShippingAddressFieldsProps) {
  const update = (patch: Partial<ShippingInfo>) => onChange({ ...value, ...patch })

  const handleAddressSearch = async () => {
    try {
      const { zipCode, address } = await openAddressSearch()
      update({ zipCode, address })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '주소 검색에 실패했습니다.')
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label>배송지</Label>
        {isOverseas ? (
          <div className="space-y-2">
            <Input
              placeholder="우편번호 (Zip / Postal code)"
              value={value.zipCode ?? ''}
              onChange={(e) => update({ zipCode: e.target.value })}
            />
            <Textarea
              placeholder="해외 주소를 입력하세요 (국가, 도시, 상세주소)"
              rows={3}
              value={value.address ?? ''}
              onChange={(e) => update({ address: e.target.value })}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                readOnly
                placeholder="배송지 주소"
                value={value.address ? `(${value.zipCode ?? ''}) ${value.address}` : ''}
                onClick={handleAddressSearch}
                className="cursor-pointer"
              />
              <Button type="button" variant="outline" onClick={handleAddressSearch}>
                <Search className="mr-1 h-4 w-4" />
                주소 검색
              </Button>
            </div>
            <Input
              placeholder="상세주소"
              value={value.addressDetail ?? ''}
              onChange={(e) => update({ addressDetail: e.target.value })}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>수취인</Label>
        <Input
          placeholder="이름"
          value={value.recipientName ?? ''}
          onChange={(e) => update({ recipientName: e.target.value })}
        />
        {recipientExtra}
        <Input
          placeholder="010-0000-0000"
          value={value.recipientPhone ?? ''}
          onChange={(e) => update({ recipientPhone: e.target.value })}
        />
        {showDeliveryMessage && (
          <Textarea
            placeholder="배송 메시지"
            rows={3}
            value={value.deliveryMessage ?? ''}
            onChange={(e) => update({ deliveryMessage: e.target.value })}
          />
        )}
      </div>
    </div>
  )
}

/** 배송지 한 줄 표시: (우편번호) 주소 상세주소 */
export const formatShippingAddress = (info?: ShippingInfo) =>
  info ? [info.zipCode && `(${info.zipCode})`, info.address, info.addressDetail].filter(Boolean).join(' ') : ''
