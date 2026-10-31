import { Badge } from '@/components/ui/badge'
import { describeOption } from '@/lib/optionSnapshot'
import type { WorkOrderOption } from '@/types/option'

interface WorkOrderOptionsViewProps {
  options: readonly WorkOrderOption[]
  /** 가격 표시 여부 — 작업 화면은 직원도 보므로 관리자에게만 */
  showPrices?: boolean
}

/**
 * 작업 옵션 표시 — 칸반 패널과 작업 상세에서 공용
 */
export function WorkOrderOptionsView({ options, showPrices = false }: WorkOrderOptionsViewProps) {
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">선택한 옵션이 없습니다.</p>
  }

  return (
    <div className="divide-y">
      {options.map((option) => {
        const { optionName, lines } = describeOption(option)
        return (
          <div key={option.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{optionName}</span>
              {showPrices && (
                <span className="text-xs text-muted-foreground">
                  {option.optionCount}개 · {option.optionTotalAmount.toLocaleString()}원
                </span>
              )}
            </div>
            {lines.length > 0 && (
              <div className="space-y-1.5">
                {lines.map((line) => (
                  <div key={line.attributeId} className="flex items-start gap-2 text-xs">
                    <span className="min-w-[72px] text-muted-foreground">{line.name}</span>
                    <div className="flex flex-wrap gap-1">
                      {line.values.map((value) => (
                        <Badge key={value.label} variant="secondary" className="text-xs font-normal">
                          {value.label}
                          {showPrices && value.price > 0 && (
                            <span className="ml-1 text-muted-foreground">+{value.price.toLocaleString()}원</span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
