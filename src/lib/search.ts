/**
 * 이름에 검색어가 들어간 항목만 고릅니다 (대소문자 무시, 앞뒤 공백 무시).
 * 검색어가 비어 있으면 전체를 그대로 돌려줍니다.
 *
 * @template T - name 을 가진 항목 타입
 * @param {readonly T[]} items - 대상 목록 (변경하지 않음)
 * @param {string} keyword - 검색어
 * @returns {T[]} 걸러진 새 배열
 *
 * @example
 * filterByName([{ name: '팔각정' }, { name: '노블' }], ' 팔각 ')
 * // => [{ name: '팔각정' }]
 */
export function filterByName<T extends { name: string }>(items: readonly T[], keyword: string): T[] {
  const normalized = keyword.trim().toLowerCase()
  if (!normalized) return [...items]
  return items.filter((item) => item.name.toLowerCase().includes(normalized))
}
