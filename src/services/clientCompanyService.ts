import api from './api'
import type { ApiResponse, ClientCompany, ClientCompanyRequest } from '@/types'

export const clientCompanyService = {
  // 회사 목록 (각 회사의 브랜드 포함)
  getTree: async (): Promise<ClientCompany[]> => {
    const response = await api.get<ApiResponse<ClientCompany[]>>('/client-companies')
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
}
