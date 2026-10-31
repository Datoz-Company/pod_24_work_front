import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface CategoryComboboxProps {
  value: string
  onChange: (category: string) => void
  /** 이미 등록된 상품 종류 목록 */
  categories: readonly string[]
}

/**
 * 상품 종류 선택 — 기존 종류에서 고르고, 없을 때만 새로 추가 (자유 입력 오타로 종류가 갈라지는 것 방지)
 */
export function CategoryCombobox({ value, onChange, categories }: CategoryComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const keyword = search.trim()
  const exists = categories.some((c) => c.toLowerCase() === keyword.toLowerCase())

  const select = (category: string) => {
    onChange(category)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value || <span className="text-muted-foreground">상품 종류 선택 (선택 안 하면 미분류)</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="종류 검색 또는 새로 입력..." value={search} onValueChange={setSearch} />
          <CommandList>
            {categories.length === 0 && !keyword && <CommandEmpty>등록된 종류가 없습니다.</CommandEmpty>}
            <CommandGroup>
              {value && (
                <CommandItem value="__none__" onSelect={() => select('')}>
                  <span className="text-muted-foreground">선택 해제 (미분류)</span>
                </CommandItem>
              )}
              {categories.map((category) => (
                <CommandItem key={category} value={category} onSelect={() => select(category)}>
                  <Check className={cn('mr-2 h-4 w-4', value === category ? 'opacity-100' : 'opacity-0')} />
                  {category}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
          {keyword && !exists && (
            <div className="border-t p-1">
              <Button variant="ghost" className="w-full justify-start gap-2 text-primary" onClick={() => select(keyword)}>
                <Plus className="h-4 w-4" />"{keyword}" 새 종류로 추가
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  )
}
