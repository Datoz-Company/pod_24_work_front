import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { FileUploader } from '@/components/features/attachment/FileUploader'
import { FileList } from '@/components/features/attachment/FileList'
import { clientCompanyService } from '@/services/clientCompanyService'
import { orderAttachmentService } from '@/services/orderAttachmentService'

interface ClientCompanyFilesProps {
  clientCompanyId: number
}

/**
 * 회사(브랜드) 파일 공간
 * ① 회사·브랜드 파일: 로고 등 주문과 무관하게 재사용하는 자산 (업로드 가능)
 * ② 주문 디자인 파일: 이 회사(+브랜드) 주문들에 올라온 디자인 파일 모음 (주문에서 관리)
 */
export function ClientCompanyFiles({ clientCompanyId }: ClientCompanyFilesProps) {
  const queryClient = useQueryClient()
  const assetsKey = ['client-company-assets', clientCompanyId]

  const { data: assets = [], isLoading: isAssetsLoading } = useQuery({
    queryKey: assetsKey,
    queryFn: () => clientCompanyService.getAssets(clientCompanyId),
  })

  const { data: orderFiles = [], isLoading: isOrderFilesLoading } = useQuery({
    queryKey: ['client-company-files', clientCompanyId],
    queryFn: () => orderAttachmentService.getClientCompanyFiles(clientCompanyId),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => clientCompanyService.uploadAsset(clientCompanyId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKey })
      toast.success('파일을 업로드했습니다')
    },
    onError: () => toast.error('파일 업로드에 실패했습니다'),
  })

  const deleteMutation = useMutation({
    // 브랜드 파일은 브랜드 id로 삭제해야 하므로 파일의 소속 id 사용
    mutationFn: ({ ownerId, fileId }: { ownerId: number; fileId: number }) =>
      clientCompanyService.deleteAsset(ownerId, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: assetsKey })
      toast.success('파일을 삭제했습니다')
    },
    onError: () => toast.error('파일 삭제에 실패했습니다'),
  })

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">회사 · 브랜드 파일</h3>
          <p className="text-xs text-muted-foreground">로고, 브랜드 가이드 등 주문마다 다시 받지 않아도 되는 파일</p>
        </div>
        <FileUploader
          onUpload={async (file) => {
            await uploadMutation.mutateAsync(file)
          }}
          isUploading={uploadMutation.isPending}
          compact
        />
        <FileList
          files={assets.map((asset) => ({
            ...asset,
            source: asset.clientCompanyId !== clientCompanyId ? asset.clientCompanyName : undefined,
          }))}
          isLoading={isAssetsLoading}
          emptyText="등록된 파일이 없습니다."
          onDelete={(file) => {
            const owner = assets.find((a) => a.id === file.id)
            return deleteMutation.mutateAsync({ ownerId: owner?.clientCompanyId ?? clientCompanyId, fileId: file.id })
          }}
        />
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="text-sm font-medium">주문 디자인 파일</h3>
          <p className="text-xs text-muted-foreground">이 회사의 주문에 올라온 디자인 파일 — 수정·삭제는 각 주문에서 합니다</p>
        </div>
        <FileList
          files={orderFiles.map((file) => ({
            ...file,
            source: (
              <Link to={`/orders/${file.orderId}`} className="text-primary hover:underline">
                주문 {file.orderNumber}
              </Link>
            ),
          }))}
          isLoading={isOrderFilesLoading}
          emptyText="주문 디자인 파일이 없습니다."
        />
      </section>
    </div>
  )
}
