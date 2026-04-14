import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, Search } from 'lucide-react'
import { customerService } from '@/services/customerService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { CustomerDetailSheet } from '@/components/features/customer/CustomerDetailSheet'
import type { Customer, CustomerCreateRequest } from '@/types'

export function CustomersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<CustomerCreateRequest>({
    name: '',
    phone: '',
    email: '',
    address: '',
    memo: '',
  })

  const { data: response, isLoading } = useQuery({
    queryKey: ['customers', search],
    queryFn: () => customerService.getPage(0, 100, search || undefined),
  })

  const customers = response?.content || []

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: CustomerCreateRequest }) =>
      customerService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: customerService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCustomer(null)
    setFormData({ name: '', phone: '', email: '', address: '', memo: '' })
  }

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer)
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      memo: customer.memo || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingCustomer) {
      updateMutation.mutate({ id: editingCustomer.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (id: number) => {
    if (window.confirm('이 고객을 삭제하시겠습니까?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">고객 관리</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          고객 추가
        </Button>
      </div>

      <div className="mb-4 flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="이름, 전화번호, 이메일로 검색"
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
                <TableHead>고객명</TableHead>
                <TableHead>전화번호</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>주소</TableHead>
                <TableHead className="w-24">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow
                  key={customer.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>{customer.phone || '-'}</TableCell>
                  <TableCell>{customer.email || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {customer.address || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditDialog(customer)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(customer.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    고객이 없습니다
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCustomer ? '고객 수정' : '새 고객 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">고객명 *</Label>
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
              <Label htmlFor="phone">전화번호</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">주소</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="memo">메모</Label>
              <Input
                id="memo"
                value={formData.memo}
                onChange={(e) =>
                  setFormData({ ...formData, memo: e.target.value })
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button type="submit">
                {editingCustomer ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 고객 상세 Sheet */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
      />
    </div>
  )
}
