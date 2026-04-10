import api from './api'
import type { ApiResponse, Product, ProductCreateRequest, PageResponse } from '@/types'

export const productService = {
  getAll: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products/all')
    return response.data.data
  },

  getAllWithProcesses: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>('/products/with-processes')
    return response.data.data
  },

  getPage: async (page = 0, size = 20, keyword?: string): Promise<PageResponse<Product>> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) })
    if (keyword) params.append('keyword', keyword)
    const response = await api.get<ApiResponse<PageResponse<Product>>>(`/products?${params}`)
    return response.data.data
  },

  getById: async (id: number): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`)
    return response.data.data
  },

  create: async (data: ProductCreateRequest): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>('/products', data)
    return response.data.data
  },

  update: async (id: number, data: ProductCreateRequest): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/products/${id}`, data)
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/products/${id}`)
  },

  updateProcesses: async (productId: number, processIds: number[]): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(`/products/${productId}/processes`, { processIds })
    return response.data.data
  },
}
