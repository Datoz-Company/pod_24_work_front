import api from './api'
import type { ApiResponse, Attachment } from '@/types'

export const attachmentService = {
  /**
   * 파일 업로드
   */
  upload: async (workOrderId: number, file: File): Promise<Attachment> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post<ApiResponse<Attachment>>(
      `/work-orders/${workOrderId}/attachments`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.data
  },

  /**
   * 첨부파일 목록 조회
   */
  getAttachments: async (workOrderId: number): Promise<Attachment[]> => {
    const response = await api.get<ApiResponse<Attachment[]>>(
      `/work-orders/${workOrderId}/attachments`
    )
    return response.data.data
  },

  /**
   * 첨부파일 삭제
   */
  delete: async (workOrderId: number, attachmentId: number): Promise<void> => {
    await api.delete(`/work-orders/${workOrderId}/attachments/${attachmentId}`)
  },

  /**
   * 다운로드 URL 조회
   */
  getDownloadUrl: async (workOrderId: number, attachmentId: number): Promise<string> => {
    const response = await api.get<ApiResponse<{ url: string }>>(
      `/work-orders/${workOrderId}/attachments/${attachmentId}/download`
    )
    return response.data.data.url
  },
}
