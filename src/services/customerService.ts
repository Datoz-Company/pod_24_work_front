import api from './api'
import type {
  ApiResponse,
  Customer,
  CustomerAddress,
  CustomerAddressRequest,
  CustomerCreateRequest,
  Order,
  PageResponse,
  ShippingInfo,
  WorkOrder,
} from '@/types'

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

  getOrders: async (customerId: number): Promise<PageResponse<Order>> => {
    const response = await api.get<ApiResponse<PageResponse<Order>>>(`/customers/${customerId}/orders`)
    return response.data.data
  },

  // 과거 주문의 배송지 목록 (배송지 불러오기)
  getShippingAddresses: async (customerId: number): Promise<ShippingInfo[]> => {
    const response = await api.get<ApiResponse<ShippingInfo[]>>(`/customers/${customerId}/shipping-addresses`)
    return response.data.data
  },

  // 배송지 주소록
  getAddresses: async (customerId: number): Promise<CustomerAddress[]> => {
    const response = await api.get<ApiResponse<CustomerAddress[]>>(`/customers/${customerId}/addresses`)
    return response.data.data
  },

  createAddress: async (customerId: number, data: CustomerAddressRequest): Promise<CustomerAddress> => {
    const response = await api.post<ApiResponse<CustomerAddress>>(`/customers/${customerId}/addresses`, data)
    return response.data.data
  },

  updateAddress: async (customerId: number, addressId: number, data: CustomerAddressRequest): Promise<CustomerAddress> => {
    const response = await api.put<ApiResponse<CustomerAddress>>(`/customers/${customerId}/addresses/${addressId}`, data)
    return response.data.data
  },

  deleteAddress: async (customerId: number, addressId: number): Promise<void> => {
    await api.delete(`/customers/${customerId}/addresses/${addressId}`)
  },
}
