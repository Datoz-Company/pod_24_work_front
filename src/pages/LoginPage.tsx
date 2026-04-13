import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 회원가입 후 리다이렉트된 경우 메시지 표시
  const justRegistered = location.state?.registered === true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await authService.login({ username, password })
      login(response.accessToken, response.refreshToken, {
        username: response.username,
        name: response.name,
        role: response.role,
        companyId: response.companyId,
        companyName: response.companyName,
      })
      navigate('/work-status')
    } catch (err) {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="POD24" className="h-16 w-16" />
          </div>
          <CardTitle className="text-2xl font-bold text-gradient-pod24">POD24 Work</CardTitle>
          <CardDescription className="text-base">작업지시서 관리 시스템</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">아이디</Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="아이디를 입력하세요"
                className="focus-visible:ring-[#0073FF]"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="focus-visible:ring-[#0073FF]"
                required
              />
            </div>
            {justRegistered && (
              <p className="text-sm text-green-600 bg-green-50 p-2 rounded">
                회원가입이 완료되었습니다. 로그인해주세요.
              </p>
            )}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              type="submit"
              className="w-full bg-gradient-pod24 hover:opacity-90 transition-opacity"
              disabled={isLoading}
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </Button>
          </form>
          <div className="mt-6 pt-4 border-t text-center text-sm">
            <p className="text-muted-foreground">
              계정이 없으신가요?{' '}
              <Link to="/register" className="text-primary font-medium hover:underline">
                회원가입
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
