import api from './api'

/** 복사 · 가져오기 범위 (생략하면 전체) */
export interface CopySelectionRequest {
  attributeIds: number[]
  valueIds: number[]
}
import type {
  Option,
  OptionCreateRequest,
  OptionUpdateRequest,
  OptionAttribute,
  OptionAttributeValue,
  AttributeCreateRequest,
  AttributeValueCreateRequest,
  AttributeValueUpdateRequest,
  ProductOption,
  ProductOptionUpdateRequest,
  ProductOptionCopyResult,
} from '@/types/option'

export const optionService = {
  // === 전역 옵션 API ===

  /** 모든 옵션 조회 */
  async getAll(): Promise<Option[]> {
    const response = await api.get('/options')
    return response.data.data
  },

  /** 옵션 상세 조회 */
  async getById(id: number): Promise<Option> {
    const response = await api.get(`/options/${id}`)
    return response.data.data
  },

  /** 옵션 생성 */
  async create(request: OptionCreateRequest): Promise<Option> {
    const response = await api.post('/options', request)
    return response.data.data
  },

  /** 옵션 수정 */
  async update(id: number, request: OptionUpdateRequest): Promise<Option> {
    const response = await api.put(`/options/${id}`, request)
    return response.data.data
  },

  /** 옵션 삭제 */
  async delete(id: number): Promise<void> {
    await api.delete(`/options/${id}`)
  },

  // === 속성 API ===

  /** 속성 추가 */
  async createAttribute(optionId: number, request: AttributeCreateRequest): Promise<OptionAttribute> {
    const response = await api.post(`/options/${optionId}/attributes`, request)
    return response.data.data
  },

  /** 속성 수정 */
  async updateAttribute(attributeId: number, request: AttributeCreateRequest): Promise<OptionAttribute> {
    const response = await api.put(`/options/attributes/${attributeId}`, request)
    return response.data.data
  },

  /** 속성 삭제 */
  async deleteAttribute(attributeId: number): Promise<void> {
    await api.delete(`/options/attributes/${attributeId}`)
  },

  // === 속성값 API ===

  /** 속성값 추가 */
  async createAttributeValue(attributeId: number, request: AttributeValueCreateRequest): Promise<OptionAttributeValue> {
    const response = await api.post(`/options/attributes/${attributeId}/values`, request)
    return response.data.data
  },

  /** 속성값 수정 */
  async updateAttributeValue(valueId: number, request: AttributeValueUpdateRequest): Promise<OptionAttributeValue> {
    const response = await api.put(`/options/values/${valueId}`, request)
    return response.data.data
  },

  /** 속성값 삭제 */
  async deleteAttributeValue(valueId: number): Promise<void> {
    await api.delete(`/options/values/${valueId}`)
  },

  /** 옵션 내 속성 순서 변경 (새 순서의 속성 id 목록) */
  async reorderAttributes(optionId: number, ids: number[]): Promise<Option> {
    const response = await api.put(`/options/${optionId}/attributes/order`, { ids })
    return response.data.data
  },

  /** 속성 내 값 순서 변경 (새 순서의 값 id 목록) */
  async reorderAttributeValues(attributeId: number, ids: number[]): Promise<OptionAttribute> {
    const response = await api.put(`/options/attributes/${attributeId}/values/order`, { ids })
    return response.data.data
  },

  /** 옵션 복제 (속성·속성값·옵션 내부 연결 포함, 상품 연결 제외). name을 비우면 "원본 (복사)"로 지정 */
  async copyOption(optionId: number, name?: string, selection?: CopySelectionRequest): Promise<Option> {
    const response = await api.post(`/options/${optionId}/copy`, {
      name: name?.trim() || null,
      attributeIds: selection?.attributeIds ?? null,
      valueIds: selection?.valueIds ?? null,
    })
    return response.data.data
  },

  /**
   * 속성 복사 (값·하위 속성 포함). 복사본이 들어간 옵션을 반환
   * targetOptionId를 비우면 같은 옵션에 복사, name을 비우면 서버가 기본 이름 지정
   */
  async copyAttribute(
    attributeId: number,
    data: { targetOptionId?: number; name?: string; selection?: CopySelectionRequest }
  ): Promise<Option> {
    const response = await api.post(`/options/attributes/${attributeId}/copy`, {
      targetOptionId: data.targetOptionId ?? null,
      name: data.name?.trim() || null,
      attributeIds: data.selection?.attributeIds ?? null,
      valueIds: data.selection?.valueIds ?? null,
    })
    return response.data.data
  },

  /**
   * 다른 옵션의 속성(+값)을 이 옵션에 새 속성으로 가져옵니다.
   *
   * @param {number} optionId - 속성을 받을 옵션
   * @param {number} sourceOptionId - 속성을 가져올 옵션
   * @param {CopySelectionRequest} [selection] - 가져올 속성 · 값 (없으면 전체)
   * @returns 속성을 가져온 옵션과 추가된 속성 · 값 수
   */
  async importAttributes(
    optionId: number,
    sourceOptionId: number,
    selection?: CopySelectionRequest
  ): Promise<{ option: Option; attributeCount: number; valueCount: number }> {
    const response = await api.post(`/options/${optionId}/import-attributes`, {
      sourceOptionId,
      attributeIds: selection?.attributeIds ?? null,
      valueIds: selection?.valueIds ?? null,
    })
    return response.data.data
  },

  // === 상품 옵션 API ===

  /** 상품의 옵션 연결을 다른 상품들에 복사 (대상의 기존 옵션은 유지, 없는 옵션만 추가) */
  async copyProductOptions(sourceProductId: number, targetProductIds: number[]): Promise<ProductOptionCopyResult> {
    const response = await api.post(`/products/${sourceProductId}/options/copy`, { targetProductIds })
    return response.data.data
  },

  /** 상품의 옵션 목록 조회 */
  async getProductOptions(productId: number): Promise<ProductOption[]> {
    const response = await api.get(`/products/${productId}/options`)
    return response.data.data
  },

  /** 상품의 옵션 설정 */
  async updateProductOptions(productId: number, request: ProductOptionUpdateRequest): Promise<ProductOption[]> {
    const response = await api.put(`/products/${productId}/options`, request)
    return response.data.data
  },

  /** 상품에 연결 가능한 옵션 목록 */
  async getAvailableOptions(productId: number): Promise<Option[]> {
    const response = await api.get(`/products/${productId}/available-options`)
    return response.data.data
  },

  // === 계층 구조 API ===

  /** 계층 정보를 포함한 옵션 상세 조회 */
  async getByIdWithHierarchy(id: number): Promise<Option> {
    const response = await api.get(`/options/${id}/with-hierarchy`)
    return response.data.data
  },

  /** 자식 속성 연결 (예: "종이 평량"을 "종이 종류"의 자식으로) */
  async setChildAttribute(
    parentAttributeId: number,
    childAttributeId: number,
    visibleForParentValueIds?: number[]
  ): Promise<OptionAttribute> {
    const response = await api.post(
      `/options/attributes/${parentAttributeId}/child/${childAttributeId}`,
      visibleForParentValueIds ? { visibleForParentValueIds } : {}
    )
    return response.data.data
  },

  /** 하위 속성의 표시 조건 업데이트 */
  async updateChildAttributeVisibility(
    childAttributeId: number,
    visibleForParentValueIds: number[]
  ): Promise<OptionAttribute> {
    const response = await api.put(
      `/options/attributes/${childAttributeId}/visibility`,
      { visibleForParentValueIds }
    )
    return response.data.data
  },

  /** 자식 속성 연결 해제 */
  async removeChildAttribute(childAttributeId: number): Promise<void> {
    await api.delete(`/options/attributes/${childAttributeId}/parent`)
  },

  /** 자식 값 매핑 추가 (단일) */
  async addValueMapping(parentValueId: number, childValueId: number): Promise<void> {
    await api.post(`/options/values/${parentValueId}/child/${childValueId}`)
  },

  /** 자식 값 매핑 삭제 (단일) */
  async removeValueMapping(parentValueId: number, childValueId: number): Promise<void> {
    await api.delete(`/options/values/${parentValueId}/child/${childValueId}`)
  },

  /** 부모 값에 여러 자식 값 일괄 매핑 (기존 매핑 교체) */
  async setValueMappings(parentValueId: number, childValueIds: number[]): Promise<void> {
    await api.put(`/options/values/${parentValueId}/children`, childValueIds)
  },

  /** 부모 값의 자식 값 ID 목록 조회 */
  async getChildValueIds(parentValueId: number): Promise<number[]> {
    const response = await api.get(`/options/values/${parentValueId}/children`)
    return response.data.data
  },

  /** 선택된 부모 값들에 대한 자식 값 ID 목록 조회 (옵션 선택 시 필터링용) */
  async getChildValueIdsByParents(parentValueIds: number[]): Promise<number[]> {
    const response = await api.post(`/options/values/children/by-parents`, parentValueIds)
    return response.data.data
  },
}
