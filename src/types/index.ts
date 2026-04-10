export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
export type ProcessStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER'

export interface User {
  id: number
  username: string
  name: string
  email?: string
  role: UserRole
}

export interface Process {
  id: number
  name: string
  displayOrder: number
  color: string
  isActive: boolean
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
  processes: WorkOrderProcess[]
  dueDate?: string
  createdAt: string
  completedAt?: string
  memo?: string
}

export interface KanbanCard {
  workOrderId: number
  workOrderProcessId: number
  orderNumber: string
  orderName: string
  productName?: string
  customerName?: string
  quantity: number
  processStatus: ProcessStatus
  workOrderStatus: WorkOrderStatus
  dueDate?: string
  currentProcessOrder: number
  totalProcesses: number
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
}

export interface WorkOrderCreateRequest {
  orderName: string
  productId: number
  customerId?: number
  quantity: number
  dueDate?: string
  memo?: string
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
