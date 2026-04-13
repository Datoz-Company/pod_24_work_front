// 옵션 관련 Enum 타입들
export type OptionType = 'STANDARD' | 'ADDON' | 'CUSTOM'
export type QuantityType = 'FIXED' | 'PER_UNIT' | 'RANGE'
export type PreviewType = 'SELECT_BOX' | 'CHECK_BOX' | 'RADIO_BUTTON' | 'INPUT_NUMBER' | 'INPUT_TEXT'
export type TriggerType = 'AND' | 'OR' | 'NAND' | 'NOR'
export type TriggerVisibleType = 'HIDE' | 'DISABLE'

// 속성값
export interface OptionAttributeValue {
  id: number
  value: string
  imageUrl?: string
  price: number
  isEnabled: boolean
  displayOrder: number
  triggerAttributeValueIds?: string
  triggerVisibleType?: TriggerVisibleType
  // 계층 구조 관련 필드
  childValueIds?: number[]       // 이 값의 자식 값 ID 목록
  parentValueIds?: number[]      // 이 값의 부모 값 ID 목록
  hasChildValues?: boolean       // 자식 값이 있는지 여부
  isChildValue?: boolean         // 자신이 다른 값의 자식인지 여부
}

// 속성
export interface OptionAttribute {
  id: number
  name: string
  isAddable: boolean
  isMultiSelectable: boolean
  previewType: PreviewType
  systemAttributeType?: string
  displayOrder: number
  values: OptionAttributeValue[]
  // 계층 구조 관련 필드
  parentAttributeId?: number       // 부모 속성 ID
  parentAttributeName?: string     // 부모 속성 이름
  hasChildAttribute?: boolean      // 자식 속성이 있는지 여부
  isChildAttribute?: boolean       // 자신이 자식 속성인지 여부
}

// 옵션 (전역)
export interface Option {
  id: number
  name: string
  description?: string
  isRequired: boolean
  isMultipleAllowed: boolean
  quantityType: QuantityType
  optionType: OptionType
  displayOrder: number
  triggerAttributeValueIds?: string
  triggerType?: TriggerType
  triggerVisibleType?: TriggerVisibleType
  isActive: boolean
  attributes: OptionAttribute[]
  createdAt?: string
  updatedAt?: string
}

// 상품-옵션 연결
export interface ProductOption {
  id: number
  optionId: number
  displayOrder: number
  isRequired: boolean
  option?: Option
}

// 작업지시서 옵션
export interface WorkOrderOption {
  id: number
  optionId?: number
  snapshot: string
  optionType: OptionType
  optionCount: number
  optionPrice: number
  optionTotalAmount: number
  selectedAttributeValueIds: string
}

// === Request Types ===

export interface OptionCreateRequest {
  name: string
  description?: string
  isRequired?: boolean
  isMultipleAllowed?: boolean
  quantityType?: QuantityType
  optionType?: OptionType
  triggerAttributeValueIds?: string
  triggerType?: TriggerType
  triggerVisibleType?: TriggerVisibleType
}

export interface OptionUpdateRequest extends OptionCreateRequest {
  isActive?: boolean
}

export interface AttributeCreateRequest {
  name: string
  isAddable?: boolean
  isMultiSelectable?: boolean
  previewType?: PreviewType
  systemAttributeType?: string
}

export interface AttributeValueCreateRequest {
  value: string
  imageUrl?: string
  price?: number
  triggerAttributeValueIds?: string
  triggerVisibleType?: TriggerVisibleType
}

export interface AttributeValueUpdateRequest extends AttributeValueCreateRequest {
  isEnabled?: boolean
}

export interface ProductOptionItem {
  optionId: number
  displayOrder?: number
  isRequired?: boolean
}

export interface ProductOptionUpdateRequest {
  options: ProductOptionItem[]
}

export interface WorkOrderOptionRequest {
  optionId: number
  selectedAttributeValueIds: number[]
  optionCount?: number
}

// === Trigger 상태 ===

export type TriggerState = 'visible' | 'hidden' | 'disabled'

export interface OptionState {
  option: Option
  state: TriggerState
}

export interface AttributeValueState {
  value: OptionAttributeValue
  state: TriggerState
}
