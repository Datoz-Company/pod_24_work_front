import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { OrderItemCard, createEmptyOrderItem, type OrderItemFormData } from './OrderItemCard'
import type { Process, Product } from '@/types'

vi.mock('@/services/optionService', () => ({
  optionService: { getProductOptions: vi.fn().mockResolvedValue([]) },
}))

const process = (id: number, name: string, isSystem = false) => ({ id, name, color: '#000', isSystem }) as unknown as Process

const products: Product[] = [
  { id: 1, name: '팔각정', category: '메뉴판', isActive: true, createdAt: '', processes: [process(10, '인쇄'), process(11, '완료', true)] },
  { id: 2, name: '명함', category: '인쇄', isActive: true, createdAt: '', processes: [process(20, '재단')] },
  { id: 3, name: '종류없음', isActive: true, createdAt: '', processes: [] },
]

function renderCard(item: OrderItemFormData, props: Partial<Parameters<typeof OrderItemCard>[0]> = {}) {
  const onChange = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <OrderItemCard item={item} index={0} products={products} canDelete={false} onChange={onChange} onRemove={vi.fn()} {...props} />
    </QueryClientProvider>
  )
  return { onChange }
}

const productCombobox = () => screen.getAllByRole('combobox')[1]

describe('OrderItemCard 상품 선택', () => {
  it('상품 종류를 안 골라도 상품 칸이 열리고 전체 상품에서 검색된다', async () => {
    const user = userEvent.setup()
    renderCard(createEmptyOrderItem())

    expect(productCombobox()).toBeEnabled()
    expect(productCombobox()).toHaveTextContent('전체 상품에서 검색')

    await user.click(productCombobox())
    expect(screen.getAllByRole('option')).toHaveLength(3)
  })

  it('종류 없이 상품을 고르면 상품 종류·공정이 같이 채워진다 (시스템 공정 제외)', async () => {
    const user = userEvent.setup()
    const { onChange } = renderCard(createEmptyOrderItem())

    await user.click(productCombobox())
    await user.type(screen.getByPlaceholderText('상품명 검색...'), '팔각')
    await user.click(screen.getByRole('option', { name: /팔각정/ }))

    expect(onChange).toHaveBeenCalledWith({ category: '메뉴판', productId: 1, options: [], processIds: [10] })
  })

  it('상품 종류가 없는 상품을 고르면 종류는 미분류', async () => {
    const user = userEvent.setup()
    const { onChange } = renderCard(createEmptyOrderItem())

    await user.click(productCombobox())
    await user.click(screen.getByRole('option', { name: /종류없음/ }))

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ category: '미분류', productId: 3 }))
  })

  it('상품 종류를 골라 두면 그 종류의 상품만 보인다', async () => {
    const user = userEvent.setup()
    renderCard({ ...createEmptyOrderItem(), category: '인쇄' })

    await user.click(productCombobox())
    const options = screen.getAllByRole('option')
    expect(options).toHaveLength(1)
    expect(options[0]).toHaveTextContent('명함')
  })

  it('lockProduct 면 상품을 바꿀 수 없다', () => {
    renderCard({ ...createEmptyOrderItem(), category: '메뉴판', productId: 1 }, { lockProduct: true })

    expect(productCombobox()).toBeDisabled()
    expect(productCombobox()).toHaveTextContent('팔각정')
  })
})
