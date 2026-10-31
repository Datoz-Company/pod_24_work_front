import { useState, type ReactNode } from 'react'
import { Download, Eye, FileText, Loader2, Trash2 } from 'lucide-react'
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
import { formatDateTime, formatFileSize } from '@/lib/format'
import { FilePreview } from './FilePreview'

/** 목록에 표시할 파일 — 작업 첨부 / 주문 파일 / 회사 파일 공통 */
export interface FileListItem {
  id: number
  originalFilename: string
  contentType: string
  fileSize: number
  downloadUrl: string
  createdAt: string
  uploadedBy?: string
  /** 출처 표시 (예: "주문 O-2026-001", "브랜드 A") */
  source?: ReactNode
}

interface FileListProps {
  files: readonly FileListItem[]
  isLoading?: boolean
  emptyText?: string
  /** 없으면 삭제 버튼을 표시하지 않음 */
  onDelete?: (file: FileListItem) => Promise<unknown>
}

/**
 * 파일 목록 — 썸네일, 미리보기(이미지·PDF), 다운로드, 삭제 확인을 모든 화면에서 같은 방식으로 제공
 */
export function FileList({ files, isLoading = false, emptyText = '파일이 없습니다.', onDelete }: FileListProps) {
  const [preview, setPreview] = useState<FileListItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FileListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!deleteTarget || !onDelete) return
    setIsDeleting(true)
    try {
      await onDelete(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (files.length === 0) {
    return <p className="py-2 text-xs text-muted-foreground">{emptyText}</p>
  }

  return (
    <>
      <ul className="space-y-1.5">
        {files.map((file) => {
          const isImage = file.contentType.startsWith('image/')
          const canPreview = isImage || file.contentType === 'application/pdf'
          return (
            <li key={file.id} className="group flex items-center gap-3 rounded-md border px-3 py-2 hover:bg-muted/40">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded bg-muted text-muted-foreground">
                {isImage ? (
                  <img src={file.downloadUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{file.originalFilename}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatFileSize(file.fileSize)} · {formatDateTime(file.createdAt)}
                  {file.uploadedBy && ` · ${file.uploadedBy}`}
                  {file.source && <> · {file.source}</>}
                </p>
              </div>
              <div className="flex shrink-0 items-center">
                {canPreview && (
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPreview(file)} aria-label="미리보기">
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
                <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                  <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" download={file.originalFilename} aria-label="다운로드">
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                {onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeleteTarget(file)}
                    aria-label="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      <FilePreview attachment={preview} open={!!preview} onOpenChange={(open) => !open && setPreview(null)} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>파일 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.originalFilename}</strong> 파일을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
