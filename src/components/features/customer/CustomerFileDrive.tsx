import { useState, useMemo } from 'react'
import { useQueries } from '@tanstack/react-query'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Grid3X3, List, Loader2, FolderOpen, Image, FileText, Files, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Toggle } from '@/components/ui/toggle'
import { Badge } from '@/components/ui/badge'
import { attachmentService } from '@/services/attachmentService'
import { FileDriveItem } from './FileDriveItem'
import { FilePreview } from '@/components/features/attachment/FilePreview'
import type { WorkOrder, Attachment } from '@/types'

type FileFilter = 'all' | 'image' | 'pdf'

interface CustomerFileDriveProps {
  workOrders: WorkOrder[]
  isLoading?: boolean
}

interface WorkOrderWithAttachments {
  workOrder: WorkOrder
  attachments: Attachment[]
}

export function CustomerFileDrive({ workOrders, isLoading }: CustomerFileDriveProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [fileFilter, setFileFilter] = useState<FileFilter>('all')
  const [previewAttachment, setPreviewAttachment] = useState<Attachment | null>(null)

  // 각 주문의 첨부파일을 병렬로 조회
  const attachmentQueries = useQueries({
    queries: workOrders.map((wo) => ({
      queryKey: ['attachments', wo.id],
      queryFn: () => attachmentService.getAttachments(wo.id),
      enabled: !isLoading,
    })),
  })

  const isAttachmentsLoading = attachmentQueries.some((q) => q.isLoading)

  // 주문별로 첨부파일 그룹핑
  const workOrdersWithAttachments: WorkOrderWithAttachments[] = useMemo(() => {
    return workOrders
      .map((wo, index) => ({
        workOrder: wo,
        attachments: attachmentQueries[index]?.data || [],
      }))
      .filter((item) => item.attachments.length > 0)
  }, [workOrders, attachmentQueries])

  // 필터링된 첨부파일 계산
  const filteredWorkOrdersWithAttachments = useMemo(() => {
    if (fileFilter === 'all') return workOrdersWithAttachments

    return workOrdersWithAttachments
      .map((item) => ({
        ...item,
        attachments: item.attachments.filter((att) => {
          if (fileFilter === 'image') return att.contentType.startsWith('image/')
          if (fileFilter === 'pdf') return att.contentType === 'application/pdf'
          return true
        }),
      }))
      .filter((item) => item.attachments.length > 0)
  }, [workOrdersWithAttachments, fileFilter])

  // 총 파일 수 계산
  const totalFiles = useMemo(() => {
    return workOrdersWithAttachments.reduce(
      (sum, item) => sum + item.attachments.length,
      0
    )
  }, [workOrdersWithAttachments])

  const imageCount = useMemo(() => {
    return workOrdersWithAttachments.reduce(
      (sum, item) =>
        sum +
        item.attachments.filter((a) => a.contentType.startsWith('image/')).length,
      0
    )
  }, [workOrdersWithAttachments])

  const pdfCount = useMemo(() => {
    return workOrdersWithAttachments.reduce(
      (sum, item) =>
        sum +
        item.attachments.filter((a) => a.contentType === 'application/pdf').length,
      0
    )
  }, [workOrdersWithAttachments])

  if (isLoading || isAttachmentsLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 헤더: 뷰 토글 및 필터 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">파일 드라이브</span>
          <Badge variant="secondary" className="h-5 px-1.5 text-xs">
            {totalFiles}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Toggle
            pressed={viewMode === 'grid'}
            onPressedChange={() => setViewMode('grid')}
            size="sm"
            aria-label="그리드 뷰"
          >
            <Grid3X3 className="h-4 w-4" />
          </Toggle>
          <Toggle
            pressed={viewMode === 'list'}
            onPressedChange={() => setViewMode('list')}
            size="sm"
            aria-label="리스트 뷰"
          >
            <List className="h-4 w-4" />
          </Toggle>
        </div>
      </div>

      {/* 필터 버튼 */}
      <div className="flex gap-2">
        <Button
          variant={fileFilter === 'all' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFileFilter('all')}
          className="gap-1.5"
        >
          <Files className="h-3.5 w-3.5" />
          전체
          <span className="text-xs text-muted-foreground">({totalFiles})</span>
        </Button>
        <Button
          variant={fileFilter === 'image' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFileFilter('image')}
          className="gap-1.5"
        >
          <Image className="h-3.5 w-3.5" />
          이미지
          <span className="text-xs text-muted-foreground">({imageCount})</span>
        </Button>
        <Button
          variant={fileFilter === 'pdf' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setFileFilter('pdf')}
          className="gap-1.5"
        >
          <FileText className="h-3.5 w-3.5" />
          PDF
          <span className="text-xs text-muted-foreground">({pdfCount})</span>
        </Button>
      </div>

      {/* 파일 목록 */}
      {filteredWorkOrdersWithAttachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mb-2" />
          <p className="text-sm">첨부파일이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredWorkOrdersWithAttachments.map(({ workOrder, attachments }) => (
            <div key={workOrder.id} className="space-y-3">
              {/* 주문 그룹 헤더 */}
              <div className="flex items-center gap-2 border-b pb-2">
                <span className="flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Package className="h-4 w-4" />
                  {workOrder.orderNumber}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({format(new Date(workOrder.createdAt), 'yyyy.MM.dd', {
                    locale: ko,
                  })})
                </span>
                <Badge variant="outline" className="ml-auto text-xs">
                  {attachments.length}개 파일
                </Badge>
              </div>

              {/* 파일 그리드/리스트 */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {attachments.map((attachment) => (
                    <FileDriveItem
                      key={attachment.id}
                      attachment={attachment}
                      viewMode={viewMode}
                      onPreview={() => setPreviewAttachment(attachment)}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <FileDriveItem
                      key={attachment.id}
                      attachment={attachment}
                      viewMode={viewMode}
                      onPreview={() => setPreviewAttachment(attachment)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 파일 미리보기 다이얼로그 */}
      <FilePreview
        attachment={previewAttachment}
        open={!!previewAttachment}
        onOpenChange={(open) => !open && setPreviewAttachment(null)}
      />
    </div>
  )
}
