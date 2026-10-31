import api from './api'
import type {
  ApiResponse,
  ClientCompany,
  ClientCompanyFile,
  ClientCompanyRequest,
  Customer,
  Order,
  PageResponse,
} from '@/types'

export const clientCompanyService = {
  // 회사 목록 (각 회사의 브랜드 포함)
  getTree: async (): Promise<ClientCompany[]> => {
    const response = await api.get<ApiResponse<ClientCompany[]>>('/client-companies')
    return response.data.data
  },

  getById: async (id: number): Promise<ClientCompany> => {
    const response = await api.get<ApiResponse<ClientCompany>>(`/client-companies/${id}`)
    return response.data.data
  },

  create: async (data: ClientCompanyRequest): Promise<ClientCompany> => {
    const response = await api.post<ApiResponse<ClientCompany>>('/client-companies', data)
    return response.data.data
  },

  update: async (id: number, data: ClientCompanyRequest): Promise<ClientCompany> => {
    const response = await api.put<ApiResponse<ClientCompany>>(`/client-companies/${id}`, data)
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/client-companies/${id}`)
  },

  // 소속 고객
  getCustomers: async (id: number): Promise<Customer[]> => {
    const response = await api.get<ApiResponse<Customer[]>>(`/client-companies/${id}/customers`)
    return response.data.data
  },

  // 회사 + 하위 브랜드의 주문
  getOrders: async (id: number): Promise<PageResponse<Order>> => {
    const response = await api.get<ApiResponse<PageResponse<Order>>>(`/client-companies/${id}/orders`)
    return response.data.data
  },

  // 회사 / 브랜드 파일 (로고 등)
  getAssets: async (id: number): Promise<ClientCompanyFile[]> => {
    const response = await api.get<ApiResponse<ClientCompanyFile[]>>(`/client-companies/${id}/assets`)
    return response.data.data
  },

  uploadAsset: async (id: number, file: File): Promise<ClientCompanyFile> => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<ApiResponse<ClientCompanyFile>>(`/client-companies/${id}/assets`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data.data
  },

  deleteAsset: async (id: number, fileId: number): Promise<void> => {
    await api.delete(`/client-companies/${id}/assets/${fileId}`)
  },
}
