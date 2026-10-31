import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { workOrderService } from '@/services/workOrderService'
import { invalidateWorkData } from '@/lib/queryInvalidation'

const URL_PATTERN = /(https?:\/\/[^\s]+)/g

// 메모 텍스트의 URL을 클릭 가능한 링크로 변환 (블로그 참고 링크 등)
function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(URL_PATTERN)
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-blue-600 underline hover:text-blue-800"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </>
  )
}

interface WorkOrderMemoEditorProps {
  workOrderId: number
  memo?: string
}

export function WorkOrderMemoEditor({ workOrderId, memo }: WorkOrderMemoEditorProps) {
  const queryClient = useQueryClient()
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState(memo ?? '')

  const saveMutation = useMutation({
    mutationFn: (value: string) => workOrderService.update(workOrderId, { memo: value }),
    onSuccess: () => {
      invalidateWorkData(queryClient)
      toast.success('메모를 저장했습니다')
      setIsEditing(false)
    },
    onError: () => toast.error('메모 저장에 실패했습니다'),
  })

  const startEdit = () => {
    setDraft(memo ?? '')
    setIsEditing(true)
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        <Textarea
          id={`work-order-memo-${workOrderId}`}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="작업 메모를 입력하세요 (링크 붙여넣기 가능)"
          rows={4}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            취소
          </Button>
          <Button size="sm" onClick={() => saveMutation.mutate(draft)} disabled={saveMutation.isPending}>
            저장
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group flex items-start gap-2">
      <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm text-gray-700">
        {memo ? <LinkifiedText text={memo} /> : <span className="text-muted-foreground">메모가 없습니다</span>}
      </p>
      <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2" onClick={startEdit}>
        <Pencil className="mr-1 h-3 w-3" />
        {memo ? '수정' : '추가'}
      </Button>
    </div>
  )
}
