import api from './api'
import type { ApiResponse, Order, OrderCreateRequest, OrderUpdateRequest, OrderStatus, PageResponse } from '@/types'

export const orderService = {
  getAll: async (page = 0, size = 20): Promise<PageResponse<Order>> => {
    const response = await api.get<ApiResponse<PageResponse<Order>>>(
      `/orders?page=${page}&size=${size}`
    )
    return response.data.data
  },

  getActive: async (): Promise<Order[]> => {
    const response = await api.get<ApiResponse<Order[]>>('/orders/active')
    return response.data.data
  },

  getById: async (id: number): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/orders/${id}`)
    return response.data.data
  },

  create: async (data: OrderCreateRequest): Promise<Order> => {
    const response = await api.post<ApiResponse<Order>>('/orders', data)
    return response.data.data
  },

  update: async (id: number, data: OrderUpdateRequest): Promise<Order> => {
    const response = await api.put<ApiResponse<Order>>(`/orders/${id}`, data)
    return response.data.data
  },

  delete: async (id: number, cascadeDelete = false): Promise<void> => {
    await api.delete(`/orders/${id}?cascadeDelete=${cascadeDelete}`)
  },

  updateStatus: async (id: number, status: OrderStatus): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/orders/${id}/status`, { status })
    return response.data.data
  },

  addWorkOrder: async (orderId: number, workOrderId: number): Promise<Order> => {
    const response = await api.post<ApiResponse<Order>>(
      `/orders/${orderId}/work-orders/${workOrderId}`
    )
    return response.data.data
  },

  removeWorkOrder: async (orderId: number, workOrderId: number): Promise<Order> => {
    const response = await api.delete<ApiResponse<Order>>(
      `/orders/${orderId}/work-orders/${workOrderId}`
    )
    return response.data.data
  },
}
