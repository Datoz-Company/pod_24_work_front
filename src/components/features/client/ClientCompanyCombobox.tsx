import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Plus, Loader2, CornerDownRight } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandInput,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { clientCompanyService } from '@/services/clientCompanyService'
import type { ClientCompany } from '@/types'

const QUERY_KEY = ['client-companies']

interface ClientCompanyComboboxProps {
  value?: number
  onChange: (clientCompanyId: number | undefined) => void
  placeholder?: string
  className?: string
}

/**
 * 고객사(회사 / 브랜드) 선택 — 회사 아래에 브랜드를 들여쓰기로 표시
 * - 검색어로 새 회사 추가
 * - 선택된 회사 아래에 새 브랜드 추가
 */
export function ClientCompanyCombobox({
  value,
  onChange,
  placeholder = '회사 또는 상호명을 선택하세요',
  className,
}: ClientCompanyComboboxProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const { data: companies = [], isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: clientCompanyService.getTree,
  })

  // 회사·브랜드를 한 목록으로 펼쳐서 선택값 조회
  const flatList = useMemo(() => {
    const list: ClientCompany[] = []
    for (const company of companies) {
      list.push(company)
      for (const brand of company.brands ?? []) {
        list.push(brand)
      }
    }
    return list
  }, [companies])

  const selected = flatList.find((c) => c.id === value)
  // 브랜드 추가 대상: 선택된 회사 (브랜드가 선택된 경우 상위 회사)
  const parentForBrand = selected
    ? selected.type === 'BRAND'
      ? companies.find((c) => c.id === selected.parentId)
      : selected
    : undefined

  const keyword = searchValue.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!keyword) return companies
    const result: ClientCompany[] = []
    for (const company of companies) {
      const brands = (company.brands ?? []).filter((b) => b.name.toLowerCase().includes(keyword))
      if (company.name.toLowerCase().includes(keyword) || brands.length > 0) {
        result.push({ ...company, brands: company.name.toLowerCase().includes(keyword) ? company.brands : brands })
      }
    }
    return result
  }, [companies, keyword])

  const exactMatch = flatList.some((c) => c.name.toLowerCase() === keyword)

  const createMutation = useMutation({
    mutationFn: clientCompanyService.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      onChange(created.id)
      setOpen(false)
      setSearchValue('')
      toast.success(`"${created.displayName}" ${created.type === 'BRAND' ? '브랜드' : '회사'}를 추가했습니다.`)
    },
    onError: () => toast.error('고객사 추가에 실패했습니다.'),
  })

  const handleSelect = (id: number) => {
    onChange(value === id ? undefined : id)
    setOpen(false)
    setSearchValue('')
  }

  const renderItem = (client: ClientCompany, isBrand: boolean) => (
    <CommandItem key={client.id} value={String(client.id)} onSelect={() => handleSelect(client.id)}>
      <Check className={cn('mr-2 h-4 w-4', value === client.id ? 'opacity-100' : 'opacity-0')} />
      {isBrand && <CornerDownRight className="mr-1 h-3 w-3 text-muted-foreground" />}
      <span className={cn(isBrand && 'text-sm')}>{client.name}</span>
      {isBrand && <span className="ml-auto text-[10px] text-muted-foreground">브랜드</span>}
    </CommandItem>
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between font-normal', className)}
        >
          {selected ? selected.displayName : <span className="text-muted-foreground">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="회사 / 브랜드 검색..." value={searchValue} onValueChange={setSearchValue} />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {filtered.length === 0 && !keyword && <CommandEmpty>등록된 회사가 없습니다.</CommandEmpty>}
                {filtered.length > 0 && (
                  <CommandGroup>
                    {filtered.map((company) => (
                      <div key={company.id}>
                        {renderItem(company, false)}
                        {(company.brands ?? []).map((brand) => renderItem(brand, true))}
                      </div>
                    ))}
                  </CommandGroup>
                )}
                {keyword && !exactMatch && (
                  <div className="space-y-1 border-t p-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-primary"
                      onClick={() => createMutation.mutate({ name: searchValue.trim() })}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      "{searchValue.trim()}" 회사 추가
                    </Button>
                    {parentForBrand && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-primary"
                        onClick={() => createMutation.mutate({ name: searchValue.trim(), parentId: parentForBrand.id })}
                        disabled={createMutation.isPending}
                      >
                        <CornerDownRight className="h-4 w-4" />
                        "{parentForBrand.name}" 아래 브랜드로 추가
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
