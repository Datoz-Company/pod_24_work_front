import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserRole } from '@/types'

interface UserInfo {
  username: string
  name: string
  role: UserRole
  companyId?: number
  companyName?: string
}

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserInfo | null
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserInfo) => void
  login: (accessToken: string, refreshToken: string, user: UserInfo) => void
  logout: () => void
  // 헬퍼 메서드
  getCurrentCompanyId: () => number | undefined
  isCompanyAdmin: () => boolean
  isSystemAdmin: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken }),

      setUser: (user) => set({ user }),

      login: (accessToken, refreshToken, user) =>
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
        }),

      // 헬퍼 메서드
      getCurrentCompanyId: () => get().user?.companyId,

      isCompanyAdmin: () => get().user?.role === 'COMPANY_ADMIN',

      isSystemAdmin: () => get().user?.role === 'ADMIN',
    }),
    {
      name: 'auth-storage',
    }
  )
)
