import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { OptionSelector } from '@/components/features/option/OptionSelector'
import { optionService } from '@/services/optionService'
import { cn } from '@/lib/utils'
import type { Product } from '@/types'
import type { WorkOrderOptionRequest } from '@/types/option'

export const UNCATEGORIZED = '미분류'

export interface OrderItemFormData {
  key: string
  category: string
  productId: number
  itemName: string  // 품명 (직접 입력) — 같은 상품을 구분하는 용도
  quantity: number
  processIds: number[]
  options: WorkOrderOptionRequest[]
  isExpanded: boolean
}

export const createEmptyOrderItem = (): OrderItemFormData => ({
  key: crypto.randomUUID(),
  category: '',
  productId: 0,
  itemName: '',
  quantity: 1,
  processIds: [],
  options: [],
  isExpanded: true,
})

/**
 * 상품 목록에서 카테고리 목록을 추출합니다 (정렬, 미분류는 마지막).
 *
 * @param {readonly Product[]} products - 상품 목록
 * @returns {string[]} 카테고리명 목록
 */
export function getCategories(products: readonly Product[]): string[] {
  const set = new Set<string>()
  for (const product of products) {
    set.add(product.category?.trim() || UNCATEGORIZED)
  }
  return [...set].sort((a, b) => {
    if (a === UNCATEGORIZED) return 1
    if (b === UNCATEGORIZED) return -1
    return a.localeCompare(b, 'ko')
  })
}

/**
 * 품목의 작업명: 품명(직접 입력) → 상품명 순.
 *
 * @param {OrderItemFormData} item - 품목
 * @param {readonly Product[]} products - 상품 목록
 * @returns {string} 작업명 (상품 미선택 시 빈 문자열)
 */
export function getOrderItemLabel(item: OrderItemFormData, products: readonly Product[]): string {
  if (item.itemName.trim()) return item.itemName.trim()
  return products.find((p) => p.id === item.productId)?.name ?? ''
}

/**
 * 품목 목록을 검증합니다 — 상품 선택, 상품의 공정 설정 여부.
 *
 * @param {readonly OrderItemFormData[]} items - 품목 목록
 * @param {readonly Product[]} products - 상품 목록 (공정 포함)
 * @returns {string | null} 오류 메시지, 문제가 없으면 null
 */
export function validateOrderItems(items: readonly OrderItemFormData[], products: readonly Product[]): string | null {
  for (const [index, item] of items.entries()) {
    if (!item.productId) {
      return `품목 ${index + 1}의 상품을 선택해주세요.`
    }
    const product = products.find((p) => p.id === item.productId)
    if (!product?.processes?.some((p) => !p.isSystem)) {
      return `"${product?.name}" 상품에 공정이 설정되어 있지 않습니다. 상품별 작업 공정 관리에서 먼저 설정하세요.`
    }
  }
  return null
}

interface OrderItemCardProps {
  item: OrderItemFormData
  index: number
  products: Product[]
  canDelete: boolean
  onChange: (patch: Partial<OrderItemFormData>) => void
  onRemove: () => void
  /** 상품 변경 불가 (이미 생성된 작업 수정 시 — 공정·옵션 구성이 상품에 묶여 있음) */
  lockProduct?: boolean
}

export function OrderItemCard({ item, index, products, canDelete, onChange, onRemove, lockProduct = false }: OrderItemCardProps) {
  const categories = useMemo(() => getCategories(products), [products])
  const productsInCategory = useMemo(
    () => products.filter((p) => (p.category?.trim() || UNCATEGORIZED) === item.category),
    [products, item.category]
  )
  const selectedProduct = products.find((p) => p.id === item.productId)

  const { data: productOptions = [] } = useQuery({
    queryKey: ['product-options', item.productId],
    queryFn: () => optionService.getProductOptions(item.productId),
    enabled: item.productId > 0,
  })

  const handleCategoryChange = (category: string) => {
    onChange({ category, productId: 0, processIds: [], options: [] })
  }

  const handleProductChange = (productId: number) => {
    const product = products.find((p) => p.id === productId)
    onChange({
      productId,
      options: [],
      processIds: product?.processes?.filter((p) => !p.isSystem).map((p) => p.id) ?? [],
    })
  }

  const toggleProcess = (processId: number) => {
    const next = item.processIds.includes(processId)
      ? item.processIds.filter((id) => id !== processId)
      : [...item.processIds, processId]
    onChange({ processIds: next })
  }

  return (
    <div className="rounded-lg border bg-white">
      <div
        className="group flex cursor-pointer items-center justify-between gap-2 px-4 py-3"
        onClick={() => onChange({ isExpanded: !item.isExpanded })}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="text-sm font-medium">{lockProduct ? '품목' : `품목 ${index + 1}`}</span>
          {selectedProduct && <Badge variant="secondary" className="text-[10px]">{selectedProduct.name}</Badge>}
          {item.itemName && <span className="truncate text-sm text-muted-foreground">{item.itemName}</span>}
          {selectedProduct && <span className="text-xs text-muted-foreground">· {item.quantity}개</span>}
        </div>
        <div className="flex items-center gap-1">
          {canDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove()
              }}
              className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              aria-label={`품목 ${index + 1} 삭제`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          {item.isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </div>

      {item.isExpanded && (
        <div className="space-y-4 border-t px-4 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">상품 종류 *</Label>
              <Select value={item.category} onValueChange={handleCategoryChange} disabled={lockProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="상품 종류 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">상품 *</Label>
              <Select
                value={item.productId ? String(item.productId) : ''}
                onValueChange={(v) => handleProductChange(Number(v))}
                disabled={!item.category || lockProduct}
              >
                <SelectTrigger>
                  <SelectValue placeholder={item.category ? '상품 선택' : '상품 종류를 먼저 선택하세요'} />
                </SelectTrigger>
                <SelectContent>
                  {productsInCategory.map((product) => (
                    <SelectItem key={product.id} value={String(product.id)}>{product.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor={`item-name-${item.key}`}>품명 (직접 입력)</Label>
              <Input
                id={`item-name-${item.key}`}
                value={item.itemName}
                onChange={(e) => onChange({ itemName: e.target.value })}
                placeholder="예: 런치 메뉴판 A4 양면"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs" htmlFor={`item-qty-${item.key}`}>수량 *</Label>
              <Input
                id={`item-qty-${item.key}`}
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => onChange({ quantity: Math.max(1, Number(e.target.value)) })}
              />
            </div>
          </div>

          {selectedProduct?.processes && selectedProduct.processes.some((p) => !p.isSystem) && (
            <div className="space-y-1.5">
              <Label className="text-xs">공정</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedProduct.processes.filter((p) => !p.isSystem).map((process) => {
                  const isSelected = item.processIds.includes(process.id)
                  return (
                    <button
                      key={process.id}
                      type="button"
                      onClick={() => toggleProcess(process.id)}
                      className={cn(
                        'flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-all',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-gray-300 bg-white text-gray-600 hover:border-primary/50'
                      )}
                    >
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: process.color }} />
                      {process.name}
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {item.productId > 0 && productOptions.length > 0 && (
            <div className="border-t pt-3">
              <OptionSelector
                productOptions={productOptions}
                selectedOptions={item.options}
                onOptionsChange={(options) => onChange({ options })}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
