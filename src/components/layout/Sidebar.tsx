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
  { path: '/customers', label: '고객 관리', icon: Users },
]

export function Sidebar() {
  const { user, logout } = useAuthStore()

  return (
    <div className="flex h-screen w-64 flex-col border-r bg-white">
      <div className="flex h-16 items-center border-b px-6">
        <h1 className="text-xl font-bold text-primary">POD24 MES</h1>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <Separator />

      <div className="p-4">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )
          }
        >
          <Settings className="h-5 w-5" />
          설정
        </NavLink>
      </div>

      <Separator />

      <div className="p-4">
        <div className="mb-2 px-3 text-sm text-muted-foreground">
          {user?.name} ({user?.role})
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          로그아웃
        </Button>
      </div>
    </div>
  )
}
