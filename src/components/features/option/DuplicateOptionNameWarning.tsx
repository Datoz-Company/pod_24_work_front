import { AlertTriangle } from 'lucide-react'
import type { Option } from '@/types/option'

/**
 * 같은 이름(앞뒤 공백 무시)의 다른 옵션이 있는지 확인합니다.
 *
 * @param {readonly Option[]} options - 회사의 옵션 목록
 * @param {string} name - 입력한 옵션명
 * @param {number} [excludeId] - 수정 중인 옵션 id (자기 자신은 제외)
 * @returns {boolean} 같은 이름의 다른 옵션이 있으면 true
 */
export function hasDuplicateOptionName(options: readonly Option[], name: string, excludeId?: number): boolean {
  const trimmed = name.trim()
  if (!trimmed) return false
  return options.some((option) => option.id !== excludeId && option.name.trim() === trimmed)
}

/**
 * 복제본 기본 이름 — "이름 (복사)", 이미 있으면 "이름 (복사 2)", "이름 (복사 3)" ... (서버의 자동 이름 규칙과 동일)
 *
 * @param {readonly Option[]} options - 회사의 옵션 목록
 * @param {string} sourceName - 원본 옵션명
 * @returns {string} 겹치지 않는 복제본 이름
 */
export function nextCopyName(options: readonly Option[], sourceName: string): string {
  for (let n = 1; ; n++) {
    const candidate = `${sourceName} (복사${n === 1 ? '' : ` ${n}`})`
    if (!hasDuplicateOptionName(options, candidate)) return candidate
  }
}

interface DuplicateOptionNameWarningProps {
  options: readonly Option[]
  name: string
  excludeId?: number
}

/**
 * 옵션명이 다른 옵션과 겹칠 때 보여주는 경고. 저장은 막지 않는다 (옵션명 중복 허용).
 *
 * @param {DuplicateOptionNameWarningProps} props - 옵션 목록, 입력한 이름, 제외할 옵션 id
 */
export function DuplicateOptionNameWarning({ options, name, excludeId }: DuplicateOptionNameWarningProps) {
  if (!hasDuplicateOptionName(options, name, excludeId)) return null
  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-700" role="status">
      <AlertTriangle className="mt-px h-3.5 w-3.5 flex-shrink-0" />
      <span>
        같은 이름의 옵션이 이미 있습니다. 저장은 되지만, 상품에 옵션을 연결할 때 구분하기 어려울 수 있습니다.
      </span>
    </p>
  )
}
