import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Building2, ChevronRight, CornerDownRight, Edit, Loader2, Plus, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
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
import { ClientCompanyFormDialog } from '@/components/features/client/ClientCompanyFormDialog'
import { ClientCompanyFiles } from '@/components/features/client/ClientCompanyFiles'
import { OrderListTable } from '@/components/features/order/OrderListTable'
import { clientCompanyService } from '@/services/clientCompanyService'
import type { ClientCompany } from '@/types'

/**
 * 회사(또는 브랜드) 상세 — 브랜드, 소속 고객, 주문, 파일
 */
export function ClientCompanyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const clientId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formTarget, setFormTarget] = useState<ClientCompany | null>(null)
  const [brandParent, setBrandParent] = useState<ClientCompany | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ClientCompany | null>(null)

  const { data: client, isLoading, error } = useQuery({
    queryKey: ['client-company', clientId],
    queryFn: () => clientCompanyService.getById(clientId),
    enabled: !!clientId,
  })

  const isBrand = client?.type === 'BRAND'

  const { data: parent } = useQuery({
    queryKey: ['client-company', client?.parentId],
    queryFn: () => clientCompanyService.getById(client!.parentId!),
    enabled: !!client?.parentId,
  })

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ['client-company-customers', clientId],
    queryFn: () => clientCompanyService.getCustomers(clientId),
    enabled: !!client && !isBrand,
  })

  const { data: ordersPage, isLoading: isOrdersLoading } = useQuery({
    queryKey: ['client-company-orders', clientId],
    queryFn: () => clientCompanyService.getOrders(clientId),
    enabled: !!client,
  })

  const deleteMutation = useMutation({
    mutationFn: (target: ClientCompany) => clientCompanyService.delete(target.id),
    onSuccess: (_, target) => {
      queryClient.invalidateQueries({ queryKey: ['client-companies'] })
      queryClient.invalidateQueries({ queryKey: ['client-company'] })
      setDeleteTarget(null)
      toast.success(`${target.type === 'BRAND' ? '브랜드' : '회사'}를 삭제했습니다.`)
      // 보고 있던 회사(브랜드) 자체를 지웠으면 목록/상위로 이동
      if (target.id === clientId) {
        navigate(target.parentId ? `/companies/${target.parentId}` : '/companies')
      }
    },
    onError: () => toast.error('삭제에 실패했습니다.'),
  })

  const openEdit = (target: ClientCompany) => {
    setFormTarget(target)
    setBrandParent(null)
    setIsFormOpen(true)
  }

  const openAddBrand = (company: ClientCompany) => {
    setFormTarget(null)
    setBrandParent(company)
    setIsFormOpen(true)
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <AlertTriangle className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">회사를 찾을 수 없습니다.</p>
        <Button variant="outline" onClick={() => navigate('/companies')}>목록으로 돌아가기</Button>
      </div>
    )
  }

  const orders = ordersPage?.content ?? []
  const brands = client.brands ?? []

  return (
    <div className="space-y-6">
      {/* 브레드크럼 */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link to="/companies" className="hover:text-foreground">회사 관리</Link>
        {parent && (
          <>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/companies/${parent.id}`} className="hover:text-foreground">{parent.name}</Link>
          </>
        )}
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground">{client.name}</span>
      </nav>

      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-bold">{client.name}</h1>
            <Badge variant="outline">{isBrand ? '브랜드' : '회사'}</Badge>
          </div>
          {client.memo && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{client.memo}</p>}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => openEdit(client)}>
            <Edit className="mr-1 h-4 w-4" />
            수정
          </Button>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(client)}>
            <Trash2 className="mr-1 h-4 w-4" />
            삭제
          </Button>
        </div>
      </div>

      {/* 브랜드 (회사일 때만) */}
      {!isBrand && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-medium">브랜드 {brands.length > 0 && <span className="text-muted-foreground">({brands.length})</span>}</CardTitle>
            <Button size="sm" variant="outline" onClick={() => openAddBrand(client)}>
              <Plus className="mr-1 h-4 w-4" />
              브랜드 추가
            </Button>
          </CardHeader>
          <CardContent>
            {brands.length === 0 ? (
              <p className="text-sm text-muted-foreground">등록된 브랜드가 없습니다. 한 회사에서 여러 브랜드로 주문하는 경우 추가하세요.</p>
            ) : (
              <ul className="divide-y rounded-md border">
                {brands.map((brand) => (
                  <li key={brand.id} className="flex items-center gap-2 px-3 py-2">
                    <CornerDownRight className="h-4 w-4 text-muted-foreground" />
                    <Link to={`/companies/${brand.id}`} className="flex-1 text-sm font-medium hover:underline">
                      {brand.name}
                    </Link>
                    {brand.memo && <span className="hidden max-w-xs truncate text-xs text-muted-foreground md:inline">{brand.memo}</span>}
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(brand)} aria-label={`${brand.name} 수정`}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleteTarget(brand)}
                      aria-label={`${brand.name} 삭제`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">주문 ({ordersPage?.totalElements ?? 0})</TabsTrigger>
          {!isBrand && <TabsTrigger value="customers">소속 고객 ({customers.length})</TabsTrigger>}
          <TabsTrigger value="files">파일</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4">
          <OrderListTable orders={orders} isLoading={isOrdersLoading} emptyText="이 회사의 주문이 없습니다." />
        </TabsContent>

        {!isBrand && (
          <TabsContent value="customers" className="mt-4">
            <div className="rounded-lg border bg-white">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>고객명</TableHead>
                    <TableHead>전화번호</TableHead>
                    <TableHead>이메일</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCustomersLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">로딩 중...</TableCell>
                    </TableRow>
                  ) : customers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-20 text-center text-muted-foreground">소속 고객이 없습니다.</TableCell>
                    </TableRow>
                  ) : (
                    customers.map((customer) => (
                      <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/customers/${customer.id}`)}>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone || '-'}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        )}

        <TabsContent value="files" className="mt-4">
          <ClientCompanyFiles clientCompanyId={client.id} />
        </TabsContent>
      </Tabs>

      <ClientCompanyFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} target={formTarget} parent={brandParent} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{deleteTarget?.type === 'BRAND' ? '브랜드' : '회사'} 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong>을(를) 목록에서 삭제합니다.
              {deleteTarget?.type === 'COMPANY' && ' 하위 브랜드도 함께 삭제됩니다.'} 이미 등록된 주문과 고객 정보는 유지됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
