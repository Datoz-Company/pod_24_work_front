import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { userApi, companyApi, UpdateProfileRequest, ChangePasswordRequest, UpdateCompanyRequest, InviteMemberRequest } from '@/services/settingsApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { User, Lock, Building2, Users, Plus, UserMinus, UserCheck, Mail, Phone, MapPin } from 'lucide-react';

export function SettingsPage() {
  const { isCompanyAdmin, isSystemAdmin } = useAuthStore();
  const isAdmin = isCompanyAdmin() || isSystemAdmin();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">설정</h1>
        <p className="text-gray-500 mt-1">계정 및 회사 설정을 관리합니다</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="bg-white border shadow-sm p-1 h-auto">
          <TabsTrigger
            value="profile"
            className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
          >
            <User className="h-4 w-4 mr-2" />
            프로필
          </TabsTrigger>
          <TabsTrigger
            value="security"
            className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
          >
            <Lock className="h-4 w-4 mr-2" />
            보안
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger
                value="company"
                className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
              >
                <Building2 className="h-4 w-4 mr-2" />
                회사 정보
              </TabsTrigger>
              <TabsTrigger
                value="team"
                className="data-[state=active]:bg-primary data-[state=active]:text-white px-4 py-2"
              >
                <Users className="h-4 w-4 mr-2" />
                팀 관리
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile">
          <ProfileTab />
        </TabsContent>

        <TabsContent value="security">
          <SecurityTab />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="company">
              <CompanyTab />
            </TabsContent>

            <TabsContent value="team">
              <TeamTab />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

// 프로필 탭
function ProfileTab() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UpdateProfileRequest>({ name: '', email: '' });

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await userApi.getProfile();
      return res.data;
    },
  });

  // 프로필 데이터가 로드되면 폼 초기화
  useEffect(() => {
    if (profile) {
      setFormData({ name: profile.name, email: profile.email || '' });
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateProfileRequest) => userApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success('프로필이 업데이트되었습니다');
    },
    onError: () => {
      toast.error('프로필 업데이트에 실패했습니다');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>;
  }

  return (
    <Card className="bg-white shadow-sm border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">프로필 정보</CardTitle>
        <CardDescription>개인 정보를 수정합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">사용자명</Label>
            <Input id="username" value={profile?.username || ''} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">사용자명은 변경할 수 없습니다</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="이름을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label>소속 회사</Label>
            <Input value={profile?.companyName || ''} disabled className="bg-gray-50" />
          </div>

          <div className="space-y-2">
            <Label>가입일</Label>
            <Input
              value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ko-KR') : ''}
              disabled
              className="bg-gray-50"
            />
          </div>

          <Button type="submit" disabled={updateMutation.isPending} className="bg-gradient-pod24 hover:opacity-90">
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// 보안 탭
function SecurityTab() {
  const [formData, setFormData] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const changeMutation = useMutation({
    mutationFn: (data: ChangePasswordRequest) => userApi.changePassword(data),
    onSuccess: () => {
      toast.success('비밀번호가 변경되었습니다');
      setFormData({ currentPassword: '', newPassword: '' });
      setConfirmPassword('');
    },
    onError: () => {
      toast.error('비밀번호 변경에 실패했습니다. 현재 비밀번호를 확인해주세요.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다');
      return;
    }
    if (formData.newPassword.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    changeMutation.mutate(formData);
  };

  return (
    <Card className="bg-white shadow-sm border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">비밀번호 변경</CardTitle>
        <CardDescription>계정 보안을 위해 주기적으로 비밀번호를 변경하세요</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">현재 비밀번호</Label>
            <Input
              id="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              placeholder="현재 비밀번호를 입력하세요"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">새 비밀번호</Label>
            <Input
              id="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              placeholder="새 비밀번호를 입력하세요"
            />
            <p className="text-xs text-gray-500">최소 6자 이상 입력해주세요</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호를 다시 입력하세요"
            />
          </div>

          <Button type="submit" disabled={changeMutation.isPending} className="bg-gradient-pod24 hover:opacity-90">
            {changeMutation.isPending ? '변경 중...' : '비밀번호 변경'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// 회사 정보 탭
function CompanyTab() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<UpdateCompanyRequest>({
    name: '',
    description: '',
    phone: '',
    email: '',
    address: '',
  });

  const { data: company, isLoading } = useQuery({
    queryKey: ['company'],
    queryFn: async () => {
      const res = await companyApi.getCompany();
      return res.data;
    },
  });

  // 회사 데이터가 로드되면 폼 초기화
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        description: company.description || '',
        phone: company.phone || '',
        email: company.email || '',
        address: company.address || '',
      });
    }
  }, [company]);

  const updateMutation = useMutation({
    mutationFn: (data: UpdateCompanyRequest) => companyApi.updateCompany(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success('회사 정보가 업데이트되었습니다');
    },
    onError: () => {
      toast.error('회사 정보 업데이트에 실패했습니다');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>;
  }

  return (
    <Card className="bg-white shadow-sm border max-w-2xl">
      <CardHeader>
        <CardTitle className="text-xl">회사 정보</CardTitle>
        <CardDescription>회사의 기본 정보를 관리합니다</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyName">회사명</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="companyName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="회사명을 입력하세요"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">회사 설명</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="회사에 대한 간단한 설명을 입력하세요"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">연락처</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="02-1234-5678"
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyEmail">이메일</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="companyEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="info@company.com"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="회사 주소를 입력하세요"
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>등록일</Label>
            <Input
              value={company?.createdAt ? new Date(company.createdAt).toLocaleDateString('ko-KR') : ''}
              disabled
              className="bg-gray-50"
            />
          </div>

          <Button type="submit" disabled={updateMutation.isPending} className="bg-gradient-pod24 hover:opacity-90">
            {updateMutation.isPending ? '저장 중...' : '저장'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// 팀 관리 탭
function TeamTab() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteData, setInviteData] = useState<InviteMemberRequest>({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'COMPANY_MANAGER',
  });

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const res = await companyApi.getMembers();
      return res.data;
    },
  });

  const inviteMutation = useMutation({
    mutationFn: (data: InviteMemberRequest) => companyApi.inviteMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('팀원이 추가되었습니다');
      setIsInviteOpen(false);
      setInviteData({ username: '', password: '', name: '', email: '', role: 'COMPANY_MANAGER' });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '팀원 추가에 실패했습니다';
      toast.error(message);
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: number) => companyApi.removeMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('팀원이 비활성화되었습니다');
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '팀원 비활성화에 실패했습니다';
      toast.error(message);
    },
  });

  const activateMutation = useMutation({
    mutationFn: (memberId: number) => companyApi.activateMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success('팀원이 활성화되었습니다');
    },
    onError: () => {
      toast.error('팀원 활성화에 실패했습니다');
    },
  });

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (inviteData.username.length < 4) {
      toast.error('사용자명은 4자 이상이어야 합니다');
      return;
    }
    if (inviteData.password.length < 6) {
      toast.error('비밀번호는 6자 이상이어야 합니다');
      return;
    }
    if (!inviteData.name.trim()) {
      toast.error('이름을 입력해주세요');
      return;
    }
    inviteMutation.mutate(inviteData);
  };

  // 현재 사용자인지 확인
  const isCurrentUser = (memberUsername: string) => user?.username === memberUsername;

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">로딩 중...</div>;
  }

  return (
    <Card className="bg-white shadow-sm border max-w-4xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">팀 관리</CardTitle>
          <CardDescription>팀원을 추가하고 관리합니다</CardDescription>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-pod24 hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              팀원 추가
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>팀원 추가</DialogTitle>
              <DialogDescription>새로운 팀원의 계정을 생성합니다</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleInvite} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="inviteUsername">사용자명 *</Label>
                <Input
                  id="inviteUsername"
                  value={inviteData.username}
                  onChange={(e) => setInviteData({ ...inviteData, username: e.target.value })}
                  placeholder="4자 이상 입력"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invitePassword">비밀번호 *</Label>
                <Input
                  id="invitePassword"
                  type="password"
                  value={inviteData.password}
                  onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
                  placeholder="6자 이상 입력"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteName">이름 *</Label>
                <Input
                  id="inviteName"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  placeholder="팀원 이름"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">이메일</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  placeholder="이메일 주소 (선택)"
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                  취소
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending} className="bg-gradient-pod24 hover:opacity-90">
                  {inviteMutation.isPending ? '추가 중...' : '추가'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.length === 0 ? (
            <div className="text-center py-8 text-gray-500">팀원이 없습니다</div>
          ) : (
            members.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  member.isActive ? 'bg-white' : 'bg-gray-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-pod24 flex items-center justify-center text-white font-medium">
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{member.name}</span>
                      {isCurrentUser(member.username) && (
                        <Badge variant="outline" className="text-xs">
                          나
                        </Badge>
                      )}
                      {!member.isActive && (
                        <Badge variant="secondary" className="text-xs">
                          비활성
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      @{member.username}
                      {member.email && ` · ${member.email}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* 자기 자신은 비활성화/활성화 버튼 숨김 */}
                  {!isCurrentUser(member.username) && (
                    member.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('이 팀원을 비활성화하시겠습니까?')) {
                            removeMutation.mutate(member.id);
                          }
                        }}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <UserMinus className="h-4 w-4 mr-1" />
                        비활성화
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => activateMutation.mutate(member.id)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                      >
                        <UserCheck className="h-4 w-4 mr-1" />
                        활성화
                      </Button>
                    )
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default SettingsPage;
