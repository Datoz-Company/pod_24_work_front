// 다음(카카오) 우편번호 서비스 — 무료, API 키 불필요
// https://postcode.map.daum.net/guide
const SCRIPT_URL = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'

export interface PostcodeResult {
  zonecode: string
  roadAddress: string
  jibunAddress: string
  buildingName: string
}

interface DaumPostcodeConstructor {
  new (options: { oncomplete: (data: PostcodeResult) => void }): { open: () => void }
}

declare global {
  interface Window {
    daum?: { Postcode: DaumPostcodeConstructor }
  }
}

let loadingPromise: Promise<void> | null = null

function loadScript(): Promise<void> {
  if (window.daum?.Postcode) {
    return Promise.resolve()
  }
  if (!loadingPromise) {
    loadingPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = SCRIPT_URL
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => {
        loadingPromise = null
        reject(new Error('주소 검색 서비스를 불러오지 못했습니다.'))
      }
      document.head.appendChild(script)
    })
  }
  return loadingPromise
}

/**
 * 주소 검색 팝업을 열고 선택 결과를 반환합니다.
 *
 * @returns {Promise<{ zipCode: string; address: string }>} 우편번호와 도로명 주소(건물명 포함)
 * @throws {Error} 스크립트 로드 실패 시
 */
export async function openAddressSearch(): Promise<{ zipCode: string; address: string }> {
  await loadScript()
  const Postcode = window.daum!.Postcode
  return new Promise((resolve) => {
    new Postcode({
      oncomplete: (data) => {
        const base = data.roadAddress || data.jibunAddress
        const address = data.buildingName ? `${base} (${data.buildingName})` : base
        resolve({ zipCode: data.zonecode, address })
      },
    }).open()
  })
}
