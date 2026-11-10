import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { toast } from 'sonner'
import { optionService } from '@/services/optionService'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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

interface CopyProductOptionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 옵션을 복사할 원본 상품 */
  sourceProduct: Product | null
  /** 원본 상품에 연결된 옵션 (안내 문구용) */
  sourceOptions: readonly ProductOption[]
  /** 복사 대상 후보 상품 전체 */
  products: readonly Product[]
}

/**
 * 원본 상품의 옵션 구성(순서·필수 여부)을 다른 상품들에 복사하는 다이얼로그.
 * 대상 상품의 기존 옵션은 유지되고, 아직 연결되지 않은 옵션만 뒤에 추가됩니다.
 */
export function CopyProductOptionsDialog({
  open,
  onOpenChange,
  sourceProduct,
  sourceOptions,
  products,
}: CopyProductOptionsDialogProps) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const candidates = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    return products.filter(
      (p) =>
        p.id !== sourceProduct?.id &&
        (!keyword ||
          p.name.toLowerCase().includes(keyword) ||
          (p.category ?? '').toLowerCase().includes(keyword))
    )
  }, [products, sourceProduct, search])

  // 상품 종류별 묶음 (미분류는 마지막)
  const groups = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const category of getCategories(candidates)) map.set(category, [])
    for (const product of candidates) {
      map.get(product.category?.trim() || UNCATEGORIZED)?.push(product)
    }
    return [...map.entries()]
  }, [candidates])

  const copyMutation = useMutation({
    mutationFn: () => optionService.copyProductOptions(sourceProduct!.id, [...selectedIds]),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['product-options'] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
      const skipped = result.skippedCount > 0 ? ` (이미 있던 옵션 ${result.skippedCount}개는 건너뜀)` : ''
      toast.success(`상품 ${result.productCount}개에 옵션 ${result.addedCount}개를 연결했습니다${skipped}`)
      handleOpenChange(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '옵션 복사에 실패했습니다')
    },
  })

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSearch('')
      setSelectedIds(new Set())
    }
    onOpenChange(next)
  }

  const toggle = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // 그룹(또는 검색 결과 전체) 일괄 선택/해제
  const toggleMany = (ids: readonly number[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      const allSelected = ids.every((id) => next.has(id))
      for (const id of ids) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
  }

  const optionNames = sourceOptions.map((po) => po.option?.name).filter(Boolean).join(', ')
  const candidateIds = candidates.map((p) => p.id)
  const allCandidatesSelected = candidateIds.length > 0 && candidateIds.every((id) => selectedIds.has(id))

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>옵션 복사 - {sourceProduct?.name}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{optionNames}</span> 옵션을 선택한 상품에 연결합니다.
            대상 상품의 기존 옵션은 그대로 두고, 없는 옵션만 뒤에 추가됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="상품명 또는 종류 검색"
              className="pl-9"
            />
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex cursor-pointer items-center gap-2">
              <Checkbox
                checked={allCandidatesSelected}
                onCheckedChange={() => toggleMany(candidateIds)}
                disabled={candidateIds.length === 0}
              />
              {search.trim() ? '검색 결과 전체 선택' : '전체 선택'}
            </label>
            <span className="text-muted-foreground">{selectedIds.size}개 선택됨</span>
          </div>

          <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border p-2">
            {groups.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">복사할 수 있는 상품이 없습니다.</p>
            ) : (
              groups.map(([category, items]) => {
                const ids = items.map((p) => p.id)
                const groupSelected = ids.every((id) => selectedIds.has(id))
                return (
                  <div key={category}>
                    <label className="flex cursor-pointer items-center gap-2 px-2 py-1 text-xs font-semibold text-muted-foreground">
                      <Checkbox checked={groupSelected} onCheckedChange={() => toggleMany(ids)} />
                      {category} ({items.length})
                    </label>
                    {items.map((product) => (
                      <label
                        key={product.id}
                        className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 pl-6 text-sm hover:bg-muted/50"
                      >
                        <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggle(product.id)} />
                        {product.name}
                      </label>
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={() => copyMutation.mutate()}
            disabled={!sourceProduct || selectedIds.size === 0 || copyMutation.isPending}
          >
            {selectedIds.size > 0 ? `${selectedIds.size}개 상품에 복사` : '복사'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
