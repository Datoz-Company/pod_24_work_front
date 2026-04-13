import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, X, ArrowRight } from 'lucide-react'
import { productService } from '@/services/productService'
import { processService } from '@/services/processService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Product } from '@/types'

export function ProductProcessesPage() {
  const queryClient = useQueryClient()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedProcessIds, setSelectedProcessIds] = useState<number[]>([])

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
  })

  const { data: allProcesses = [] } = useQuery({
    queryKey: ['processes'],
    queryFn: processService.getAll,
  })

  const updateMutation = useMutation({
    mutationFn: ({ productId, processIds }: { productId: number; processIds: number[] }) =>
      productService.updateProcesses(productId, processIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      toast.success('공정 설정이 저장되었습니다')
    },
    onError: () => {
      toast.error('공정 설정 저장에 실패했습니다')
    },
  })

  // 시스템 공정 ID 목록 (작업 전, 작업 완료)
  const systemProcessIds = allProcesses
    .filter((p) => p.isSystem)
    .map((p) => p.id)

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product)
    // 기존 공정 + 시스템 공정 필수 포함
    const productProcessIds = product.processes?.map((p) => p.id) || []
    const mergedIds = [...new Set([...systemProcessIds, ...productProcessIds])]
    // 시스템 공정 순서대로 정렬 (작업 전이 첫 번째, 작업 완료가 마지막)
    const sortedIds = mergedIds.sort((a, b) => {
      const processA = allProcesses.find((p) => p.id === a)
      const processB = allProcesses.find((p) => p.id === b)
      return (processA?.displayOrder || 0) - (processB?.displayOrder || 0)
    })
    setSelectedProcessIds(sortedIds)
  }

  const toggleProcess = (processId: number) => {
    // 시스템 공정은 해제 불가
    const process = allProcesses.find((p) => p.id === processId)
    if (process?.isSystem) return

    setSelectedProcessIds((prev) => {
      let newIds: number[]
      if (prev.includes(processId)) {
        newIds = prev.filter((id) => id !== processId)
      } else {
        newIds = [...prev, processId]
      }
      // 시스템 공정 순서 유지하며 정렬
      return newIds.sort((a, b) => {
        const processA = allProcesses.find((p) => p.id === a)
        const processB = allProcesses.find((p) => p.id === b)
        return (processA?.displayOrder || 0) - (processB?.displayOrder || 0)
      })
    })
  }

  const handleSave = () => {
    if (!selectedProduct) return
    updateMutation.mutate({
      productId: selectedProduct.id,
      processIds: selectedProcessIds,
    })
  }

  const hasChanges = () => {
    if (!selectedProduct) return false
    // products 배열에서 최신 데이터 참조 (저장 후 갱신된 데이터 반영)
    const currentProduct = products.find((p) => p.id === selectedProduct.id)
    const originalIds = currentProduct?.processes?.map((p) => p.id) || []
    if (originalIds.length !== selectedProcessIds.length) return true
    return !originalIds.every((id) => selectedProcessIds.includes(id))
  }

  return (
    <div className="flex h-full">
      {/* 상품 목록 */}
      <div className="w-80 border-r bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">상품 목록</h2>
        </div>
        <div className="space-y-1 p-2">
          {products.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelectProduct(product)}
              className={cn(
                'w-full rounded-lg p-3 text-left transition-colors',
                selectedProduct?.id === product.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              )}
            >
              <div className="font-medium">{product.name}</div>
              <div className="mt-1 text-sm opacity-80">
                {product.processes?.length || 0}개 공정
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 공정 설정 영역 */}
      <div className="flex-1 p-6">
        {selectedProduct ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">
                {selectedProduct.name} - 공정 설정
              </h1>
              <Button
                onClick={handleSave}
                disabled={!hasChanges() || updateMutation.isPending}
              >
                {updateMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">공정 선택</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {allProcesses.map((process) => {
                    const isSelected = selectedProcessIds.includes(process.id)
                    const order = selectedProcessIds.indexOf(process.id) + 1
                    const isSystem = process.isSystem

                    return (
                      <button
                        key={process.id}
                        onClick={() => toggleProcess(process.id)}
                        disabled={isSystem}
                        className={cn(
                          'relative rounded-lg border-2 p-4 text-left transition-all',
                          isSelected
                            ? 'border-primary bg-primary/5'
                            : 'border-muted hover:border-primary/50',
                          isSystem && 'cursor-not-allowed opacity-80'
                        )}
                      >
                        {isSelected && (
                          <Badge className="absolute -right-2 -top-2">
                            {order}
                          </Badge>
                        )}
                        <div
                          className="mb-2 h-3 w-8 rounded"
                          style={{ backgroundColor: process.color }}
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{process.name}</span>
                          {isSystem && (
                            <Badge variant="secondary" className="text-xs">
                              필수
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1">
                          {isSelected ? (
                            <Check className="h-4 w-4 text-primary" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {selectedProcessIds.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">공정 순서 미리보기</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedProcessIds.map((processId, index) => {
                      const process = allProcesses.find((p) => p.id === processId)
                      if (!process) return null

                      return (
                        <div key={processId} className="flex items-center gap-2">
                          <Badge
                            style={{ backgroundColor: process.color }}
                            className="text-white"
                          >
                            {index + 1}. {process.name}
                          </Badge>
                          {index < selectedProcessIds.length - 1 && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            좌측에서 상품을 선택하세요
          </div>
        )}
      </div>
    </div>
  )
}
