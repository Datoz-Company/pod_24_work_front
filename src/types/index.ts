export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED'
export type ProcessStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
export type OrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type UserRole = 'ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_MANAGER'
export type ClientCompanyType = 'COMPANY' | 'BRAND'
export type OrderSource = 'OWN_MALL' | 'SMART_STORE' | 'NAVER_PAY' | 'PHONE' | 'KAKAO' | 'ETC'
export type ShippingMethod = 'PARCEL' | 'VISIT' | 'QUICK' | 'OVERSEAS'

export const ORDER_SOURCE_LABELS: Record<OrderSource, string> = {
  OWN_MALL: '자체몰(메뉴랩)',
  SMART_STORE: '스마트스토어',
  NAVER_PAY: '네이버페이',
  PHONE: '전화',
  KAKAO: '카카오톡',
  ETC: '기타',
}

export const SHIPPING_METHOD_LABELS: Record<ShippingMethod, string> = {
  PARCEL: '택배',
  VISIT: '방문',
  QUICK: '퀵',
  OVERSEAS: '해외배송',
}

// 고객사: 회사(최상위) / 브랜드(회사 하위)
export interface ClientCompany {
  id: number
  name: string
  displayName: string
  type: ClientCompanyType
  parentId?: number
  memo?: string
  brands?: ClientCompany[]
}

export interface ClientCompanyRequest {
  name: string
  parentId?: number
  memo?: string
}

// 배송지 (방문 수령이어도 값 유지)
export interface ShippingInfo {
  recipientName?: string
  recipientPhone?: string
  zipCode?: string
  address?: string
  addressDetail?: string
  deliveryMessage?: string
}

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
  clientCompanyId?: number
  clientCompanyName?: string
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
  clientName?: string
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
  clientCompany?: ClientCompany
  orderSource?: OrderSource
  shippingMethod?: ShippingMethod
  shippingInfo?: ShippingInfo
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
  clientCompanyId?: number
  orderSource?: OrderSource
  shippingMethod?: ShippingMethod
  shippingInfo?: ShippingInfo
  orderDate?: string
  dueDate?: string
  memo?: string
}

export type OrderUpdateRequest = Partial<OrderCreateRequest>

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
  orderId?: number  // 상위 주문 ID
  orderNumber: string
  orderName: string
  orderGroupName?: string  // 상위 주문명 (주문에 속한 작업인 경우)
  productName?: string
  customerName?: string
  clientName?: string  // 상호명 (고객사 회사/브랜드명)
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
  processIds?: number[]  // 선택된 공정 ID 목록 (미지정 시 상품의 전체 공정 적용)
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
  clientCompanyId?: number
  clientCompanyName?: string
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

export type OrderFileCategory = 'QUOTE' | 'DESIGN'

export interface OrderAttachment {
  id: number
  orderId: number
  orderNumber: string
  category: OrderFileCategory
  originalFilename: string
  contentType: string
  fileSize: number
  downloadUrl: string
  uploadedBy?: string
  createdAt: string
}
