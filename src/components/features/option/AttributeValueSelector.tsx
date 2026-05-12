import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { OptionAttribute, TriggerState } from '@/types/option'

// TOGGLE_BUTTON의 가상 값 ID 생성 (음수 attribute.id 사용)
export const getToggleValueId = (attributeId: number): number => -attributeId
// 가상 값 ID에서 attribute ID 복원
export const getAttributeIdFromToggleValue = (toggleValueId: number): number => -toggleValueId
// 값 ID가 토글 가상 값인지 확인
export const isToggleValueId = (valueId: number): boolean => valueId < 0

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
            onValueChange={(value) => {
              // 'none' 선택 시 선택 해제
              if (value === 'none') {
                onValueChange(attribute.id, [])
              } else {
                handleSingleSelect(value)
              }
            }}
            disabled={disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder={`${attribute.name} 선택`} />
            </SelectTrigger>
            <SelectContent>
              {/* 선택 해제 옵션 */}
              <SelectItem value="none" className="text-muted-foreground">
                선택 안함
              </SelectItem>
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
                  onClick={() => {
                    // 이미 선택된 경우 선택 해제, 아니면 선택
                    if (isSelected) {
                      onValueChange(attribute.id, [])
                    } else {
                      onValueChange(attribute.id, [value.id])
                    }
                  }}
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
                <button
                  key={value.id}
                  type="button"
                  onClick={() => handleMultiSelect(value.id, !isSelected)}
                  disabled={disabled || state === 'disabled'}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition-colors',
                    isSelected ? 'border-primary bg-primary/10' : 'border-input hover:bg-accent',
                    (disabled || state === 'disabled') && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <div className={cn(
                    'h-4 w-4 rounded border flex items-center justify-center',
                    isSelected ? 'bg-primary border-primary' : 'border-input'
                  )}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className="text-sm">
                    {value.value}
                    {value.price > 0 && (
                      <span className="ml-1 text-muted-foreground">
                        (+{value.price.toLocaleString()})
                      </span>
                    )}
                  </span>
                </button>
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

    case 'TOGGLE_BUTTON': {
      // TOGGLE_BUTTON은 값 없이 ON/OFF만 관리
      // 가상 값 ID (음수 attribute.id)를 사용하여 ON 상태 표현
      const toggleValueId = getToggleValueId(attribute.id)
      const isToggleOn = selectedValueIds.includes(toggleValueId)

      const handleToggle = (checked: boolean) => {
        if (checked) {
          // ON: 가상 값 ID 추가
          onValueChange(attribute.id, [toggleValueId])
        } else {
          // OFF: 가상 값 ID 제거
          onValueChange(attribute.id, [])
        }
      }

      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              {attribute.name}
              {isChildAttribute && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  자식 속성
                </Badge>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-sm transition-colors',
                isToggleOn ? 'text-muted-foreground' : 'text-foreground font-medium'
              )}>
                OFF
              </span>
              <Switch
                checked={isToggleOn}
                onCheckedChange={handleToggle}
                disabled={disabled}
              />
              <span className={cn(
                'text-sm transition-colors',
                isToggleOn ? 'text-primary font-medium' : 'text-muted-foreground'
              )}>
                ON
              </span>
            </div>
          </div>
          {isToggleOn && (
            <p className="text-xs text-muted-foreground">
              하위 속성이 표시됩니다.
            </p>
          )}
        </div>
      )
    }

    default:
      return null
  }
}

export default AttributeValueSelector
