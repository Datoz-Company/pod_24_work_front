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
  ClipboardList,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const menuItems = [
  { path: '/orders', label: '주문 관리', icon: ClipboardList },
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

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
}

export function Sidebar({ collapsed = false, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore()

  return (
    <div
      className={cn(
        'relative flex h-screen flex-col border-r border-gray-200 bg-white shadow-sm transition-[width] duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-md hover:bg-gray-50 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4 text-gray-600" />
        ) : (
          <ChevronLeft className="h-4 w-4 text-gray-600" />
        )}
      </button>

      {/* Logo Header */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 px-4 overflow-hidden">
        <img src="/logo.svg" alt="POD24" className="h-9 w-9 flex-shrink-0" />
        <div className={cn(
          'transition-opacity duration-300 whitespace-nowrap',
          collapsed ? 'opacity-0' : 'opacity-100'
        )}>
          <h1 className="text-lg font-bold text-gradient-pod24">POD24</h1>
          <p className="text-[10px] text-muted-foreground -mt-1">Work System</p>
        </div>
      </div>

      {/* Company Info */}
      {user?.companyName && (
        <div
          className="mx-3 mt-4 rounded-lg bg-gradient-to-r from-blue-50 to-cyan-50 p-2.5 overflow-hidden"
          title={collapsed ? user.companyName : undefined}
        >
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
            <span className={cn(
              'text-sm font-medium text-gray-700 whitespace-nowrap transition-opacity duration-300',
              collapsed ? 'opacity-0' : 'opacity-100'
            )}>
              {user.companyName}
            </span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 pt-4 px-3">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors overflow-hidden',
                isActive
                  ? 'bg-gradient-pod24 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              )
            }
          >
            <item.icon className="h-5 w-5 flex-shrink-0" />
            <span className={cn(
              'whitespace-nowrap transition-opacity duration-300',
              collapsed ? 'opacity-0' : 'opacity-100'
            )}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      <Separator />

      {/* Settings */}
      <div className="px-3 py-4">
        <NavLink
          to="/settings"
          title={collapsed ? '설정' : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm font-medium transition-colors overflow-hidden',
              isActive
                ? 'bg-gradient-pod24 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            )
          }
        >
          <Settings className="h-5 w-5 flex-shrink-0" />
          <span className={cn(
            'whitespace-nowrap transition-opacity duration-300',
            collapsed ? 'opacity-0' : 'opacity-100'
          )}>
            설정
          </span>
        </NavLink>
      </div>

      <Separator />

      {/* User Info & Logout */}
      <div className="px-3 py-4">
        <div
          className="mb-3 flex items-center gap-3 px-1 overflow-hidden"
          title={collapsed ? `${user?.name} (${getRoleLabel(user?.role)})` : undefined}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-pod24 text-white text-sm font-semibold flex-shrink-0">
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className={cn(
            'flex-1 min-w-0 whitespace-nowrap transition-opacity duration-300',
            collapsed ? 'opacity-0' : 'opacity-100'
          )}>
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
          title={collapsed ? '로그아웃' : undefined}
          className="w-full justify-start gap-3 px-2.5 text-gray-600 hover:bg-red-50 hover:text-red-600 overflow-hidden"
          onClick={logout}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span className={cn(
            'whitespace-nowrap transition-opacity duration-300',
            collapsed ? 'opacity-0' : 'opacity-100'
          )}>
            로그아웃
          </span>
        </Button>
      </div>
    </div>
  )
}
