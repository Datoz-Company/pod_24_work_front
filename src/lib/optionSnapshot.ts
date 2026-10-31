import type { WorkOrderOption, WorkOrderOptionRequest } from '@/types/option'

/** 작업 옵션 스냅샷의 속성 (서버 OptionService.createSnapshot 형식) */
interface SnapshotAttribute {
  attributeId: number
  attributeName: string
  previewType?: string
  selectedValues?: { valueId: number; value: string; price: number; customInput?: string }[]
  inputValue?: string
  isToggleOn?: boolean
}

interface OptionSnapshot {
  optionId?: number
  optionName?: string
  attributes?: SnapshotAttribute[]
}

/** 화면 표시용 속성 한 줄 */
export interface OptionAttributeLine {
  attributeId: number
  name: string
  /** 표시 값 (예: "A4", "별도 사이즈: 300x450mm", "ON") */
  values: { label: string; price: number }[]
}

function parse(option: WorkOrderOption): OptionSnapshot | null {
  try {
    return JSON.parse(option.snapshot) as OptionSnapshot
  } catch {
    return null
  }
}

/**
 * 작업 옵션 스냅샷을 표시용 줄 목록으로 변환합니다. 값이 없는 속성(빈 입력, 토글 OFF)은 제외.
 *
 * @param {WorkOrderOption} option - 작업 옵션
 * @returns {{ optionName: string; lines: OptionAttributeLine[] }} 옵션명과 속성 줄
 */
export function describeOption(option: WorkOrderOption): { optionName: string; lines: OptionAttributeLine[] } {
  const snapshot = parse(option)
  const lines: OptionAttributeLine[] = []
  for (const attr of snapshot?.attributes ?? []) {
    if (attr.previewType === 'TOGGLE_BUTTON') {
      if (attr.isToggleOn) lines.push({ attributeId: attr.attributeId, name: attr.attributeName, values: [{ label: 'ON', price: 0 }] })
      continue
    }
    if (attr.previewType === 'INPUT_TEXT' || attr.previewType === 'INPUT_NUMBER') {
      if (attr.inputValue?.trim()) {
        lines.push({ attributeId: attr.attributeId, name: attr.attributeName, values: [{ label: attr.inputValue, price: 0 }] })
      }
      continue
    }
    const values = (attr.selectedValues ?? []).map((v) => ({
      label: v.customInput ? `${v.value}: ${v.customInput}` : v.value,
      price: v.price ?? 0,
    }))
    if (values.length > 0) lines.push({ attributeId: attr.attributeId, name: attr.attributeName, values })
  }
  return { optionName: snapshot?.optionName ?? '', lines }
}

/**
 * 저장된 작업 옵션을 다시 편집할 수 있도록 옵션 요청 형식으로 복원합니다.
 * (선택값 ID는 그대로, 입력값·별도 사이즈 직접 입력은 스냅샷에서 속성별로 복원)
 *
 * @param {WorkOrderOption} option - 작업 옵션
 * @returns {WorkOrderOptionRequest | null} 복원된 요청, 원본 옵션이 삭제되어 복원할 수 없으면 null
 */
export function toOptionRequest(option: WorkOrderOption): WorkOrderOptionRequest | null {
  const snapshot = parse(option)
  const optionId = option.optionId ?? snapshot?.optionId
  if (!optionId) return null

  let selectedAttributeValueIds: number[] = []
  try {
    selectedAttributeValueIds = JSON.parse(option.selectedAttributeValueIds) as number[]
  } catch {
    selectedAttributeValueIds = []
  }

  const inputValues: Record<number, string> = {}
  for (const attr of snapshot?.attributes ?? []) {
    if (attr.inputValue) inputValues[attr.attributeId] = attr.inputValue
    const custom = attr.selectedValues?.find((v) => v.customInput)?.customInput
    if (custom) inputValues[attr.attributeId] = custom
  }

  return { optionId, selectedAttributeValueIds, inputValues, optionCount: option.optionCount }
}
