import { useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploader } from '@/components/features/attachment/FileUploader'
import { FileList } from '@/components/features/attachment/FileList'
import { orderAttachmentService } from '@/services/orderAttachmentService'
import { useCanViewQuotes } from '@/lib/permissions'
import type { OrderFileCategory } from '@/types'

function FileSection({
  orderId,
  category,
  title,
  description,
  headerAction,
}: {
  orderId: number
  category: OrderFileCategory
  title: ReactNode
  description: string
  headerAction?: ReactNode
}) {
  const queryClient = useQueryClient()
  const queryKey = ['order-files', orderId, category]

  const { data: files = [] } = useQuery({
    queryKey,
    queryFn: () => orderAttachmentService.getAll(orderId, category),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => orderAttachmentService.upload(orderId, category, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('파일을 업로드했습니다')
    },
    onError: () => toast.error('파일 업로드에 실패했습니다'),
  })

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => orderAttachmentService.delete(orderId, attachmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey })
      toast.success('파일을 삭제했습니다')
    },
    onError: () => toast.error('파일 삭제에 실패했습니다'),
  })

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="flex items-center gap-1.5 text-sm font-medium">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {headerAction}
      </div>
      <FileUploader onUpload={async (file) => { await uploadMutation.mutateAsync(file) }} isUploading={uploadMutation.isPending} compact />
      <FileList files={files} emptyText="업로드된 파일이 없습니다." onDelete={(file) => deleteMutation.mutateAsync(file.id)} />
    </div>
  )
}

interface OrderFilesPanelProps {
  orderId: number
  clientCompanyId?: number
  /** 견적서 영역 우측 상단에 놓을 버튼 (예: 견적서 자동 생성) */
  quoteAction?: ReactNode
}

/**
 * 주문 파일 공간 2분리: ① 견적서(관리자 전용) ② 주문/디자인 파일(회사와 공유)
 */
export function OrderFilesPanel({ orderId, clientCompanyId, quoteAction }: OrderFilesPanelProps) {
  const canViewQuotes = useCanViewQuotes()
  const [showShared, setShowShared] = useState(false)

  const { data: sharedFiles = [] } = useQuery({
    queryKey: ['client-company-files', clientCompanyId],
    queryFn: () => orderAttachmentService.getClientCompanyFiles(clientCompanyId!),
    enabled: !!clientCompanyId && showShared,
  })
  const otherOrderFiles = sharedFiles.filter((file) => file.orderId !== orderId)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">주문 파일</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        {canViewQuotes && (
          <FileSection
            orderId={orderId}
            category="QUOTE"
            title={<><Lock className="h-3.5 w-3.5 text-amber-600" />견적서</>}
            description="대표·디자인실장만 볼 수 있습니다. 버전별로 여러 개 올릴 수 있습니다."
            headerAction={quoteAction}
          />
        )}
        <div className="space-y-4">
          <FileSection
            orderId={orderId}
            category="DESIGN"
            title="주문 · 디자인 파일"
            description="Excel, AI 등 모든 형식 가능. 같은 회사(브랜드)의 다른 주문에서도 볼 수 있습니다."
          />
          {clientCompanyId && (
            <div className="border-t pt-3">
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setShowShared((prev) => !prev)}
                aria-expanded={showShared}
              >
                {showShared ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                같은 회사의 이전 주문 파일
              </button>
              {showShared && (
                <div className="mt-2">
                  <FileList
                    files={otherOrderFiles.map((file) => ({ ...file, source: `주문 ${file.orderNumber}` }))}
                    emptyText="공유된 파일이 없습니다."
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
