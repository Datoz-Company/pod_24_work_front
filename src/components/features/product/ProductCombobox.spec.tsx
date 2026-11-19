import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProductCombobox } from './ProductCombobox'
import type { Product } from '@/types'

const product = (id: number, name: string, category?: string): Product => ({
  id,
  name,
  category,
  isActive: true,
  createdAt: '2026-11-19T00:00:00',
})

const products = [
  product(1, '팔각정', '메뉴판'),
  product(2, 'H콤비 컬러밴드', '메뉴판'),
  product(3, '인쇄', '인쇄'),
  product(4, '종류없는상품'),
]

describe('ProductCombobox', () => {
  it('선택 전에는 placeholder, 선택 후에는 상품명을 보여준다', () => {
    const { rerender } = render(<ProductCombobox value={0} onChange={vi.fn()} products={products} placeholder="전체 상품에서 검색" />)
    expect(screen.getByRole('combobox')).toHaveTextContent('전체 상품에서 검색')

    rerender(<ProductCombobox value={2} onChange={vi.fn()} products={products} />)
    expect(screen.getByRole('combobox')).toHaveTextContent('H콤비 컬러밴드')
  })

  it('검색어로 목록을 걸러낸다', async () => {
    const user = userEvent.setup()
    render(<ProductCombobox value={0} onChange={vi.fn()} products={products} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('상품명 검색...'), '팔각')

    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('팔각정')
  })

  it('showCategory 면 상품 종류를 같이 보여주고, 종류가 없으면 미분류', async () => {
    const user = userEvent.setup()
    render(<ProductCombobox value={0} onChange={vi.fn()} products={products} showCategory />)

    await user.click(screen.getByRole('combobox'))

    expect(screen.getByRole('option', { name: /팔각정/ })).toHaveTextContent('메뉴판')
    expect(screen.getByRole('option', { name: /종류없는상품/ })).toHaveTextContent('미분류')
  })

  it('맞는 상품이 없으면 안내 문구를 보여준다', async () => {
    const user = userEvent.setup()
    render(<ProductCombobox value={0} onChange={vi.fn()} products={products} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('상품명 검색...'), '존재하지않음')

    expect(screen.queryAllByRole('option')).toHaveLength(0)
    expect(screen.getByText('"존재하지않음"에 맞는 상품이 없습니다.')).toBeInTheDocument()
  })

  it('상품을 고르면 onChange 로 상품을 넘기고 목록을 닫는다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ProductCombobox value={0} onChange={onChange} products={products} />)

    await user.click(screen.getByRole('combobox'))
    await user.click(screen.getByRole('option', { name: /H콤비 컬러밴드/ }))

    expect(onChange).toHaveBeenCalledWith(products[1])
    expect(screen.queryByPlaceholderText('상품명 검색...')).not.toBeInTheDocument()
  })

  it('다시 열면 검색어가 비어 있다', async () => {
    const user = userEvent.setup()
    render(<ProductCombobox value={0} onChange={vi.fn()} products={products} />)

    await user.click(screen.getByRole('combobox'))
    await user.type(screen.getByPlaceholderText('상품명 검색...'), '팔각')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('combobox'))

    expect(screen.getByPlaceholderText('상품명 검색...')).toHaveValue('')
    expect(screen.getAllByRole('option')).toHaveLength(4)
  })

  it('disabled 면 열리지 않는다', async () => {
    const user = userEvent.setup()
    render(<ProductCombobox value={1} onChange={vi.fn()} products={products} disabled />)

    expect(screen.getByRole('combobox')).toBeDisabled()
    await user.click(screen.getByRole('combobox'))
    expect(screen.queryByPlaceholderText('상품명 검색...')).not.toBeInTheDocument()
  })
})
