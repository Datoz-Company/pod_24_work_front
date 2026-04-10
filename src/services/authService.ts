import api from './api'
import type { ApiResponse, LoginRequest, LoginResponse } from '@/types'

export const authService = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', data)
    return response.data.data
  },

  register: async (data: { username: string; password: string; name: string; email?: string }) => {
    const response = await api.post<ApiResponse<void>>('/auth/register', data)
    return response.data
  },

  refresh: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await api.post<ApiResponse<LoginResponse>>('/auth/refresh', { refreshToken })
    return response.data.data
  },
}
