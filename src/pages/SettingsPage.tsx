import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'

export function SettingsPage() {
  const { user } = useAuthStore()

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">설정</h1>
      </div>

      <div className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>사용자 정보</CardTitle>
            <CardDescription>현재 로그인한 사용자 정보입니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">아이디</div>
                <div className="font-medium">{user?.username}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">이름</div>
                <div className="font-medium">{user?.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">권한</div>
                <div className="font-medium">{user?.role}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>시스템 정보</CardTitle>
            <CardDescription>POD24 작업지시서 관리 시스템</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              버전: 1.0.0
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
