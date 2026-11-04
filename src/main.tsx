import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { MutationCache, QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
import App from './App'
import './index.css'

/**
 * 서버 오류 응답에서 사용자에게 보여줄 메시지를 꺼냅니다.
 */
function getErrorMessage(error: unknown): string {
  const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message
  return message || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.'
}

const queryClient = new QueryClient({
  // 개별 onError가 없는 mutation의 실패도 화면에 알림 (실패가 조용히 묻히지 않도록)
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.options.onError) return
      toast.error(getErrorMessage(error))
    },
  }),
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster position="bottom-right" richColors />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
