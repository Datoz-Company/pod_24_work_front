import type { QueryClient } from '@tanstack/react-query'

/**
 * 작업·공정 상태에 따라 함께 바뀌는 화면 데이터 (칸반, 작업 상세, 주문 상태·진행률, 고객/회사 주문 목록, 작업 내역)
 * 전역 staleTime(5분) 때문에 하나라도 빠지면 새로고침 전까지 이전 상태가 보인다.
 */
const WORK_DATA_KEYS: readonly (readonly string[])[] = [
  ['kanban'],
  ['workOrder'],
  ['workOrders'],
  ['work-orders'],
  ['order'],
  ['orders'],
  ['customer-orders'],
  ['client-company-orders'],
]

/**
 * 작업 생성·수정·삭제, 공정 상태 변경, 칸반 카드 이동 후 관련 쿼리를 모두 무효화합니다.
 *
 * @param {QueryClient} queryClient - TanStack Query 클라이언트
 */
export function invalidateWorkData(queryClient: QueryClient): void {
  for (const queryKey of WORK_DATA_KEYS) {
    queryClient.invalidateQueries({ queryKey })
  }
}
