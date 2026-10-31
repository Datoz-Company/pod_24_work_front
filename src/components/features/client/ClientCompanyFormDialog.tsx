import { useEffect, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { clientCompanyService } from '@/services/clientCompanyService'
import type { ClientCompany } from '@/types'

interface ClientCompanyFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 수정 대상 (없으면 추가) */
  target?: ClientCompany | null
  /** 브랜드 추가 시 상위 회사 */
  parent?: ClientCompany | null
  onSaved?: (saved: ClientCompany) => void
}

/**
 * 회사 / 브랜드 추가·수정 — 회사 목록과 회사 상세에서 공용
 */
export function ClientCompanyFormDialog({ open, onOpenChange, target, parent, onSaved }: ClientCompanyFormDialogProps) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [memo, setMemo] = useState('')

  const isBrand = target ? target.type === 'BRAND' : !!parent
  const kind = isBrand ? '브랜드' : '회사'

  useEffect(() => {
    if (!open) return
    setName(target?.name ?? '')
    setMemo(target?.memo ?? '')
  }, [open, target])

  const saveMutation = useMutation({
    mutationFn: () =>
      target
        ? clientCompanyService.update(target.id, { name: name.trim(), memo })
        : clientCompanyService.create({ name: name.trim(), memo, parentId: parent?.id }),
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ['client-companies'] })
      queryClient.invalidateQueries({ queryKey: ['client-company'] })
      toast.success(`${kind}를 ${target ? '수정' : '추가'}했습니다.`)
      onOpenChange(false)
      onSaved?.(saved)
    },
    onError: () => toast.error(`${kind} 저장에 실패했습니다.`),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{target ? `${kind} 수정` : `${kind} 추가`}</DialogTitle>
          {parent && !target && <DialogDescription>"{parent.name}" 아래에 브랜드를 추가합니다.</DialogDescription>}
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim()) saveMutation.mutate()
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="client-name">{kind}명 *</Label>
            <Input id="client-name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-memo">메모</Label>
            <Textarea id="client-memo" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || !name.trim()}>
              {saveMutation.isPending ? '저장 중...' : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
