import api from './api'
import type { ApiResponse, WorkOrder, WorkOrderCreateRequest, PageResponse, WorkOrderStatus } from '@/types'

export const workOrderService = {
  getActive: async (): Promise<WorkOrder[]> => {
    const response = await api.get<ApiResponse<WorkOrder[]>>('/work-orders')
    return response.data.data
  },

  getById: async (id: number): Promise<WorkOrder> => {
    const response = await api.get<ApiResponse<WorkOrder>>(`/work-orders/${id}`)
    return response.data.data
  },

  getHistory: async (page = 0, size = 20): Promise<PageResponse<WorkOrder>> => {
    const response = await api.get<ApiResponse<PageResponse<WorkOrder>>>(
      `/work-orders/history?page=${page}&size=${size}`
    )
    return response.data.data
  },

  create: async (data: WorkOrderCreateRequest): Promise<WorkOrder> => {
    const response = await api.post<ApiResponse<WorkOrder>>('/work-orders', data)
    return response.data.data
  },

  update: async (id: number, data: Partial<WorkOrderCreateRequest>): Promise<WorkOrder> => {
    const response = await api.put<ApiResponse<WorkOrder>>(`/work-orders/${id}`, data)
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/work-orders/${id}`)
  },

  updateStatus: async (id: number, status: WorkOrderStatus): Promise<WorkOrder> => {
    const response = await api.patch<ApiResponse<WorkOrder>>(`/work-orders/${id}/status`, { status })
    return response.data.data
  },
}
