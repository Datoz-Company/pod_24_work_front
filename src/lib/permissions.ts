import { useAuthStore } from '@/stores/authStore'

/**
 * 견적서 열람 권한 — 회사 관리자(대표·디자인실장)와 시스템 관리자만.
 * 서버(SecurityHelper.canViewQuotes)와 같은 규칙이며, 화면 노출 여부 판단용입니다.
 */
export function useCanViewQuotes(): boolean {
  const role = useAuthStore((state) => state.user?.role)
  return role === 'COMPANY_ADMIN' || role === 'ADMIN'
}
