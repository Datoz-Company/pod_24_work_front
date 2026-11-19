import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { filterByName } from '@/lib/search'
import type { Product } from '@/types'

const UNCATEGORIZED_LABEL = '미분류'

interface ProductComboboxProps {
  /** 선택된 상품 ID (0 이면 미선택) */
  value: number
  onChange: (product: Product) => void
  /** 검색 대상 상품 목록 */
  products: readonly Product[]
  /** 목록에 상품 종류를 같이 표시 (여러 종류가 섞여 있을 때 같은 이름 구분용) */
  showCategory?: boolean
  placeholder?: string
  disabled?: boolean
}

/**
 * 상품명으로 검색해서 고르는 상품 선택 콤보박스.
 */
export function ProductCombobox({
  value,
  onChange,
  products,
  showCategory = false,
  placeholder = '상품 검색 또는 선택',
  disabled = false,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectedProduct = products.find((p) => p.id === value)
  const filteredProducts = filterByName(products, search)

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) setSearch('')
  }

  const select = (product: Product) => {
    onChange(product)
    handleOpenChange(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selectedProduct ? (
            <span className="truncate">{selectedProduct.name}</span>
          ) : (
            <span className="truncate text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="상품명 검색..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {products.length === 0 ? '등록된 상품이 없습니다.' : `"${search.trim()}"에 맞는 상품이 없습니다.`}
            </CommandEmpty>
            {filteredProducts.length > 0 && (
              <CommandGroup>
                {filteredProducts.map((product) => (
                  <CommandItem key={product.id} value={String(product.id)} onSelect={() => select(product)}>
                    <Check className={cn('mr-2 h-4 w-4 shrink-0', value === product.id ? 'opacity-100' : 'opacity-0')} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate">{product.name}</span>
                      {showCategory && (
                        <span className="text-xs text-muted-foreground">
                          {product.category?.trim() || UNCATEGORIZED_LABEL}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
