import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { attachmentService } from '@/services/attachmentService'
import { FileUploader } from './FileUploader'
import { FileList } from './FileList'

interface WorkOrderAttachmentsProps {
  workOrderId: number
}

/**
 * 작업 첨부 파일 (업로드 + 목록) — 칸반 패널과 작업 상세에서 공용
 */
export function WorkOrderAttachments({ workOrderId }: WorkOrderAttachmentsProps) {
  const queryClient = useQueryClient()
  const queryKey = ['attachments', workOrderId]

  const { data: attachments = [], isLoading } = useQuery({
    queryKey,
    queryFn: () => attachmentService.getAttachments(workOrderId),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => attachmentService.upload(workOrderId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('파일을 업로드했습니다')
    },
    onError: () => toast.error('파일 업로드에 실패했습니다'),
  })

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => attachmentService.delete(workOrderId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('파일을 삭제했습니다')
    },
    onError: () => toast.error('파일 삭제에 실패했습니다'),
  })

  return (
    <div className="space-y-3">
      <FileUploader
        onUpload={async (file) => {
          await uploadMutation.mutateAsync(file)
        }}
        isUploading={uploadMutation.isPending}
        compact
      />
      <FileList
        files={attachments}
        isLoading={isLoading}
        emptyText="첨부된 파일이 없습니다."
        onDelete={(file) => deleteMutation.mutateAsync(file.id)}
      />
    </div>
  )
}
