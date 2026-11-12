import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { optionService } from '@/services/optionService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import type { Option, OptionAttribute } from '@/types/option'
import {
  CopySelectionTree,
  effectiveSelection,
  orderAttributes,
  selectAll,
  type CopySelectionState,
} from './CopySelectionTree'

export interface CopyAttributeSource {
  attribute: OptionAttribute
  option: Option
}

interface CopyAttributeDialogProps {
  /** 복사할 속성과 그 속성이 속한 옵션 (null이면 닫힘) */
  source: CopyAttributeSource | null
  /** 복사해 넣을 수 있는 옵션 목록 */
  options: readonly Option[]
  onClose: () => void
  /** 복사가 끝난 뒤 복사본이 들어간 옵션 id */
  onCopied?: (optionId: number) => void
}

/**
 * attribute 아래의 모든 하위 속성 수를 셉니다.
 *
 * @param attributes - 같은 옵션의 전체 속성
 * @param rootId - 기준 속성 id
 * @returns 하위 속성 수 (손자 이하 포함)
 */
export function countDescendants(attributes: readonly OptionAttribute[], rootId: number): number {
  const ids = new Set<number>([rootId])
  let count = 0
  let added = true
  while (added) {
    added = false
    for (const attribute of attributes) {
      if (attribute.parentAttributeId != null && ids.has(attribute.parentAttributeId) && !ids.has(attribute.id)) {
        ids.add(attribute.id)
        count++
        added = true
      }
    }
  }
  return count
}

/** 같은 옵션이면 "이름 (복사)", 다른 옵션이면 원본 이름 */
function defaultName(source: CopyAttributeSource, targetOptionId: number): string {
  return targetOptionId === source.option.id ? `${source.attribute.name} (복사)` : source.attribute.name
}

/**
 * 속성을 값(과 하위 속성)까지 복사하는 다이얼로그.
 * 같은 옵션에 복사하면 원본 바로 뒤에, 다른 옵션에 복사하면 그 옵션 맨 끝에 추가됩니다.
 */
export function CopyAttributeDialog({ source, options, onClose, onCopied }: CopyAttributeDialogProps) {
  const queryClient = useQueryClient()
  const [targetOptionId, setTargetOptionId] = useState<number | null>(null)
  const [name, setName] = useState('')
  // 사용자가 이름을 직접 고쳤으면 대상 옵션을 바꿔도 이름을 덮어쓰지 않음
  const [nameEdited, setNameEdited] = useState(false)
  // 복사할 범위 (이 속성 + 하위 속성 · 값), 기본 전체
  const rows = useMemo(
    () => (source ? orderAttributes(source.option.attributes ?? [], source.attribute.id) : []),
    [source]
  )
  const [selection, setSelection] = useState<CopySelectionState>({ attributeIds: new Set(), valueIds: new Set() })

  useEffect(() => {
    if (!source) return
    setTargetOptionId(source.option.id)
    setName(defaultName(source, source.option.id))
    setNameEdited(false)
    setSelection(selectAll(rows))
  }, [source, rows])

  const copyMutation = useMutation({
    mutationFn: () =>
      optionService.copyAttribute(source!.attribute.id, {
        targetOptionId: targetOptionId ?? undefined,
        name,
        selection: effectiveSelection(rows, selection),
      }),
    onSuccess: (option) => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      toast.success(`'${option.name}' 옵션에 '${name.trim()}' 속성을 복사했습니다`)
      onCopied?.(option.id)
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '속성 복사에 실패했습니다')
    },
  })

  const submit = () => {
    if (!source || targetOptionId == null || !name.trim() || copyMutation.isPending) return
    copyMutation.mutate()
  }

  const changeTarget = (value: string) => {
    const id = Number(value)
    setTargetOptionId(id)
    if (source && !nameEdited) setName(defaultName(source, id))
  }

  const childCount = source ? countDescendants(source.option.attributes ?? [], source.attribute.id) : 0
  const valueCount = source?.attribute.values?.length ?? 0
  const sameOption = source != null && targetOptionId === source.option.id
  const targetOption = options.find((option) => option.id === targetOptionId)

  return (
    <Dialog open={source != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>속성 복사 - {source?.attribute.name}</DialogTitle>
          <DialogDescription>
            이 속성을 값 {valueCount}개
            {childCount > 0 && <>, 하위 속성 {childCount}개(값 · 연결 포함)</>}와 함께 복사합니다. 아래에서 뺄 항목의 체크를
            해제하세요.
          </DialogDescription>
        </DialogHeader>
        {source != null && valueCount === 0 && childCount === 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            이 속성에는 값이 없어 빈 속성만 복사됩니다. 다른 옵션의 속성과 값을 이 옵션으로 가져오려면 옵션 카드의
            <b> 가져오기</b> 아이콘(복제 아이콘 옆)을 사용하세요.
          </p>
        )}
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <div className="space-y-2">
            <Label>어디로 복사할까요?</Label>
            <Select value={targetOptionId != null ? String(targetOptionId) : undefined} onValueChange={changeTarget}>
              <SelectTrigger aria-label="복사해 넣을 옵션">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((option) => (
                  <SelectItem key={option.id} value={String(option.id)}>
                    {option.name}
                    {option.id === source?.option.id ? ' (지금 옵션)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {targetOption && (
              <p className="text-xs font-medium text-gray-700">
                {source?.option.name} › {source?.attribute.name} → {targetOption.name}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {sameOption
                ? source?.attribute.parentAttributeId != null
                  ? '원본 바로 뒤에, 같은 상위 속성 아래에 추가됩니다.'
                  : '원본 바로 뒤에 추가됩니다.'
                : '선택한 옵션의 맨 끝에 추가됩니다.'}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="copy-attribute-name">새 속성명 *</Label>
            <Input
              id="copy-attribute-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setNameEdited(true)
              }}
              onKeyDown={(e) => {
                // 한글 조합 중 Enter는 글자 확정용이므로 제출하지 않음
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  submit()
                }
              }}
              maxLength={200}
              autoFocus
            />
          </div>
          {(valueCount > 0 || childCount > 0) && (
            <div className="space-y-2">
              <Label>복사할 내용</Label>
              <CopySelectionTree
                rows={rows}
                selection={selection}
                onChange={setSelection}
                lockedAttributeId={source?.attribute.id}
              />
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              취소
            </Button>
            <Button type="submit" disabled={!name.trim() || targetOptionId == null || copyMutation.isPending}>
              {copyMutation.isPending ? '복사 중...' : '복사'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
