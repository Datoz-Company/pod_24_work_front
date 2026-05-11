import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, User, Phone, Loader2, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { customerService } from '@/services/customerService'
import { CustomerBasicInfo } from '@/components/features/customer/CustomerBasicInfo'
import { CustomerWorkOrderList } from '@/components/features/customer/CustomerWorkOrderList'
import { CustomerFileDrive } from '@/components/features/customer/CustomerFileDrive'

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const customerId = Number(id)

  const { data: customer, isLoading, error } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => customerService.getById(customerId),
    enabled: !!customerId,
  })

  const {
    data: workOrdersPage,
    isLoading: isWorkOrdersLoading,
    error: workOrdersError,
  } = useQuery({
    queryKey: ['customerWorkOrders', customerId],
    queryFn: () => customerService.getWorkOrders(customerId, 0, 100),
    enabled: !!customerId,
  })

  const workOrders = workOrdersPage?.content || []

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
        <Button variant="ghost" size="icon" onClick={() => navigate('/customers')}>
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
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="orders">주문 내역</TabsTrigger>
          <TabsTrigger value="files">파일 드라이브</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <div className="max-w-2xl">
            <CustomerBasicInfo customer={customer} />
          </div>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <CustomerWorkOrderList
            workOrders={workOrders}
            isLoading={isWorkOrdersLoading}
            error={workOrdersError as Error | null}
          />
        </TabsContent>

        <TabsContent value="files" className="mt-6">
          <CustomerFileDrive workOrders={workOrders} isLoading={isWorkOrdersLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
