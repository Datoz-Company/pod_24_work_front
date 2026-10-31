import { Fragment, useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Search, Sliders, X, Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { productService } from '@/services/productService'
import { optionService } from '@/services/optionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { CategoryCombobox } from '@/components/features/product/CategoryCombobox'
import { getCategories, UNCATEGORIZED } from '@/components/features/order/OrderItemCard'
import type { Product, ProductCreateRequest } from '@/types'
import type { Option, ProductOptionItem } from '@/types/option'

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null)
  const [renameTarget, setRenameTarget] = useState<string | null>(null)
  const [renameTo, setRenameTo] = useState('')
  const [formData, setFormData] = useState<ProductCreateRequest>({
    name: '',
    category: '',
    description: '',
  })

  // 상품 목록 조회
  const { data: response, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productService.getPage(0, 100, search || undefined),
  })

  const products = response?.content || []

  // 종류 목록은 검색과 무관하게 전체 상품 기준
  const { data: allProducts = [] } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: productService.getAll,
  })
  const categories = useMemo(() => getCategories(allProducts).filter((c) => c !== UNCATEGORIZED), [allProducts])

  // 상품 종류별 묶음 (미분류는 마지막)
  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>()
    for (const category of getCategories(products)) groups.set(category, [])
    for (const product of products) {
      groups.get(product.category?.trim() || UNCATEGORIZED)?.push(product)
    }
    return [...groups.entries()]
  }, [products])

  // 전역 옵션 목록 조회
  const { data: allOptions = [] } = useQuery({
    queryKey: ['options'],
    queryFn: optionService.getAll,
  })

  // 선택된 상품의 옵션 조회
  const { data: productOptions = [], isLoading: isLoadingProductOptions } = useQuery({
    queryKey: ['product-options', selectedProductForOptions?.id],
    queryFn: () => optionService.getProductOptions(selectedProductForOptions!.id),
    enabled: !!selectedProductForOptions,
  })

  // 상품 CRUD Mutations
  const createMutation = useMutation({
    mutationFn: productService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductCreateRequest }) =>
      productService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: productService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setDeleteTarget(null)
      toast.success('상품을 삭제했습니다.')
    },
    onError: () => toast.error('상품 삭제에 실패했습니다.'),
  })

  const renameMutation = useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => productService.renameCategory(from, to),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      setRenameTarget(null)
      toast.success(`상품 ${count}개의 종류를 변경했습니다.`)
    },
    onError: () => toast.error('상품 종류 변경에 실패했습니다.'),
  })

  // 상품 옵션 설정 Mutation
  const updateProductOptionsMutation = useMutation({
    mutationFn: ({ productId, options }: { productId: number; options: ProductOptionItem[] }) =>
      optionService.updateProductOptions(productId, { options }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-options', selectedProductForOptions?.id] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
  })

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingProduct(null)
    setFormData({ name: '', category: '', description: '' })
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      category: product.category || '',
      description: product.description || '',
    })
    setIsDialogOpen(true)
  }

  const openOptionDialog = (product: Product) => {
    setSelectedProductForOptions(product)
    setIsOptionDialogOpen(true)
  }

  const closeOptionDialog = () => {
    setIsOptionDialogOpen(false)
    setSelectedProductForOptions(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  // 옵션 추가
  const handleAddOption = (option: Option) => {
    if (!selectedProductForOptions) return

    const currentOptions = productOptions.map((po) => ({
      optionId: po.optionId,
      displayOrder: po.displayOrder,
      isRequired: po.isRequired,
    }))

    // 이미 연결된 옵션인지 확인
    if (currentOptions.some((o) => o.optionId === option.id)) return

    const newOptions: ProductOptionItem[] = [
      ...currentOptions,
      {
        optionId: option.id,
        displayOrder: currentOptions.length + 1,
        isRequired: false,
      },
    ]

    updateProductOptionsMutation.mutate({
      productId: selectedProductForOptions.id,
      options: newOptions,
    })
  }

  // 옵션 제거
  const handleRemoveOption = (optionId: number) => {
    if (!selectedProductForOptions) return

    const newOptions = productOptions
      .filter((po) => po.optionId !== optionId)
      .map((po, idx) => ({
        optionId: po.optionId,
        displayOrder: idx + 1,
        isRequired: po.isRequired,
      }))

    updateProductOptionsMutation.mutate({
      productId: selectedProductForOptions.id,
      options: newOptions,
    })
  }

  // 필수 여부 토글
  const handleToggleRequired = (optionId: number) => {
    if (!selectedProductForOptions) return

    const newOptions = productOptions.map((po) => ({
      optionId: po.optionId,
      displayOrder: po.displayOrder,
      isRequired: po.optionId === optionId ? !po.isRequired : po.isRequired,
    }))

    updateProductOptionsMutation.mutate({
      productId: selectedProductForOptions.id,
      options: newOptions,
    })
  }

  // 연결되지 않은 옵션 필터링
  const availableOptions = allOptions.filter(
    (option) => !productOptions.some((po) => po.optionId === option.id)
  )

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">상품 관리</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          상품 추가
        </Button>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="상품명, 상품 종류로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">로딩 중...</div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>상품명</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-32">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedProducts.map(([category, items]) => (
                <Fragment key={category}>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableCell colSpan={3} className="py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{category}</span>
                        <Badge variant="secondary">{items.length}</Badge>
                        {category !== UNCATEGORIZED && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-muted-foreground"
                            onClick={() => {
                              setRenameTarget(category)
                              setRenameTo(category)
                            }}
                          >
                            <Pencil className="mr-1 h-3 w-3" />
                            종류 이름 변경
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {items.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="pl-6 font-medium">{product.name}</TableCell>
                      <TableCell className="max-w-xs truncate">{product.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openOptionDialog(product)} title="옵션 설정" aria-label="옵션 설정">
                            <Sliders className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(product)} title="수정" aria-label="수정">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(product)} title="삭제" aria-label="삭제">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    상품이 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* 상품 추가/수정 다이얼로그 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? '상품 수정' : '새 상품 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">상품명 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label>상품 종류</Label>
              <CategoryCombobox
                value={formData.category ?? ''}
                onChange={(category) => setFormData({ ...formData, category })}
                categories={categories}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingProduct ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 옵션 설정 다이얼로그 */}
      <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              옵션 설정 - {selectedProductForOptions?.name}
            </DialogTitle>
          </DialogHeader>

          {isLoadingProductOptions ? (
            <div className="py-8 text-center text-muted-foreground">로딩 중...</div>
          ) : (
            <div className="space-y-4">
              {/* 연결된 옵션 목록 */}
              <div>
                <Label className="text-sm font-medium">연결된 옵션</Label>
                {productOptions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    연결된 옵션이 없습니다. 아래에서 옵션을 추가하세요.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {productOptions.map((po) => (
                      <div
                        key={po.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{po.option?.name}</span>
                          {po.isRequired && (
                            <Badge variant="destructive" className="text-xs">
                              필수
                            </Badge>
                          )}
                          <Badge variant="secondary" className="text-xs">
                            {po.option?.optionType}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRequired(po.optionId)}
                            disabled={updateProductOptionsMutation.isPending}
                          >
                            {po.isRequired ? '선택으로 변경' : '필수로 변경'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveOption(po.optionId)}
                            disabled={updateProductOptionsMutation.isPending}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* 추가 가능한 옵션 목록 */}
              <div>
                <Label className="text-sm font-medium">추가 가능한 옵션</Label>
                {availableOptions.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">
                    추가 가능한 옵션이 없습니다. 옵션 관리에서 새 옵션을 생성하세요.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                    {availableOptions.map((option) => (
                      <div
                        key={option.id}
                        className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <span>{option.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {option.optionType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            ({option.attributes.length}개 속성)
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAddOption(option)}
                          disabled={updateProductOptionsMutation.isPending}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          추가
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={closeOptionDialog}>
              완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 상품 삭제 확인 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>상품 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> 상품을 삭제하시겠습니까? 이미 등록된 주문·작업은 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 상품 종류 이름 변경 — 같은 이름의 종류가 있으면 합쳐짐 */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>상품 종류 이름 변경</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-category">"{renameTarget}"의 새 이름</Label>
            <Input id="rename-category" value={renameTo} onChange={(e) => setRenameTo(e.target.value)} autoFocus />
            <p className="text-xs text-muted-foreground">
              이미 있는 종류 이름을 입력하면 두 종류가 하나로 합쳐집니다. 비워두면 미분류로 옮겨집니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)}>취소</Button>
            <Button
              onClick={() => renameTarget && renameMutation.mutate({ from: renameTarget, to: renameTo.trim() })}
              disabled={renameMutation.isPending || renameTo.trim() === renameTarget}
            >
              변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
