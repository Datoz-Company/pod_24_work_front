import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { ChevronRight, Loader2, Lock, Paperclip, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CustomerCombobox } from '@/components/features/customer/CustomerCombobox'
import { ClientCompanyCombobox } from '@/components/features/client/ClientCompanyCombobox'
import { ShippingSection } from '@/components/features/order/ShippingSection'
import { OrderItemCard, createEmptyOrderItem, UNCATEGORIZED, type OrderItemFormData } from '@/components/features/order/OrderItemCard'
import { formatFileSize } from '@/components/features/order/OrderFilesPanel'
import { FileUploader } from '@/components/features/attachment/FileUploader'
import { orderService } from '@/services/orderService'
import { productService } from '@/services/productService'
import { workOrderService } from '@/services/workOrderService'
import { orderAttachmentService } from '@/services/orderAttachmentService'
import { useCanViewQuotes } from '@/lib/permissions'
import { cn } from '@/lib/utils'
import {
  ORDER_SOURCE_LABELS,
  type Customer,
  type OrderCreateRequest,
  type OrderFileCategory,
  type OrderSource,
  type ShippingInfo,
  type ShippingMethod,
} from '@/types'

const ORDER_SOURCES = Object.keys(ORDER_SOURCE_LABELS) as OrderSource[]

// <input type="date"> 값 ↔ 서버 LocalDateTime (시간대 변환 없이 자정으로 고정)
const toDateInput = (value?: string) => (value ? format(new Date(value), 'yyyy-MM-dd') : '')
const fromDateInput = (value: string) => (value ? `${value}T00:00:00` : undefined)

interface PendingFile {
  category: OrderFileCategory
  file: File
}

/**
 * 주문 등록 / 수정 페이지 (기존 다이얼로그 대체)
 * 순서는 기획 와이어프레임 기준: 주문 경로 → 품목 → 주문자 → 회사/상호 → 일정·메모 → 파일 → 출고·배송
 */
