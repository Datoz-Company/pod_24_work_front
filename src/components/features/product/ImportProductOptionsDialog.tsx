import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { optionService } from '@/services/optionService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { getCategories, UNCATEGORIZED } from '@/components/features/order/OrderItemCard'
import type { Product } from '@/types'
import type { ProductOption } from '@/types/option'

interface ImportProductOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 옵션을 받아올 상품 (지금 설정 중인 상품) */
  targetProduct: Product | null
  /** 지금 상품에 이미 연결된 옵션 (미리보기에서 "이미 있음" 표시용) */
  targetOptions: readonly ProductOption[]
  /** 원본 후보 상품 전체 */
  products: readonly Product[]
}

/**
 * 다른 상품 하나를 골라 그 상품의 옵션 구성(순서·필수 여부)을 지금 상품으로 가져오는 다이얼로그.
 * 지금 상품의 기존 옵션은 유지되고, 아직 연결되지 않은 옵션만 뒤에 추가됩니다.
 * (서버에서는 "고른 상품 → 지금 상품" 방향의 옵션 복사와 같은 동작)
 */
export function ImportProductOptionsDialog({
  open,
  onOpenChange,
  targetProduct,
  targetOptions,
  products,
}: ImportProductOptionsDialogProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [sourceId, setSourceId] = useState<number | null>(null)

  const candidates = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return products.filter(
      (p) =>
        p.id !== targetProduct?.id &&
        (!keyword ||
          p.name.toLowerCase().includes(keyword) ||
          (p.category ?? '').toLowerCase().includes(keyword))
    )
  }, [products, targetProduct, search])

  // 상품 종류별 묶음 (미분류는 마지막)
  const groups = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const category of getCategories(candidates)) map.set(category, [])
    for (const product of candidates) {
      map.get(product.category?.trim() || UNCATEGORIZED)?.push(product)
    }
    return [...map.entries()]
  }, [candidates])

  // 고른 상품의 옵션 미리보기 (서버가 활성 옵션만 반환 = 실제로 가져올 옵션)
  const { data: sourceOptions = [], isFetching: isLoadingSource } = useQuery({
    queryKey: ['product-options', sourceId],
    queryFn: () => optionService.getProductOptions(sourceId!),
    enabled: open && sourceId != null,
  })

  const connectedOptionIds = useMemo(() => new Set(targetOptions.map((po) => po.optionId)), [targetOptions])
  const newOptionCount = sourceOptions.filter((po) => !connectedOptionIds.has(po.optionId)).length
  const sourceProduct = products.find((p) => p.id === sourceId)

  const importMutation = useMutation({
    mutationFn: () => optionService.copyProductOptions(sourceId!, [targetProduct!.id]),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['product-options'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      const skipped = result.skippedCount > 0 ? ` (이미 있던 옵션 ${result.skippedCount}개는 건너뜀)` : ''
      toast.success(`${sourceProduct?.name ?? '선택한 상품'}에서 옵션 ${result.addedCount}개를 가져왔습니다${skipped}`)
      handleOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '옵션 가져오기에 실패했습니다')
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch('')
      setSourceId(null)
    }
    onOpenChange(next)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>옵션 가져오기 - {targetProduct?.name}</DialogTitle>
          <DialogDescription>
            옵션을 가져올 상품을 하나 고르세요. 지금 상품의 기존 옵션은 그대로 두고, 없는 옵션만 순서·필수 여부 그대로 뒤에 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          {/* 원본 상품 선택 */}
          <div className="min-w-0 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="import-option-search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="상품명 또는 종류 검색"
                className="pl-9"
              />
            </div>
            <div role="radiogroup" aria-label="옵션을 가져올 상품" className="h-72 space-y-3 overflow-y-auto rounded-lg border p-2">
              {groups.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">고를 수 있는 상품이 없습니다.</p>
              ) : (
                groups.map(([category, items]) => (
                  <div key={category}>
                    <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">
                      {category} ({items.length})
                    </p>
                    {items.map((product) => (
                      <label
                        key={product.id}
                        className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50 ${
                          sourceId === product.id ? 'bg-primary/10 font-medium' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="import-option-source"
                          className="h-4 w-4 accent-primary"
                          checked={sourceId === product.id}
                          onChange={() => setSourceId(product.id)}
                        />
                        {product.name}
                      </label>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 가져올 옵션 미리보기 */}
          <div className="min-w-0 space-y-2">
            <p className="text-sm font-medium">
              {sourceProduct ? `${sourceProduct.name}의 옵션` : '가져올 옵션'}
            </p>
            <div className="h-72 overflow-y-auto rounded-lg border p-2 md:h-[19.25rem]">
              {sourceId == null ? (
                <p className="py-6 text-center text-sm text-muted-foreground">왼쪽에서 상품을 고르면 옵션이 여기에 표시됩니다.</p>
              ) : isLoadingSource ? (
                <p className="py-6 text-center text-sm text-muted-foreground">불러오는 중...</p>
              ) : sourceOptions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">이 상품에는 가져올 옵션이 없습니다.</p>
              ) : (
                <ol className="space-y-1.5">
                  {sourceOptions.map((po) => {
                    const alreadyConnected = connectedOptionIds.has(po.optionId)
                    return (
                      <li
                        key={po.id}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                          alreadyConnected ? 'text-muted-foreground' : ''
                        }`}
                      >
                        <span className={alreadyConnected ? '' : 'font-medium'}>{po.option?.name}</span>
                        {po.isRequired && (
                          <Badge variant="destructive" className="text-xs">필수</Badge>
                        )}
                        {alreadyConnected && (
                          <Badge variant="outline" className="ml-auto text-xs">이미 있음</Badge>
                        )}
                      </li>
                    )
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={() => importMutation.mutate()}
            disabled={!targetProduct || sourceId == null || isLoadingSource || newOptionCount === 0 || importMutation.isPending}
          >
            {sourceId != null && !isLoadingSource && sourceOptions.length > 0 && newOptionCount === 0
              ? '가져올 새 옵션 없음'
              : newOptionCount > 0
                ? `옵션 ${newOptionCount}개 가져오기`
                : '가져오기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
