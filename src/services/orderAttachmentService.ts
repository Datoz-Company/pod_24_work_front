import api from './api'
import type { ApiResponse, OrderAttachment, OrderFileCategory } from '@/types'

export const orderAttachmentService = {
  upload: async (orderId: number, category: OrderFileCategory, file: File): Promise<OrderAttachment> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<ApiResponse<OrderAttachment>>(
      `/orders/${orderId}/files?category=${category}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    )
    return response.data.data
  },

  getAll: async (orderId: number, category: OrderFileCategory): Promise<OrderAttachment[]> => {
    const response = await api.get<ApiResponse<OrderAttachment[]>>(`/orders/${orderId}/files?category=${category}`)
    return response.data.data
  },

  delete: async (orderId: number, attachmentId: number): Promise<void> => {
    await api.delete(`/orders/${orderId}/files/${attachmentId}`)
  },

  // 같은 고객사(회사+브랜드)의 공유 디자인 파일
  getClientCompanyFiles: async (clientCompanyId: number): Promise<OrderAttachment[]> => {
    const response = await api.get<ApiResponse<OrderAttachment[]>>(`/client-companies/${clientCompanyId}/files`)
    return response.data.data
  },
}
