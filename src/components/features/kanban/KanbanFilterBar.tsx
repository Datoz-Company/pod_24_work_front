import { useState } from 'react'
import { endOfWeek, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ChevronDown, ChevronUp, Search, SlidersHorizontal, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { KanbanCard, KanbanColumn } from '@/types'

export type DueFilter = 'ALL' | 'TODAY' | 'THIS_WEEK' | 'OVERDUE'

export interface KanbanFilter {
  keyword: string
  due: DueFilter
}

export const EMPTY_KANBAN_FILTER: KanbanFilter = { keyword: '', due: 'ALL' }

const DUE_OPTIONS: { value: DueFilter; label: string }[] = [
  { value: 'ALL', label: '전체' },
  { value: 'TODAY', label: '오늘 출고' },
  { value: 'THIS_WEEK', label: '이번 주 출고' },
  { value: 'OVERDUE', label: '출고 지연' },
]

// 필터 패널 펼침 상태 캐싱 (기본값: 접힘)
const FILTER_OPEN_KEY = 'kanban-filter-open'

const loadFilterOpen = (): boolean => {
  try {
    return localStorage.getItem(FILTER_OPEN_KEY) === 'true'
  } catch {
    return false
  }
}

const saveFilterOpen = (open: boolean) => {
  try {
    localStorage.setItem(FILTER_OPEN_KEY, String(open))
  } catch {
    // 저장 실패 시 무시 (프라이빗 모드 등)
  }
}

function matchesDue(card: KanbanCard, due: DueFilter, today: Date): boolean {
  if (due === 'ALL') return true
  if (!card.dueDate) return false
  const dueDate = new Date(card.dueDate)
  switch (due) {
    case 'TODAY':
      return isSameDay(dueDate, today)
    case 'THIS_WEEK':
      return !isBefore(dueDate, today) && !isBefore(endOfWeek(today, { weekStartsOn: 1 }), dueDate)
    case 'OVERDUE':
      return isBefore(dueDate, today) && card.workOrderStatus !== 'COMPLETED'
  }
}

function matchesKeyword(card: KanbanCard, keyword: string): boolean {
  if (!keyword) return true
  const fields = [card.clientName, card.customerName, card.productName, card.orderName, card.orderGroupName]
  for (const field of fields) {
    if (field && field.toLowerCase().includes(keyword)) {
      return true
    }
  }
  return false
}

/**
 * 칸반 컬럼의 카드를 필터 조건으로 걸러낸 새 컬럼 배열을 반환합니다.
 *
 * @param {readonly KanbanColumn[]} columns - 원본 컬럼
 * @param {KanbanFilter} filter - 검색어(상호명/상품명/작업명)와 출고일 조건
 * @returns {KanbanColumn[]} 필터가 적용된 컬럼 (컬럼 자체는 유지)
 */
export function applyKanbanFilter(columns: readonly KanbanColumn[], filter: KanbanFilter): KanbanColumn[] {
  const keyword = filter.keyword.trim().toLowerCase()
  if (!keyword && filter.due === 'ALL') {
    return [...columns]
  }
  const today = startOfDay(new Date())
  return columns.map((column) => ({
    ...column,
    cards: column.cards.filter((card) => matchesKeyword(card, keyword) && matchesDue(card, filter.due, today)),
  }))
}

interface KanbanFilterBarProps {
  filter: KanbanFilter
  onChange: (filter: KanbanFilter) => void
}

export function KanbanFilterBar({ filter, onChange }: KanbanFilterBarProps) {
  const [isOpen, setIsOpen] = useState(loadFilterOpen)
  const isActive = filter.keyword.trim() !== '' || filter.due !== 'ALL'

  const toggleOpen = () => {
    setIsOpen((prev) => {
      saveFilterOpen(!prev)
      return !prev
    })
  }

  return (
    <div className="border-b bg-white px-4">
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          onClick={toggleOpen}
          className="flex items-center gap-1.5 rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-100"
          aria-expanded={isOpen}
        >
          <SlidersHorizontal className="h-4 w-4" />
          필터
          {isActive && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-label="필터 적용 중" />}
          {isOpen ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
        </button>
        {isActive && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onChange(EMPTY_KANBAN_FILTER)}>
            <X className="mr-1 h-3 w-3" />
            초기화
          </Button>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-wrap items-center gap-3 pb-3">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="kanban-filter-keyword"
              value={filter.keyword}
              onChange={(e) => onChange({ ...filter, keyword: e.target.value })}
              placeholder="상호명, 상품명, 작업명 검색"
              className="h-8 pl-8 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {DUE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange({ ...filter, due: option.value })}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  filter.due === option.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
