export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
export type ProcessStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type UserRole = 'ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_MANAGER'

export interface User {
  id: number
  username: string
  name: string
  email?: string
  role: UserRole
  companyId?: number
  companyName?: string
}

export interface Process {
  id: number
  name: string
  displayOrder: number
  color: string
  isActive: boolean
  isSystem?: boolean
  systemType?: 'PENDING' | 'COMPLETED'
}

export interface Customer {
  id: number
  name: string
  phone?: string
  email?: string
  address?: string
  memo?: string
  createdAt: string
}

export interface Product {
  id: number
  name: string
  category?: string
  description?: string
  isActive: boolean
  processes?: Process[]
  createdAt: string
}

export interface OrderSummary {
  id: number
  orderNumber: string
  orderName: string
  customerName?: string
  status: OrderStatus
  workOrderCount: number
  completedCount: number
}

export interface WorkOrderSummary {
  id: number
  orderNumber: string
  orderName: string
  productName?: string
  customerName?: string
  quantity: number
  status: WorkOrderStatus
  dueDate?: string
  createdAt: string
  completedAt?: string
}

export interface Order {
  id: number
  orderNumber: string
  orderName: string
  customer?: Customer
  status: OrderStatus
  workOrders: WorkOrderSummary[]
  workOrderCount: number
  completedCount: number
  orderDate?: string
  dueDate?: string
  completedAt?: string
  memo?: string
  createdAt: string
}

export interface OrderCreateRequest {
  orderName: string
  customerId?: number
  orderDate?: string
  dueDate?: string
  memo?: string
}

export interface OrderUpdateRequest {
  orderName?: string
  customerId?: number
  orderDate?: string
  dueDate?: string
  memo?: string
}

export interface WorkOrderProcess {
  id: number
  process: Process
  status: ProcessStatus
  displayOrder: number
  startedAt?: string
  completedAt?: string
}

export interface WorkOrder {
  id: number
  orderNumber: string
  orderName: string
  quantity: number
  status: WorkOrderStatus
  product: Product
  customer?: Customer
  order?: OrderSummary
  processes: WorkOrderProcess[]
  options?: WorkOrderOption[]
  dueDate?: string
  createdAt: string
  completedAt?: string
  memo?: string
}

// 완료된 공정 상세 정보 (드래그 가능한 미니 카드용)
export interface CompletedProcessInfo {
  workOrderProcessId: number
  processId: number
  processName: string
  processColor: string
  displayOrder: number
}

export interface KanbanCard {
  workOrderId: number
  workOrderProcessId?: number
  orderNumber: string
  orderName: string
  productName?: string
  customerName?: string
  quantity: number
  processStatus: ProcessStatus
  workOrderStatus: WorkOrderStatus
  dueDate?: string
  currentProcessOrder?: number
  totalProcesses: number
  // 현재 공정명 (중간 공정 카드용)
  processName?: string
  // 완료된 공정 목록 - 문자열 (레거시)
  completedProcesses?: string[]
  // 완료된 공정 상세 정보 (드래그 가능한 미니 카드용)
  completedProcessInfos?: CompletedProcessInfo[]
}

export interface KanbanColumn {
  process: Process
  cards: KanbanCard[]
}

export interface ApiResponse<T> {
  success: boolean
  message?: string
  data: T
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  first: boolean
  last: boolean
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  username: string
  name: string
  role: UserRole
  companyId?: number
  companyName?: string
}

import type { WorkOrderOptionRequest, WorkOrderOption } from './option'

export interface WorkOrderCreateRequest {
  orderName: string
  productId: number
  customerId?: number
  orderId?: number
  quantity: number
  dueDate?: string
  memo?: string
  options?: WorkOrderOptionRequest[]
}

export interface ProcessCreateRequest {
  name: string
  color?: string
}

export interface CustomerCreateRequest {
  name: string
  phone?: string
  email?: string
  address?: string
  memo?: string
}

export interface ProductCreateRequest {
  name: string
  category?: string
  description?: string
  processIds?: number[]
}

export interface KanbanMoveRequest {
  workOrderId: number
  targetProcessId: number
  newStatus?: ProcessStatus
}

export interface Attachment {
  id: number
  workOrderId: number
  originalFilename: string
  contentType: string
  fileSize: number
  downloadUrl: string
  thumbnailUrl?: string
  createdAt: string
}
