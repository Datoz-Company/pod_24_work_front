import api from './api'

/** 서버가 생성하는 문서 형식 */
export type DocumentFormat = 'xlsx' | 'pdf'

/**
 * 서버에서 생성한 문서(엑셀/PDF)를 받아 브라우저 다운로드를 시작합니다.
 *
 * @param {string} path - API 경로 (예: /orders/1/quote.xlsx)
 * @param {string} filename - 저장할 파일명
 * @returns {Promise<void>} 다운로드가 시작되면 resolve
 */
async function download(path: string, filename: string): Promise<void> {
  const response = await api.get<Blob>(path, { responseType: 'blob' })
  const url = URL.createObjectURL(response.data)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export const excelService = {
  /**
   * 작업 1건의 작업 지시서를 내려받습니다.
   *
   * @param {number} workOrderId - 작업 ID
   * @param {string} name - 파일명에 쓸 작업번호
   * @param {DocumentFormat} format - 'xlsx'(기본) 또는 'pdf'
   * @returns {Promise<void>} 다운로드가 시작되면 resolve
   */
  workInstruction: (workOrderId: number, name: string, format: DocumentFormat = 'xlsx') =>
    download(`/work-orders/${workOrderId}/instruction.${format}`, `작업지시서_${name}.${format}`),

  /**
   * 주문에 속한 모든 작업의 작업 지시서를 내려받습니다 (엑셀: 작업별 시트, PDF: 작업별 페이지).
   *
   * @param {number} orderId - 주문 ID
   * @param {string} orderNumber - 파일명에 쓸 주문번호
   * @param {DocumentFormat} format - 'xlsx'(기본) 또는 'pdf'
   * @returns {Promise<void>} 다운로드가 시작되면 resolve
   */
  orderWorkInstructions: (orderId: number, orderNumber: string, format: DocumentFormat = 'xlsx') =>
    download(`/orders/${orderId}/work-instructions.${format}`, `작업지시서_${orderNumber}.${format}`),

  /**
   * 주문 견적서 엑셀을 내려받습니다. (관리자 전용)
   *
   * @param {number} orderId - 주문 ID
   * @param {string} orderNumber - 파일명에 쓸 주문번호
   * @returns {Promise<void>} 다운로드가 시작되면 resolve
   */
  quote: (orderId: number, orderNumber: string) =>
    download(`/orders/${orderId}/quote.xlsx`, `견적서_${orderNumber}.xlsx`),
}
