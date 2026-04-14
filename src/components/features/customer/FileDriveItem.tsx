import { useState } from 'react'
import { Download, Eye, FileText, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { Attachment } from '@/types'

interface FileDriveItemProps {
  attachment: Attachment
  viewMode: 'grid' | 'list'
  onPreview: () => void
}

export function FileDriveItem({ attachment, viewMode, onPreview }: FileDriveItemProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)
  const [imageError, setImageError] = useState(false)

  const isImage = attachment.contentType.startsWith('image/')
  const isPdf = attachment.contentType === 'application/pdf'

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    const link = document.createElement('a')
    link.href = attachment.downloadUrl
    link.download = attachment.originalFilename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePreview = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPreview()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  // 그리드 뷰
  if (viewMode === 'grid') {
    return (
      <div
        className="group relative flex flex-col overflow-hidden rounded-lg border bg-white transition-shadow hover:shadow-md cursor-pointer"
        onClick={handlePreview}
      >
        {/* 썸네일 영역 */}
        <div className="relative aspect-square bg-muted/50 flex items-center justify-center">
          {isImage && !imageError ? (
            <>
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
              <img
                src={attachment.thumbnailUrl || attachment.downloadUrl}
                alt={attachment.originalFilename}
                className={cn(
                  'h-full w-full object-cover transition-opacity',
                  isImageLoading ? 'opacity-0' : 'opacity-100'
                )}
                onLoad={() => setIsImageLoading(false)}
                onError={() => {
                  setIsImageLoading(false)
                  setImageError(true)
                }}
              />
            </>
          ) : isPdf ? (
            <FileText className="h-12 w-12 text-red-500" />
          ) : (
            <FileText className="h-12 w-12 text-muted-foreground" />
          )}

          {/* 호버 오버레이 */}
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={handlePreview}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="h-8 w-8"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 파일 정보 */}
        <div className="p-2">
          <p className="truncate text-xs font-medium" title={attachment.originalFilename}>
            {attachment.originalFilename}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {formatFileSize(attachment.fileSize)}
          </p>
        </div>
      </div>
    )
  }

  // 리스트 뷰
  return (
    <div
      className="group flex items-center gap-3 rounded-lg border bg-white p-3 transition-colors hover:bg-muted/50 cursor-pointer"
      onClick={handlePreview}
    >
      {/* 아이콘 */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-muted/50">
        {isImage && !imageError ? (
          <Image className="h-5 w-5 text-blue-500" />
        ) : isPdf ? (
          <FileText className="h-5 w-5 text-red-500" />
        ) : (
          <FileText className="h-5 w-5 text-muted-foreground" />
        )}
      </div>

      {/* 파일 정보 */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium" title={attachment.originalFilename}>
          {attachment.originalFilename}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatFileSize(attachment.fileSize)}
        </p>
      </div>

      {/* 액션 버튼 */}
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handlePreview}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
