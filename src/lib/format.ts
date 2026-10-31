import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

/**
 * 화면 공통 표시 형식 — 날짜·용량 형식이 화면마다 달라지지 않도록 이 파일만 사용한다.
 */

/**
 * 파일 용량을 B / KB / MB 단위로 표시합니다.
 *
 * @param {number} bytes - 바이트 수
 * @returns {string} 예: "1.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * 날짜 (예: 2026-10-29). 값이 없으면 "-".
 *
 * @param {string} [value] - ISO 날짜 문자열
 * @returns {string} 표시 문자열
 */
export function formatDate(value?: string | null): string {
  return value ? format(new Date(value), 'yyyy-MM-dd') : '-'
}

/**
 * 날짜 + 시간 (예: 2026-10-29 14:30). 값이 없으면 "-".
 *
 * @param {string} [value] - ISO 날짜 문자열
 * @returns {string} 표시 문자열
 */
export function formatDateTime(value?: string | null): string {
  return value ? format(new Date(value), 'yyyy-MM-dd HH:mm') : '-'
}

/**
 * 출고 예정일 — 요일이 작업 일정에 중요하므로 요일까지 표시 (예: 2026-10-29 (목)). 값이 없으면 "-".
 *
 * @param {string} [value] - ISO 날짜 문자열
 * @returns {string} 표시 문자열
 */
export function formatDueDate(value?: string | null): string {
  return value ? format(new Date(value), 'yyyy-MM-dd (EEE)', { locale: ko }) : '-'
}

/**
 * 출고 예정일이 지났는지 (오늘 0시 기준).
 *
 * @param {string} [dueDate] - 출고 예정일
 * @returns {boolean} 지연 여부
 */
export function isOverdue(dueDate?: string | null): boolean {
  if (!dueDate) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return new Date(dueDate) < today
}
