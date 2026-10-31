import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Building2, CornerDownRight, Plus, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ClientCompanyFormDialog } from '@/components/features/client/ClientCompanyFormDialog'
import { clientCompanyService } from '@/services/clientCompanyService'

/**
 * 회사 관리 — 고객 → 회사 → 브랜드 3단계 중 회사·브랜드 목록
 */
export function ClientCompaniesPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)

  const { data: companies = [], isLoading } = useQuery({
    queryKey: ['client-companies'],
    queryFn: clientCompanyService.getTree,
  })

  const keyword = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!keyword) return companies
    return companies.filter(
      (company) =>
        company.name.toLowerCase().includes(keyword) ||
        (company.brands ?? []).some((brand) => brand.name.toLowerCase().includes(keyword))
    )
  }, [companies, keyword])

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">회사 관리</h1>
          <p className="text-sm text-muted-foreground">주문은 회사(또는 브랜드)에 연결되고, 로고 등 파일도 회사 단위로 관리합니다.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          회사 추가
        </Button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="회사 또는 브랜드명으로 검색" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="rounded-lg border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-64">회사</TableHead>
              <TableHead>브랜드</TableHead>
              <TableHead>메모</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">로딩 중...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  {keyword ? '검색 결과가 없습니다.' : '등록된 회사가 없습니다.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((company) => (
                <TableRow key={company.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/companies/${company.id}`)}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {company.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    {(company.brands ?? []).length === 0 ? (
                      <span className="text-sm text-muted-foreground">-</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {(company.brands ?? []).map((brand) => (
                          <Badge key={brand.id} variant="secondary" className="gap-1 font-normal">
                            <CornerDownRight className="h-3 w-3" />
                            {brand.name}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-muted-foreground">{company.memo || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ClientCompanyFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSaved={(saved) => navigate(`/companies/${saved.id}`)}
      />
    </div>
  )
}
