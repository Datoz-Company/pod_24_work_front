import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, Phone, Loader2, AlertTriangle, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { customerService } from '@/services/customerService'
import { CustomerBasicInfo } from '@/components/features/customer/CustomerBasicInfo'
import { OrderListTable } from '@/components/features/order/OrderListTable'
import { ClientCompanyFiles } from '@/components/features/client/ClientCompanyFiles'
import { CustomerAddressBook } from '@/components/features/customer/CustomerAddressBook'
import { CustomerFormDialog } from '@/components/features/customer/CustomerFormDialog'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const customerId = Number(id)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerService.getById(customerId),
    enabled: !!customerId,
  })

  const { data: ordersPage, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => customerService.getOrders(customerId),
    enabled: !!customerId,
  })

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !customer) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">고객을 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => navigate('/customers')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          목록으로 돌아가기
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')} aria-label="고객 목록으로">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{customer.name}</h1>
          </div>
          {customer.phone && (
            <div className="flex items-center gap-1.5 text-muted-foreground mt-1">
              <Phone className="h-3.5 w-3.5" />
              <a href={`tel:${customer.phone}`} className="hover:underline">
                {customer.phone}
              </a>
            </div>
          )}
        </div>
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => setIsEditOpen(true)}>
          <Edit className="mr-1 h-4 w-4" />
          고객 수정
        </Button>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="orders">주문 내역 ({ordersPage?.totalElements ?? 0})</TabsTrigger>
          <TabsTrigger value="files">회사 파일</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="grid max-w-5xl gap-8 lg:grid-cols-2">
            <CustomerBasicInfo customer={customer} />
            <CustomerAddressBook customerId={customer.id} />
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <OrderListTable orders={ordersPage?.content ?? []} isLoading={isOrdersLoading} emptyText="이 고객의 주문이 없습니다." />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          {customer.clientCompanyId ? (
            <ClientCompanyFiles clientCompanyId={customer.clientCompanyId} />
          ) : (
            <p className="text-sm text-muted-foreground">소속 회사가 없어 파일 공간이 없습니다. 고객 수정에서 소속 회사를 지정하세요.</p>
          )}
        </TabsContent>
      </Tabs>

      <CustomerFormDialog open={isEditOpen} onOpenChange={setIsEditOpen} customer={customer} />
    </div>
  )
}
