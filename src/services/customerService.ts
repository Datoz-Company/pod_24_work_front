import api from './api'
import type { ApiResponse, Customer, CustomerCreateRequest, PageResponse, WorkOrder } from '@/types'

export const customerService = {
  getAll: async (): Promise<Customer[]> => {
    const response = await api.get<ApiResponse<Customer[]>>('/customers/all')
    return response.data.data
  },

  getPage: async (page = 0, size = 20, keyword?: string): Promise<PageResponse<Customer>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (keyword) params.append('keyword', keyword)
    const response = await api.get<ApiResponse<PageResponse<Customer>>>(`/customers?${params}`)
    return response.data.data
  },

  getById: async (id: number): Promise<Customer> => {
    const response = await api.get<ApiResponse<Customer>>(`/customers/${id}`)
    return response.data.data
  },

  create: async (data: CustomerCreateRequest): Promise<Customer> => {
    const response = await api.post<ApiResponse<Customer>>('/customers', data)
    return response.data.data
  },

  update: async (id: number, data: CustomerCreateRequest): Promise<Customer> => {
    const response = await api.put<ApiResponse<Customer>>(`/customers/${id}`, data)
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/customers/${id}`)
  },

  getWorkOrders: async (customerId: number, page = 0, size = 20): Promise<PageResponse<WorkOrder>> => {
    const response = await api.get<ApiResponse<PageResponse<WorkOrder>>>(
      `/customers/${customerId}/work-orders?page=${page}&size=${size}`
    )
    return response.data.data
  },
}
