import { useMemo } from 'react'
import type {
  Option,
  OptionAttributeValue,
  TriggerType,
  TriggerState,
} from '@/types/option'

/**
 * JSON 문자열을 숫자 배열로 파싱
 * @example "[1, 2, 3]" -> [1, 2, 3]
 */
function parseTriggerIds(triggerIds: string | undefined): number[] {
  if (!triggerIds) return []
  try {
    const parsed = JSON.parse(triggerIds)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * 트리거 조건 평가
 * @param triggerIds 트리거로 설정된 속성값 ID 목록
 * @param selectedIds 현재 선택된 속성값 ID 목록
 * @param triggerType 평가 방식 (AND, OR, NAND, NOR)
 * @returns 조건 충족 여부
 */
function evaluateTrigger(
  triggerIds: number[],
  selectedIds: number[],
  triggerType: TriggerType | undefined
): boolean {
  if (triggerIds.length === 0) return true

  const selectedSet = new Set(selectedIds)

  switch (triggerType) {
    case 'AND':
      // 모든 트리거 ID가 선택되어야 함
      return triggerIds.every((id) => selectedSet.has(id))

    case 'OR':
      // 하나라도 선택되면 충족
      return triggerIds.some((id) => selectedSet.has(id))

    case 'NAND':
      // 모든 조건이 충족되지 않으면 true (AND의 반대)
      return !triggerIds.every((id) => selectedSet.has(id))

    case 'NOR':
      // 어느 것도 선택되지 않아야 함 (OR의 반대)
      return !triggerIds.some((id) => selectedSet.has(id))

    default:
      // 기본값: OR 방식
      return triggerIds.some((id) => selectedSet.has(id))
  }
}

export interface UseOptionTriggerOptions {
  selectedValueIds: number[]
}

/**
 * 옵션 트리거 상태를 평가하는 훅
 */
export function useOptionTrigger({ selectedValueIds }: UseOptionTriggerOptions) {
  /**
   * 옵션의 표시 상태 평가
   */
  const getOptionState = useMemo(() => {
    return (option: Option): TriggerState => {
      const triggerIds = parseTriggerIds(option.triggerAttributeValueIds)

      if (triggerIds.length === 0) return 'visible'

      const isConditionMet = evaluateTrigger(
        triggerIds,
        selectedValueIds,
        option.triggerType
      )

      if (isConditionMet) return 'visible'

      return option.triggerVisibleType === 'DISABLE' ? 'disabled' : 'hidden'
    }
  }, [selectedValueIds])

  /**
   * 속성값의 표시 상태 평가
   */
  const getAttributeValueState = useMemo(() => {
    return (value: OptionAttributeValue): TriggerState => {
      const triggerIds = parseTriggerIds(value.triggerAttributeValueIds)

      if (triggerIds.length === 0) return 'visible'

      // 속성값의 경우 기본적으로 OR 방식 사용
      const isConditionMet = evaluateTrigger(
        triggerIds,
        selectedValueIds,
        'OR'
      )

      if (isConditionMet) return 'visible'

      return value.triggerVisibleType === 'DISABLE' ? 'disabled' : 'hidden'
    }
  }, [selectedValueIds])

  /**
   * 여러 옵션의 표시 상태를 한번에 계산
   */
  const getOptionsStates = useMemo(() => {
    return (options: Option[]): Map<number, TriggerState> => {
      const states = new Map<number, TriggerState>()
      for (const option of options) {
        states.set(option.id, getOptionState(option))
      }
      return states
    }
  }, [getOptionState])

  return {
    getOptionState,
    getAttributeValueState,
    getOptionsStates,
  }
}

export default useOptionTrigger
