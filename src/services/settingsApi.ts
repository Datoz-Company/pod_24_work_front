import api from './api';

// User Profile Types
export interface UserProfile {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: string;
  companyId: number;
  companyName: string;
  createdAt: string;
}

export interface UpdateProfileRequest {
  name: string;
  email?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Company Types
export interface CompanyInfo {
  id: number;
  name: string;
  description: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  createdAt: string;
}

export interface UpdateCompanyRequest {
  name: string;
  description?: string;
  phone?: string;
  email?: string;
  address?: string;
}

// Team Member Types
export interface TeamMember {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export interface InviteMemberRequest {
  username: string;
  password: string;
  name: string;
  email?: string;
  role?: string;
}

// User API
export const userApi = {
  getProfile: () => api.get<UserProfile>('/users/me'),
  updateProfile: (data: UpdateProfileRequest) => api.put<UserProfile>('/users/me', data),
  changePassword: (data: ChangePasswordRequest) => api.put('/users/me/password', data),
};

// Company API
export const companyApi = {
  getCompany: () => api.get<CompanyInfo>('/company'),
  updateCompany: (data: UpdateCompanyRequest) => api.put<CompanyInfo>('/company', data),
  getMembers: () => api.get<TeamMember[]>('/company/members'),
  inviteMember: (data: InviteMemberRequest) => api.post<TeamMember>('/company/members', data),
  updateMemberRole: (memberId: number, role: string) =>
    api.patch<TeamMember>(`/company/members/${memberId}/role`, { role }),
  removeMember: (memberId: number) => api.delete(`/company/members/${memberId}`),
  activateMember: (memberId: number) => api.patch<TeamMember>(`/company/members/${memberId}/activate`),
};
