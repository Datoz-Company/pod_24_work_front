import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OptionAttribute, TriggerState } from '@/types/option'

interface AttributeValueSelectorProps {
  attribute: OptionAttribute
  selectedValueIds: number[]
  onValueChange: (attributeId: number, valueIds: number[]) => void
  getValueState: (valueId: number) => TriggerState
  disabled?: boolean
  // 계층 구조 관련 props
  allowedChildValueIds?: number[] | null  // 부모 값에서 허용된 자식 값 ID 목록 (null이면 필터링 안함)
  parentAttributeName?: string            // 부모 속성 이름 (자식 속성인 경우)
  isParentValueSelected?: boolean         // 부모 값이 선택되었는지 여부
}

export function AttributeValueSelector({
  attribute,
  selectedValueIds,
  onValueChange,
  getValueState,
  disabled = false,
  allowedChildValueIds = null,
  parentAttributeName,
  isParentValueSelected = true,
}: AttributeValueSelectorProps) {
  // 기본 활성화된 값 필터링
  let enabledValues = attribute.values.filter((v) => v.isEnabled)

  // 계층 구조 필터링: 자식 속성인 경우 allowedChildValueIds에 포함된 값만 표시
  const isChildAttribute = attribute.isChildAttribute
  const hasAllowedFilter = allowedChildValueIds !== null

  if (isChildAttribute && hasAllowedFilter) {
    enabledValues = enabledValues.filter((v) => allowedChildValueIds.includes(v.id))
  }

  // 자식 속성인데 부모 값이 선택되지 않은 경우
  if (isChildAttribute && !isParentValueSelected) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          {attribute.name}
          <Badge variant="outline" className="text-xs text-muted-foreground">
            자식 속성
          </Badge>
        </Label>
        <div className="p-3 border border-dashed rounded-md bg-muted/50 text-sm text-muted-foreground">
          먼저 "{parentAttributeName || '부모 속성'}"의 값을 선택해주세요.
        </div>
      </div>
    )
  }

  // 자식 속성인데 연결된 자식 값이 없는 경우
  if (isChildAttribute && hasAllowedFilter && enabledValues.length === 0) {
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          {attribute.name}
          <Badge variant="outline" className="text-xs text-muted-foreground">
            자식 속성
          </Badge>
        </Label>
        <div className="p-3 border border-dashed rounded-md bg-muted/50 text-sm text-muted-foreground">
          선택한 "{parentAttributeName || '부모 값'}"에 연결된 값이 없습니다.
        </div>
      </div>
    )
  }

  // 현재 속성에서 선택된 값들
  const currentSelectedIds = selectedValueIds.filter((id) =>
    enabledValues.some((v) => v.id === id)
  )

  const handleSingleSelect = (valueId: string) => {
    onValueChange(attribute.id, [Number(valueId)])
  }

  const handleMultiSelect = (valueId: number, checked: boolean) => {
    if (checked) {
      onValueChange(attribute.id, [...currentSelectedIds, valueId])
    } else {
      onValueChange(
        attribute.id,
        currentSelectedIds.filter((id) => id !== valueId)
      )
    }
  }

  // PreviewType에 따른 렌더링
  switch (attribute.previewType) {
    case 'SELECT_BOX':
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {attribute.name}
            {isChildAttribute && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                자식 속성
              </Badge>
            )}
          </Label>
          <Select
            value={currentSelectedIds[0]?.toString() || ''}
            onValueChange={handleSingleSelect}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={`${attribute.name} 선택`} />
            </SelectTrigger>
            <SelectContent>
              {enabledValues.map((value) => {
                const state = getValueState(value.id)
                if (state === 'hidden') return null
                return (
                  <SelectItem
                    key={value.id}
                    value={value.id.toString()}
                    disabled={state === 'disabled'}
                  >
                    {value.value}
                    {value.price > 0 && (
                      <span className="ml-2 text-muted-foreground">
                        (+{value.price.toLocaleString()}원)
                      </span>
                    )}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )

    case 'RADIO_BUTTON':
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {attribute.name}
            {isChildAttribute && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                자식 속성
              </Badge>
            )}
          </Label>
          <div className="flex flex-wrap gap-2">
            {enabledValues.map((value) => {
              const state = getValueState(value.id)
              if (state === 'hidden') return null
              const isSelected = currentSelectedIds.includes(value.id)
              return (
                <button
                  key={value.id}
                  type="button"
                  onClick={() => onValueChange(attribute.id, [value.id])}
                  disabled={disabled || state === 'disabled'}
                  className={cn(
                    'px-3 py-2 rounded-md border text-sm transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input hover:bg-accent',
                    (disabled || state === 'disabled') && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {value.value}
                  {value.price > 0 && (
                    <span className="ml-1 text-xs">
                      (+{value.price.toLocaleString()})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )

    case 'CHECK_BOX':
      return (
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            {attribute.name}
            {isChildAttribute && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                자식 속성
              </Badge>
            )}
          </Label>
          <div className="flex flex-wrap gap-2">
            {enabledValues.map((value) => {
              const state = getValueState(value.id)
              if (state === 'hidden') return null
              const isSelected = currentSelectedIds.includes(value.id)
              return (
                <label
                  key={value.id}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors',
                    isSelected ? 'border-primary bg-primary/10' : 'border-input',
                    (disabled || state === 'disabled') && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleMultiSelect(value.id, e.target.checked)}
                    disabled={disabled || state === 'disabled'}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    {value.value}
                    {value.price > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        (+{value.price.toLocaleString()})
                      </span>
                    )}
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )

    case 'INPUT_NUMBER':
      return (
        <div className="space-y-2">
          <Label>{attribute.name}</Label>
          <Input
            type="number"
            placeholder={`${attribute.name} 입력`}
            disabled={disabled}
            className="max-w-[200px]"
          />
        </div>
      )

    case 'INPUT_TEXT':
      return (
        <div className="space-y-2">
          <Label>{attribute.name}</Label>
          <Input
            type="text"
            placeholder={`${attribute.name} 입력`}
            disabled={disabled}
          />
        </div>
      )

    default:
      return null
  }
}

export default AttributeValueSelector
