import api from './api'

/**
 * 서버에서 생성한 엑셀 파일을 받아 브라우저 다운로드를 시작합니다.
 *
 * @param {string} path - API 경로 (예: /orders/1/quote.xlsx)
 * @param {string} filename - 저장할 파일명
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
  workInstruction: (workOrderId: number, name: string) =>
    download(`/work-orders/${workOrderId}/instruction.xlsx`, `작업지시서_${name}.xlsx`),

  orderWorkInstructions: (orderId: number, orderNumber: string) =>
    download(`/orders/${orderId}/work-instructions.xlsx`, `작업지시서_${orderNumber}.xlsx`),

  // 관리자 전용
  quote: (orderId: number, orderNumber: string) =>
    download(`/orders/${orderId}/quote.xlsx`, `견적서_${orderNumber}.xlsx`),
}
