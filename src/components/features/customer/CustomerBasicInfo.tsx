import { Link } from 'react-router-dom'
import { User, Phone, Mail, Building2, FileText, Calendar } from 'lucide-react'
import type { Customer } from '@/types'
import { formatDate } from '@/lib/format'

interface CustomerBasicInfoProps {
  customer: Customer
}

export function CustomerBasicInfo({ customer }: CustomerBasicInfoProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {/* 고객명 */}
        <div className="flex items-center gap-3">
          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground min-w-[60px]">고객명</span>
          <span className="text-sm font-medium">{customer.name}</span>
        </div>

        {/* 전화번호 */}
        <div className="flex items-center gap-3">
          <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground min-w-[60px]">전화번호</span>
          <span className="text-sm font-medium">
            {customer.phone ? (
              <a
                href={`tel:${customer.phone}`}
                className="text-primary hover:underline"
              >
                {customer.phone}
              </a>
            ) : (
              '-'
            )}
          </span>
        </div>

        {/* 이메일 */}
        <div className="flex items-center gap-3">
          <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground min-w-[60px]">이메일</span>
          <span className="text-sm font-medium">
            {customer.email ? (
              <a
                href={`mailto:${customer.email}`}
                className="text-primary hover:underline"
              >
                {customer.email}
              </a>
            ) : (
              '-'
            )}
          </span>
        </div>

        {/* 소속 회사 */}
        <div className="flex items-center gap-3">
          <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground min-w-[60px]">소속 회사</span>
          <span className="text-sm font-medium">
            {customer.clientCompanyId ? (
              <Link to={`/companies/${customer.clientCompanyId}`} className="text-primary hover:underline">
                {customer.clientCompanyName}
              </Link>
            ) : (
              '-'
            )}
          </span>
        </div>

        {/* 메모 */}
        {customer.memo && (
          <div className="flex items-start gap-3">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
            <span className="text-sm text-muted-foreground min-w-[60px]">메모</span>
            <span className="text-sm whitespace-pre-wrap">{customer.memo}</span>
          </div>
        )}

        {/* 등록일 */}
        <div className="flex items-center gap-3 pt-2 border-t">
          <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground min-w-[60px]">등록일</span>
          <span className="text-sm text-muted-foreground">
            {formatDate(customer.createdAt)}
          </span>
        </div>
      </div>
    </div>
  )
}
