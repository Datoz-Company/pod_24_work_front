import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronsUpDown, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { customerService } from '@/services/customerService'
import type { Customer } from '@/types'
import { toast } from 'sonner'

interface CustomerComboboxProps {
  value?: number
  onChange: (customerId: number | undefined, customer?: Customer) => void
  placeholder?: string
}

export function CustomerCombobox({
  value,
  onChange,
  placeholder = '고객을 검색하세요',
}: CustomerComboboxProps) {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: customerService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: customerService.create,
    onSuccess: (newCustomer) => {
      // 캐시에 새 고객을 즉시 추가하여 UI가 바로 반영되도록 함
      queryClient.setQueryData<Customer[]>(['customers', 'all'], (old = []) => [
        ...old,
        newCustomer,
      ])
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      onChange(newCustomer.id, newCustomer)
      setOpen(false)
      setSearchValue('')
      toast.success(`"${newCustomer.name}" 고객이 추가되었습니다.`)
    },
    onError: () => {
      toast.error('고객 추가에 실패했습니다.')
    },
  })

  const selectedCustomer = customers.find((c) => c.id === value)

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(searchValue.toLowerCase())
  )

  const exactMatch = customers.some(
    (customer) => customer.name.toLowerCase() === searchValue.toLowerCase()
  )

  const handleSelect = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId)
    if (value === customerId) {
      onChange(undefined, undefined)
    } else {
      onChange(customerId, customer)
    }
    setOpen(false)
    setSearchValue('')
  }

  const handleCreateCustomer = () => {
    if (!searchValue.trim()) return
    createMutation.mutate({ name: searchValue.trim() })
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedCustomer ? (
            selectedCustomer.name
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="고객명 검색..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                {filteredCustomers.length === 0 && !searchValue && (
                  <CommandEmpty>등록된 고객이 없습니다.</CommandEmpty>
                )}
                {filteredCustomers.length === 0 && searchValue && !exactMatch && (
                  <div className="p-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-primary"
                      onClick={handleCreateCustomer}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      "{searchValue}"(으)로 고객 추가하기
                    </Button>
                  </div>
                )}
                {filteredCustomers.length > 0 && (
                  <CommandGroup>
                    {filteredCustomers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={String(customer.id)}
                        onSelect={() => handleSelect(customer.id)}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            value === customer.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        <div className="flex flex-col">
                          <span>{customer.name}</span>
                          {customer.phone && (
                            <span className="text-xs text-muted-foreground">
                              {customer.phone}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
                {/* 검색 결과가 있지만 정확히 일치하는 것이 없을 때 추가 옵션 표시 */}
                {filteredCustomers.length > 0 && searchValue && !exactMatch && (
                  <div className="border-t p-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-primary"
                      onClick={handleCreateCustomer}
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                      "{searchValue}"(으)로 고객 추가하기
                    </Button>
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
