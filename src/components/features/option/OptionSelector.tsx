import { useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AttributeValueSelector } from './AttributeValueSelector'
import { useOptionTrigger } from '@/hooks/useOptionTrigger'
import type { ProductOption, WorkOrderOptionRequest, TriggerState, OptionAttribute } from '@/types/option'
import { cn } from '@/lib/utils'

interface OptionSelectorProps {
  productOptions: ProductOption[]
  selectedOptions: WorkOrderOptionRequest[]
  onOptionsChange: (options: WorkOrderOptionRequest[]) => void
}

/**
 * 작업 생성 시 옵션을 선택하는 컨테이너 컴포넌트
 */
export function OptionSelector({
  productOptions,
  selectedOptions,
  onOptionsChange,
}: OptionSelectorProps) {
  // 모든 선택된 속성값 ID 추출
  const allSelectedValueIds = useMemo(() => {
    return selectedOptions.flatMap((opt) => opt.selectedAttributeValueIds)
  }, [selectedOptions])

  const { getOptionState, getAttributeValueState } = useOptionTrigger({
    selectedValueIds: allSelectedValueIds,
  })

  // 특정 속성값의 상태 가져오기
  const getValueState = useCallback(
    (valueId: number): TriggerState => {
      const allValues = productOptions.flatMap(
        (po) => po.option?.attributes.flatMap((attr) => attr.values) || []
      )
      const value = allValues.find((v) => v.id === valueId)
      return value ? getAttributeValueState(value) : 'visible'
    },
    [productOptions, getAttributeValueState]
  )

  // 계층 구조 관련 유틸리티 함수들
  // 부모 속성의 선택된 값들에서 허용된 자식 값 ID 목록 가져오기
  const getAllowedChildValueIds = useCallback(
    (childAttribute: OptionAttribute, parentAttribute: OptionAttribute | undefined, selectedValueIds: number[]): number[] | null => {
      if (!parentAttribute || !childAttribute.isChildAttribute) {
        return null // 계층 구조가 아니면 필터링 안함
      }

      // 부모 속성에서 선택된 값 찾기
      const selectedParentValues = parentAttribute.values.filter(
        (v) => selectedValueIds.includes(v.id)
      )

      if (selectedParentValues.length === 0) {
        return [] // 부모 값이 선택되지 않으면 빈 배열 반환
      }

      // 선택된 부모 값들의 childValueIds 합집합
      const allowedIds = new Set<number>()
      for (const parentValue of selectedParentValues) {
        if (parentValue.childValueIds) {
          for (const childId of parentValue.childValueIds) {
            allowedIds.add(childId)
          }
        }
      }

      return Array.from(allowedIds)
    },
    []
  )

  // 부모 속성 찾기
  const findParentAttribute = useCallback(
    (attribute: OptionAttribute, allAttributes: OptionAttribute[]): OptionAttribute | undefined => {
      if (!attribute.isChildAttribute || !attribute.parentAttributeId) {
        return undefined
      }
      return allAttributes.find((a) => a.id === attribute.parentAttributeId)
    },
    []
  )

  // 부모 값이 선택되었는지 확인
  const isParentValueSelected = useCallback(
    (_attribute: OptionAttribute, parentAttribute: OptionAttribute | undefined, selectedValueIds: number[]): boolean => {
      if (!parentAttribute) return true
      return parentAttribute.values.some((v) => selectedValueIds.includes(v.id))
    },
    []
  )

  // 속성값 변경 핸들러
  const handleValueChange = useCallback(
    (optionId: number, attributeId: number, valueIds: number[]) => {
      // 현재 옵션의 선택 상태 찾기
      const existingOption = selectedOptions.find((opt) => opt.optionId === optionId)

      if (existingOption) {
        // 기존 선택에서 해당 속성의 값들을 제거하고 새 값들 추가
        const otherAttributeValues = existingOption.selectedAttributeValueIds.filter(
          (id) => {
            const productOption = productOptions.find((po) => po.optionId === optionId)
            const attribute = productOption?.option?.attributes.find(
              (attr) => attr.id === attributeId
            )
            return !attribute?.values.some((v) => v.id === id)
          }
        )

        const updatedOption: WorkOrderOptionRequest = {
          ...existingOption,
          selectedAttributeValueIds: [...otherAttributeValues, ...valueIds],
        }

        onOptionsChange(
          selectedOptions.map((opt) =>
            opt.optionId === optionId ? updatedOption : opt
          )
        )
      } else {
        // 새 옵션 선택 추가
        const newOption: WorkOrderOptionRequest = {
          optionId,
          selectedAttributeValueIds: valueIds,
          optionCount: 1,
        }
        onOptionsChange([...selectedOptions, newOption])
      }
    },
    [selectedOptions, productOptions, onOptionsChange]
  )

  // 선택된 옵션의 총 추가 금액 계산
  const totalAdditionalPrice = useMemo(() => {
    let total = 0
    for (const selected of selectedOptions) {
      const productOption = productOptions.find(
        (po) => po.optionId === selected.optionId
      )
      if (!productOption?.option) continue

      for (const valueId of selected.selectedAttributeValueIds) {
        for (const attr of productOption.option.attributes) {
          const value = attr.values.find((v) => v.id === valueId)
          if (value) {
            total += value.price * (selected.optionCount || 1)
          }
        }
      }
    }
    return total
  }, [selectedOptions, productOptions])

  if (productOptions.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">옵션 선택</h3>
        {totalAdditionalPrice > 0 && (
          <span className="text-sm text-muted-foreground">
            추가 금액: +{totalAdditionalPrice.toLocaleString()}원
          </span>
        )}
      </div>

      {productOptions.map((productOption) => {
        const option = productOption.option
        if (!option) return null

        const optionState = getOptionState(option)
        if (optionState === 'hidden') return null

        const isDisabled = optionState === 'disabled'
        const currentSelection = selectedOptions.find(
          (s) => s.optionId === option.id
        )

        return (
          <Card
            key={productOption.id}
            className={cn(
              isDisabled && 'opacity-50'
            )}
          >
            <CardHeader className="py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                {option.name}
                {productOption.isRequired && (
                  <Badge variant="destructive" className="text-xs">
                    필수
                  </Badge>
                )}
                {option.optionType !== 'STANDARD' && (
                  <Badge variant="secondary" className="text-xs">
                    {option.optionType === 'ADDON' ? '추가' : '커스텀'}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {option.attributes.map((attribute) => {
                const parentAttribute = findParentAttribute(attribute, option.attributes)
                const allowedChildValueIds = getAllowedChildValueIds(
                  attribute,
                  parentAttribute,
                  currentSelection?.selectedAttributeValueIds || []
                )
                const parentValueSelected = isParentValueSelected(
                  attribute,
                  parentAttribute,
                  currentSelection?.selectedAttributeValueIds || []
                )

                return (
                  <AttributeValueSelector
                    key={attribute.id}
                    attribute={attribute}
                    selectedValueIds={currentSelection?.selectedAttributeValueIds || []}
                    onValueChange={(attrId, valueIds) =>
                      handleValueChange(option.id, attrId, valueIds)
                    }
                    getValueState={getValueState}
                    disabled={isDisabled}
                    // 계층 구조 관련 props
                    allowedChildValueIds={allowedChildValueIds}
                    parentAttributeName={parentAttribute?.name}
                    isParentValueSelected={parentValueSelected}
                  />
                )
              })}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default OptionSelector
