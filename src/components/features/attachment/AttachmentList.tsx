import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  FileText,
  Image as ImageIcon,
  Trash2,
  Download,
  Eye,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FilePreview } from './FilePreview'
import { attachmentService } from '@/services/attachmentService'
import type { Attachment } from '@/types'

interface AttachmentListProps {
  workOrderId: number
  attachments: Attachment[]
  isLoading?: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(contentType: string) {
  if (contentType.startsWith('image/')) {
    return <ImageIcon className="h-4 w-4" />
  }
  return <FileText className="h-4 w-4" />
}

export function AttachmentList({
  workOrderId,
  attachments,
  isLoading = false,
}: AttachmentListProps) {
  const queryClient = useQueryClient()
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Attachment | null>(null)

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) =>
      attachmentService.delete(workOrderId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attachments', workOrderId] })
      setDeleteTarget(null)
    },
  })

  const handleDownload = (attachment: Attachment) => {
    const link = document.createElement('a')
    link.href = attachment.downloadUrl
    link.download = attachment.originalFilename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget.id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (attachments.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        첨부된 파일이 없습니다.
      </p>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const isImage = attachment.contentType.startsWith('image/')
          const isPdf = attachment.contentType === 'application/pdf'
          const canPreview = isImage || isPdf

          return (
            <div
              key={attachment.id}
              className="group flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
            >
              {/* 썸네일 또는 아이콘 */}
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-muted">
                {isImage && attachment.downloadUrl ? (
                  <img
                    src={attachment.downloadUrl}
                    alt={attachment.originalFilename}
                    className="h-full w-full rounded object-cover"
                  />
                ) : (
                  <div className="text-muted-foreground">
                    {getFileIcon(attachment.contentType)}
                  </div>
                )}
              </div>

              {/* 파일 정보 */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {attachment.originalFilename}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.fileSize)} ·{' '}
                  {format(new Date(attachment.createdAt), 'MM/dd HH:mm', { locale: ko })}
                </p>
              </div>

              {/* 액션 버튼 */}
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {canPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setPreviewAttachment(attachment)}
                    title="미리보기"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => handleDownload(attachment)}
                  title="다운로드"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                  onClick={() => setDeleteTarget(attachment)}
                  title="삭제"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 미리보기 다이얼로그 */}
      <FilePreview
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.originalFilename}</strong> 파일을 삭제하시겠습니까?
              <br />
              <span className="text-destructive">이 작업은 되돌릴 수 없습니다.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
