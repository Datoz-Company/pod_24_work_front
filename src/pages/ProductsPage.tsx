import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Search, Sliders, X } from 'lucide-react'
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
import type { Product, ProductCreateRequest } from '@/types'
import type { Option, ProductOptionItem } from '@/types/option'

export function ProductsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [selectedProductForOptions, setSelectedProductForOptions] = useState<Product | null>(null)
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
    },
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

  const handleDelete = (id: number) => {
    if (window.confirm('이 상품을 삭제하시겠습니까?')) {
      deleteMutation.mutate(id)
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
            placeholder="상품명, 카테고리로 검색"
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
                <TableHead>카테고리</TableHead>
                <TableHead>설명</TableHead>
                <TableHead className="w-32">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {product.description || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openOptionDialog(product)}
                        title="옵션 설정"
                      >
                        <Sliders className="h-4 w-4 text-blue-600" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                        title="수정"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(product.id)}
                        title="삭제"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
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
              <Label htmlFor="category">카테고리</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
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
    </div>
  )
}