export function OrderFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = !!id
  const orderId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const canViewQuotes = useCanViewQuotes()

  const [orderName, setOrderName] = useState('')
  const [orderSource, setOrderSource] = useState<OrderSource | undefined>()
  const [customer, setCustomer] = useState<Customer | undefined>()
  const [customerId, setCustomerId] = useState<number | undefined>()
  const [clientCompanyId, setClientCompanyId] = useState<number | undefined>()
  const [orderDate, setOrderDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [dueDate, setDueDate] = useState('')
  const [memo, setMemo] = useState('')
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod | undefined>()
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({})
  const [items, setItems] = useState<OrderItemFormData[]>([createEmptyOrderItem()])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { data: products = [] } = useQuery({
    queryKey: ['products', 'with-processes'],
    queryFn: productService.getAllWithProcesses,
  })

  const { data: existingOrder, isLoading: isLoadingOrder } = useQuery({
    queryKey: ['order', orderId],
    queryFn: () => orderService.getById(orderId),
    enabled: isEdit,
  })

  // 수정 모드: 기존 값 채우기
  useEffect(() => {
    if (!existingOrder) return
    setOrderName(existingOrder.orderName)
    setOrderSource(existingOrder.orderSource)
    setCustomer(existingOrder.customer)
    setCustomerId(existingOrder.customer?.id)
    setClientCompanyId(existingOrder.clientCompany?.id)
    setOrderDate(toDateInput(existingOrder.orderDate))
    setDueDate(toDateInput(existingOrder.dueDate))
    setMemo(existingOrder.memo ?? '')
    setShippingMethod(existingOrder.shippingMethod)
    setShippingInfo(existingOrder.shippingInfo ?? {})
  }, [existingOrder])

  const handleCustomerChange = (nextId: number | undefined, nextCustomer?: Customer) => {
    setCustomerId(nextId)
    setCustomer(nextCustomer)
    // 회사가 비어 있으면 고객의 소속 회사로 채움
    if (nextCustomer?.clientCompanyId && !clientCompanyId) {
      setClientCompanyId(nextCustomer.clientCompanyId)
    }
  }

  const updateItem = (key: string, patch: Partial<OrderItemFormData>) => {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const addItem = () => {
    setItems((prev) => [...prev.map((item) => ({ ...item, isExpanded: false })), createEmptyOrderItem()])
  }

  const getItemLabel = (item: OrderItemFormData): string => {
    if (item.itemName.trim()) return item.itemName.trim()
    return products.find((p) => p.id === item.productId)?.name ?? ''
  }

  // 주문명 미입력 시 자동 생성: "{주문자} {첫 품목} 외 N건"
  const autoOrderName = useMemo(() => {
    const first = items.find((item) => item.productId > 0)
    const firstLabel = first ? getItemLabel(first) : ''
    const prefix = customer?.name ?? ''
    const extra = items.length > 1 ? ` 외 ${items.length - 1}건` : ''
    return [prefix, firstLabel].filter(Boolean).join(' ') + (firstLabel ? extra : '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, customer, products])

  const buildOrderRequest = (): OrderCreateRequest => ({
    orderName: orderName.trim() || autoOrderName || '새 주문',
    customerId,
    clientCompanyId,
    orderSource,
    shippingMethod,
    shippingInfo,
    orderDate: fromDateInput(orderDate),
    dueDate: fromDateInput(dueDate),
    memo,
  })

  const validateItems = (): boolean => {
    for (const [index, item] of items.entries()) {
      if (!item.productId) {
        toast.error(`품목 ${index + 1}의 상품을 선택해주세요.`)
        return false
      }
      const product = products.find((p) => p.id === item.productId)
      const hasProcess = product?.processes?.some((p) => !p.isSystem)
      if (!hasProcess) {
        toast.error(`"${product?.name}" 상품에 공정이 설정되어 있지 않습니다.`)
        return false
      }
    }
    return true
  }

  const handleSubmit = async () => {
    if (!isEdit && !validateItems()) return
    setIsSubmitting(true)
    try {
      if (isEdit) {
        await orderService.update(orderId, buildOrderRequest())
        toast.success('주문을 수정했습니다.')
        queryClient.invalidateQueries({ queryKey: ['order', orderId] })
        queryClient.invalidateQueries({ queryKey: ['orders'] })
        queryClient.invalidateQueries({ queryKey: ['kanban'] })
        navigate(`/orders/${orderId}`)
        return
      }

      const order = await orderService.create(buildOrderRequest())
      for (const item of items) {
        await workOrderService.create({
          orderName: getItemLabel(item),
          productId: item.productId,
          customerId,
          orderId: order.id,
          quantity: item.quantity,
          dueDate: fromDateInput(dueDate),
          options: item.options.length > 0 ? item.options : undefined,
          processIds: item.processIds.length > 0 ? item.processIds : undefined,
        })
      }
      for (const pending of pendingFiles) {
        await orderAttachmentService.upload(order.id, pending.category, pending.file)
      }

      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['kanban'] })
      toast.success(`주문을 등록했습니다. (품목 ${items.length}건)`)
      navigate(`/orders/${order.id}`)
    } catch (error) {
      console.error(error)
      toast.error(isEdit ? '주문 수정에 실패했습니다.' : '주문 등록 중 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isEdit && isLoadingOrder) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const renderPendingFiles = (category: OrderFileCategory) => {
    const files = pendingFiles.filter((p) => p.category === category)
    if (files.length === 0) return null
    return (
      <ul className="space-y-1">
        {files.map((pending) => (
          <li key={`${pending.file.name}-${pending.file.lastModified}`} className="flex items-center justify-between rounded border bg-muted/30 px-2 py-1.5">
            <span className="min-w-0 truncate text-xs">{pending.file.name} · {formatFileSize(pending.file.size)}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => setPendingFiles((prev) => prev.filter((p) => p !== pending))}
              aria-label={`${pending.file.name} 제거`}
            >
              <X className="h-3 w-3" />
            </Button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 헤더 */}
      <div className="space-y-1">
        <nav className="flex items-center gap-1 text-sm text-muted-foreground">
          <Link to="/orders" className="hover:text-foreground">주문 관리</Link>
          <ChevronRight className="h-3 w-3" />
          {isEdit ? (
            <>
              <Link to={`/orders/${orderId}`} className="hover:text-foreground">주문 상세</Link>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">주문 수정</span>
            </>
          ) : (
            <span className="text-foreground">새 주문 등록</span>
          )}
        </nav>
        <h1 className="text-2xl font-bold">{isEdit ? `주문 수정 · ${existingOrder?.orderNumber ?? ''}` : '새 주문 등록'}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-6">
          {/* 주문 경로 */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">주문 경로</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {ORDER_SOURCES.map((source) => (
                <button
                  key={source}
                  type="button"
                  onClick={() => setOrderSource(orderSource === source ? undefined : source)}
                  aria-pressed={orderSource === source}
                  className={cn(
                    'rounded-md border px-4 py-1.5 text-sm transition-colors',
                    orderSource === source
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  )}
                >
                  {ORDER_SOURCE_LABELS[source]}
                </button>
              ))}
            </CardContent>
          </Card>

          {/* 품목 (등록 시에만 — 수정은 주문 상세의 작업 탭에서) */}
          {!isEdit && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold">품목 <span className="text-sm font-normal text-muted-foreground">{items.length}건</span></h2>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-4 w-4" />
                  품목 추가
                </Button>
              </div>
              {products.length === 0 && (
                <p className="text-sm text-muted-foreground">등록된 상품이 없습니다. 상품 관리에서 먼저 상품을 등록하세요.</p>
              )}
              {items.map((item, index) => (
                <OrderItemCard
                  key={item.key}
                  item={item}
                  index={index}
                  products={products}
                  canDelete={items.length > 1}
                  onChange={(patch) => updateItem(item.key, patch)}
                  onRemove={() => setItems((prev) => prev.filter((i) => i.key !== item.key))}
                />
              ))}
              {products.some((p) => !p.category) && (
                <p className="text-xs text-muted-foreground">카테고리가 없는 상품은 "{UNCATEGORIZED}"에 표시됩니다.</p>
              )}
            </section>
          )}

          {/* 주문자 · 회사 · 일정 */}
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">주문 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>주문자</Label>
                  <CustomerCombobox value={customerId} onChange={handleCustomerChange} placeholder="이름으로 검색 또는 새로 추가" />
                  <p className="text-xs text-muted-foreground">이름만 등록하고 연락처는 고객 관리에서 추가할 수 있습니다.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>회사 또는 상호명</Label>
                  <ClientCompanyCombobox value={clientCompanyId} onChange={setClientCompanyId} />
                  <p className="text-xs text-muted-foreground">비워두면 주문자의 소속 회사로 저장됩니다.</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-name">주문명</Label>
                <Input
                  id="order-name"
                  value={orderName}
                  onChange={(e) => setOrderName(e.target.value)}
                  placeholder={autoOrderName ? `비워두면 "${autoOrderName}"` : '주문명을 입력하세요'}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="order-date">주문일</Label>
                  <Input id="order-date" type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="due-date">납기일 (출고 예정일)</Label>
                  <Input id="due-date" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="order-memo">메모</Label>
                <Textarea id="order-memo" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="주문에 대한 메모를 입력하세요" />
              </div>
            </CardContent>
          </Card>

          {/* 파일 (등록 시 대기 목록 → 저장 후 업로드) */}
          {!isEdit && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">파일</CardTitle></CardHeader>
              <CardContent className="grid gap-6 sm:grid-cols-2">
                {canViewQuotes && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-amber-600" />견적서</Label>
                    <p className="text-xs text-muted-foreground">대표·디자인실장만 볼 수 있습니다.</p>
                    <FileUploader compact onUpload={async (file) => setPendingFiles((prev) => [...prev, { category: 'QUOTE', file }])} />
                    {renderPendingFiles('QUOTE')}
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1.5"><Paperclip className="h-3.5 w-3.5" />주문 · 디자인 파일</Label>
                  <p className="text-xs text-muted-foreground">Excel, AI 등 모든 형식 가능</p>
                  <FileUploader compact onUpload={async (file) => setPendingFiles((prev) => [...prev, { category: 'DESIGN', file }])} />
                  {renderPendingFiles('DESIGN')}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* 출고 · 배송 */}
        <aside className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">출고 · 배송</CardTitle></CardHeader>
            <CardContent>
              <ShippingSection
                shippingMethod={shippingMethod}
                onShippingMethodChange={setShippingMethod}
                shippingInfo={shippingInfo}
                onShippingInfoChange={setShippingInfo}
                customer={customer}
              />
            </CardContent>
          </Card>
        </aside>
      </div>

      <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-white/95 py-4 backdrop-blur">
        <Button variant="outline" onClick={() => navigate(isEdit ? `/orders/${orderId}` : '/orders')} disabled={isSubmitting}>
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isEdit ? '수정 저장' : '주문 등록'}
        </Button>
      </div>
    </div>
  )
}
