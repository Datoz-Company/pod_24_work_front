import api from './api'
import type { ApiResponse, Process, ProcessCreateRequest } from '@/types'

export const processService = {
  getAll: async (): Promise<Process[]> => {
    const response = await api.get<ApiResponse<Process[]>>('/processes')
    return response.data.data
  },

  getById: async (id: number): Promise<Process> => {
    const response = await api.get<ApiResponse<Process>>(`/processes/${id}`)
    return response.data.data
  },

  create: async (data: ProcessCreateRequest): Promise<Process> => {
    const response = await api.post<ApiResponse<Process>>('/processes', data)
    return response.data.data
  },

  update: async (id: number, data: ProcessCreateRequest): Promise<Process> => {
    const response = await api.put<ApiResponse<Process>>(`/processes/${id}`, data)
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/processes/${id}`)
  },

  reorder: async (processIds: number[]): Promise<Process[]> => {
    const response = await api.put<ApiResponse<Process[]>>('/processes/reorder', { processIds })
    return response.data.data
  },
}
