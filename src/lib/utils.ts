import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * null / undefined가 아닌 값만 남기는 타입 가드 (filter용).
 *
 * @template T - 요소 타입
 * @param {T | null | undefined} x - 검사할 값
 * @returns {boolean} 값이 있으면 true
 */
export function isNotNil<T>(x: T | null | undefined): x is T {
  return x != null
}
