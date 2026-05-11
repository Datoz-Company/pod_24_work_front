import api from './api'
import type { ApiResponse, KanbanColumn, KanbanMoveRequest, WorkOrder, ProcessStatus } from '@/types'

export const kanbanService = {
  getBoard: async (orderId?: number): Promise<KanbanColumn[]> => {
    const params = orderId ? `?orderId=${orderId}` : ''
    const response = await api.get<ApiResponse<KanbanColumn[]>>(`/kanban${params}`)
    return response.data.data
  },

  moveCard: async (data: KanbanMoveRequest): Promise<WorkOrder> => {
    const response = await api.patch<ApiResponse<WorkOrder>>('/kanban/move', data)
    return response.data.data
  },

  updateProcessStatus: async (workOrderProcessId: number, status: ProcessStatus): Promise<WorkOrder> => {
    const response = await api.patch<ApiResponse<WorkOrder>>('/kanban/process-status', {
      workOrderProcessId,
      status,
    })
    return response.data.data
  },

  startWork: async (workOrderId: number): Promise<WorkOrder> => {
    const response = await api.post<ApiResponse<WorkOrder>>('/kanban/start-work', { workOrderId })
    return response.data.data
  },

  resetAllProcesses: async (workOrderId: number): Promise<WorkOrder> => {
    const response = await api.post<ApiResponse<WorkOrder>>('/kanban/reset-all-processes', { workOrderId })
    return response.data.data
  },

  deleteWorkOrderProcess: async (workOrderProcessId: number): Promise<WorkOrder> => {
    const response = await api.delete<ApiResponse<WorkOrder>>(`/kanban/process/${workOrderProcessId}`)
    return response.data.data
  },
}
