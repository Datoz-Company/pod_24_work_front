import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { Attachment } from '@/types'

interface FilePreviewProps {
  attachment: Attachment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FilePreview({ attachment, open, onOpenChange }: FilePreviewProps) {
  const [isImageLoading, setIsImageLoading] = useState(true)

  if (!attachment) return null

  const isImage = attachment.contentType.startsWith('image/')
  const isPdf = attachment.contentType === 'application/pdf'

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = attachment.downloadUrl
    link.download = attachment.originalFilename
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden p-0">
        <DialogHeader className="flex flex-row items-center justify-between border-b p-4">
          <DialogTitle className="truncate pr-4 text-base">
            {attachment.originalFilename}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              다운로드
            </Button>
          </div>
        </DialogHeader>

        <div className="flex max-h-[calc(90vh-80px)] items-center justify-center overflow-auto bg-muted/50 p-4">
          {isImage && (
            <div className="relative">
              {isImageLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}
              <img
                src={attachment.downloadUrl}
                alt={attachment.originalFilename}
                className="max-h-[calc(90vh-120px)] max-w-full rounded object-contain"
                onLoad={() => setIsImageLoading(false)}
                onError={() => setIsImageLoading(false)}
              />
            </div>
          )}

          {isPdf && (
            <div className="flex h-[calc(90vh-120px)] w-full flex-col">
              <iframe
                src={`${attachment.downloadUrl}#toolbar=1&navpanes=0`}
                className="h-full w-full rounded border"
                title={attachment.originalFilename}
              />
            </div>
          )}

          {!isImage && !isPdf && (
            <div className="flex flex-col items-center gap-4 py-12">
              <FileText className="h-16 w-16 text-muted-foreground" />
              <p className="text-muted-foreground">
                미리보기를 지원하지 않는 파일 형식입니다.
              </p>
              <Button onClick={handleDownload} className="gap-2">
                <Download className="h-4 w-4" />
                다운로드
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
