import { describe, expect, it } from 'vitest'
import { filterByName } from './search'

const items = [{ name: '팔각정' }, { name: 'H콤비 컬러밴드' }, { name: 'H콤비 원단색상' }, { name: '노블' }]

describe('filterByName', () => {
  it('이름 일부로 걸러낸다', () => {
    expect(filterByName(items, '팔각')).toEqual([{ name: '팔각정' }])
  })

  it('대소문자를 구분하지 않는다', () => {
    expect(filterByName(items, 'h콤비')).toHaveLength(2)
  })

  it('앞뒤 공백은 무시한다', () => {
    expect(filterByName(items, '  노블  ')).toEqual([{ name: '노블' }])
  })

  it('검색어가 비어 있거나 공백뿐이면 전체를 돌려준다', () => {
    expect(filterByName(items, '')).toEqual(items)
    expect(filterByName(items, '   ')).toEqual(items)
  })

  it('맞는 항목이 없으면 빈 배열', () => {
    expect(filterByName(items, '없는이름')).toEqual([])
  })

  it('원본 배열을 바꾸지 않고 새 배열을 돌려준다', () => {
    const result = filterByName(items, '')
    expect(result).not.toBe(items)
    expect(items).toHaveLength(4)
  })

  it('빈 목록이면 빈 배열', () => {
    expect(filterByName([], '팔각')).toEqual([])
  })
})
