import type { OrderStatus, ProcessStatus, WorkOrderStatus } from '@/types'

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline'

interface StatusMeta {
  label: string
  variant: BadgeVariant
}

/**
 * 상태 라벨은 이 파일 하나에서만 정의한다 — 화면마다 "진행중/작업 중/진행 중"처럼 달라지지 않도록.
 * - 작업(WorkOrder) 대기 상태는 "대기중", 개별 공정의 시작 전 상태는 "미착수"로 구분 (2026-10-22 미팅 결정)
 */
export const WORK_ORDER_STATUS: Record<WorkOrderStatus, StatusMeta> = {
  PENDING: { label: '대기중', variant: 'secondary' },
  IN_PROGRESS: { label: '작업 중', variant: 'default' },
  COMPLETED: { label: '작업 완료', variant: 'outline' },
  REJECTED: { label: '반려', variant: 'destructive' },
}

export const PROCESS_STATUS: Record<ProcessStatus, StatusMeta & { badgeClass: string }> = {
  NOT_STARTED: { label: '미착수', variant: 'outline', badgeClass: 'bg-gray-100 text-gray-600' },
  IN_PROGRESS: { label: '작업 중', variant: 'default', badgeClass: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: '작업 완료', variant: 'outline', badgeClass: 'bg-green-100 text-green-700' },
}

export const ORDER_STATUS: Record<OrderStatus, StatusMeta> = {
  PENDING: { label: '대기중', variant: 'secondary' },
  IN_PROGRESS: { label: '진행 중', variant: 'default' },
  COMPLETED: { label: '완료', variant: 'outline' },
  CANCELLED: { label: '취소', variant: 'destructive' },
}
