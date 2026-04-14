import { useQuery } from '@tanstack/react-query'
import { User, Phone } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { customerService } from '@/services/customerService'
import { CustomerBasicInfo } from './CustomerBasicInfo'
import { CustomerWorkOrderList } from './CustomerWorkOrderList'
import { CustomerFileDrive } from './CustomerFileDrive'
import type { Customer } from '@/types'

interface CustomerDetailSheetProps {
  customer: Customer | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CustomerDetailSheet({
  customer,
  open,
  onOpenChange,
}: CustomerDetailSheetProps) {
  // 고객의 주문 내역 조회
  const {
    data: workOrdersPage,
    isLoading: isWorkOrdersLoading,
    error: workOrdersError,
  } = useQuery({
    queryKey: ['customerWorkOrders', customer?.id],
    queryFn: () => customerService.getWorkOrders(customer!.id, 0, 100),
    enabled: !!customer && open,
  })

  const workOrders = workOrdersPage?.content || []

  if (!customer) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <SheetTitle className="text-lg">{customer.name}</SheetTitle>
          </div>
          {customer.phone && (
            <SheetDescription className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5" />
              <a
                href={`tel:${customer.phone}`}
                className="hover:underline"
              >
                {customer.phone}
              </a>
            </SheetDescription>
          )}
        </SheetHeader>

        <Tabs defaultValue="info" className="mt-6">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">
              기본 정보
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex-1">
              주문 내역
            </TabsTrigger>
            <TabsTrigger value="files" className="flex-1">
              파일 드라이브
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(100vh-220px)] mt-4">
            <TabsContent value="info" className="m-0 pr-4">
              <CustomerBasicInfo customer={customer} />
            </TabsContent>

            <TabsContent value="orders" className="m-0 pr-4">
              <CustomerWorkOrderList
                workOrders={workOrders}
                isLoading={isWorkOrdersLoading}
                error={workOrdersError as Error | null}
              />
            </TabsContent>

            <TabsContent value="files" className="m-0 pr-4">
              <CustomerFileDrive
                workOrders={workOrders}
                isLoading={isWorkOrdersLoading}
              />
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
