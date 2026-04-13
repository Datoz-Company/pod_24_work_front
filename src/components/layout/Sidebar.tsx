import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  ListTodo,
  Package,
  Users,
  Settings,
  History,
  Workflow,
  LogOut,
  Building2,
  Sliders,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const menuItems = [
  { path: '/work-status', label: '작업 현황 관리', icon: LayoutDashboard },
  { path: '/processes', label: '공정 관리', icon: Workflow },
  { path: '/product-processes', label: '상품별 작업 공정', icon: ListTodo },
  { path: '/work-history', label: '작업 내역', icon: History },
  { path: '/products', label: '상품 관리', icon: Package },
  { path: '/options', label: '옵션 관리', icon: Sliders },
  { path: '/customers', label: '고객 관리', icon: Users },
]

const getRoleLabel = (role?: string) => {
  switch (role) {
    case 'ADMIN':
      return '시스템관리자'
    case 'COMPANY_ADMIN':
      return '회사관리자'
    case 'COMPANY_MANAGER':
      return '매니저'
    default:
      return role
  }
}

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex h-screen w-64 flex-col border-r border-gray-200 bg-white shadow-sm">
      {/* Logo Header */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-5">
        <img src="/logo.svg" alt="POD24" className="h-9 w-9" />
        <div>
          <h1 className="text-lg font-bold text-gradient-pod24">POD24</h1>
          <p className="text-[10px] text-muted-foreground -mt-1">Work System</p>
        </div>
      </div>

      {/* Company Info */}
      {user?.companyName && (
        <div className="mx-4 mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 p-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-gray-700">
              {user.companyName}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4 pt-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                isActive
                  ? 'bg-gradient-pod24 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* Settings */}
      <div className="p-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
              isActive
                ? 'bg-gradient-pod24 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <Settings className="h-5 w-5" />
          설정
        </NavLink>
      </div>

      <Separator />

      {/* User Info & Logout */}
      <div className="p-4">
        <div className="mb-3 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-pod24 text-white text-sm font-semibold">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="truncate text-sm font-medium text-gray-900">
              {user?.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {getRoleLabel(user?.role)}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-gray-600 hover:bg-red-50 hover:text-red-600"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}
