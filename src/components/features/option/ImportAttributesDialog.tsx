import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { optionService } from '@/services/optionService'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Option } from '@/types/option'
import {
  CopySelectionTree,
  effectiveSelection,
  orderAttributes,
  selectAll,
  type CopySelectionState,
} from './CopySelectionTree'

interface ImportAttributesDialogProps {
  /** 속성을 받을 옵션 (null이면 닫힘) */
  target: Option | null
  /** 회사의 옵션 목록 */
  options: readonly Option[]
  onClose: () => void
  /** 가져온 뒤 받을 옵션 id */
  onImported?: (optionId: number) => void
}

const EMPTY_SELECTION: CopySelectionState = { attributeIds: new Set(), valueIds: new Set() }

/**
 * 다른 옵션의 속성(+값)을 골라 이 옵션에 새 속성으로 가져오는 다이얼로그. 기본은 전체 선택, 해제한 항목은 제외.
 * 예: test123 옵션에 필스타의 '원단색상'을 원하는 색상만 골라 가져오기.
 */
export function ImportAttributesDialog({ target, options, onClose, onImported }: ImportAttributesDialogProps) {
  const queryClient = useQueryClient()
  const [sourceOptionId, setSourceOptionId] = useState<number | null>(null)
  const [selection, setSelection] = useState<CopySelectionState>(EMPTY_SELECTION)

  // 속성이 있는 다른 옵션만 선택지로
  const sourceOptions = useMemo(
    () => (target ? options.filter((o) => o.id !== target.id && (o.attributes?.length ?? 0) > 0) : []),
    [options, target]
  )
  const sourceOption = sourceOptions.find((o) => o.id === sourceOptionId)
  const rows = useMemo(() => orderAttributes(sourceOption?.attributes ?? []), [sourceOption])

  useEffect(() => {
    if (!target) return
    setSourceOptionId(null)
    setSelection(EMPTY_SELECTION)
  }, [target])

  // 옵션을 바꾸면 그 옵션 전체를 기본 선택
  useEffect(() => {
    setSelection(selectAll(rows))
  }, [rows])

  const effective = effectiveSelection(rows, selection)

  const importMutation = useMutation({
    mutationFn: () => optionService.importAttributes(target!.id, sourceOptionId!, effective),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      toast.success(
        `'${sourceOption?.name}'에서 속성 ${result.attributeCount}개(값 ${result.valueCount}개)를 '${target!.name}'에 가져왔습니다`
      )
      onImported?.(target!.id)
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '속성 가져오기에 실패했습니다')
    },
  })

  const canSubmit = sourceOption != null && effective.attributeIds.length > 0 && !importMutation.isPending

  return (
    <Dialog open={target != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>가져오기 - {target?.name}</DialogTitle>
          <DialogDescription>
            다른 옵션의 속성과 값을 골라 <b>{target?.name}</b>에 새 속성으로 추가합니다. 원본 이름 그대로 맨 끝에 놓입니다.
          </DialogDescription>
        </DialogHeader>

        {sourceOptions.length === 0 ? (
          <p className="text-sm text-muted-foreground">가져올 수 있는 다른 옵션이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>어디에서 가져올까요?</Label>
              <Select
                value={sourceOptionId != null ? String(sourceOptionId) : undefined}
                onValueChange={(value) => setSourceOptionId(Number(value))}
              >
                <SelectTrigger aria-label="가져올 옵션">
                  <SelectValue placeholder="옵션 선택" />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.name} (속성 {option.attributes?.length ?? 0}개)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sourceOption && (
                <p className="text-xs font-medium text-gray-700">
                  {sourceOption.name} → {target?.name}
                </p>
              )}
            </div>

            {sourceOption && (
              <div className="space-y-2">
                <Label>가져올 내용</Label>
                <CopySelectionTree rows={rows} selection={selection} onChange={setSelection} />
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button type="button" disabled={!canSubmit} onClick={() => importMutation.mutate()}>
            {importMutation.isPending ? '가져오는 중...' : '가져오기'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
