import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface PeekPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 전체 페이지로 이동할 경로 */
  expandTo?: string
  /** 패널 제목 */
  title?: React.ReactNode
  /** 제목 위에 표시되는 상위 링크 (예: 주문 링크) */
  breadcrumb?: React.ReactNode
  children: React.ReactNode
  className?: string
}

export function PeekPanel({
  open,
  onOpenChange,
  expandTo,
  title,
  breadcrumb,
  children,
  className,
}: PeekPanelProps) {
  const navigate = useNavigate()

  // ESC 키로 닫기
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  // 패널 열림 시 body 스크롤 방지
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleExpand = () => {
    if (expandTo) {
      onOpenChange(false)
      navigate(expandTo)
    }
  }

  return (
    <>
      {/* 오버레이 - 항상 마운트, opacity로 애니메이션 */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ease-out',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />

      {/* 패널 - 항상 마운트, transform으로 슬라이드 애니메이션 */}
      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full sm:w-[480px] lg:w-[560px]',
          'bg-white shadow-2xl border-l',
          'transform transition-transform duration-300 ease-out',
          'flex flex-col',
          open ? 'translate-x-0' : 'translate-x-full',
          !open && 'pointer-events-none',
          className
        )}
        aria-hidden={!open}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex-1 min-w-0">
            {/* 상위 링크 (breadcrumb) */}
            {breadcrumb && (
              <div className="text-xs text-muted-foreground mb-1">{breadcrumb}</div>
            )}
            {/* 제목 */}
            {title && (
              <div className="font-semibold text-lg truncate">{title}</div>
            )}
          </div>

          <div className="flex items-center gap-1 ml-2">
            {/* 전체 페이지로 열기 버튼 */}
            {expandTo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleExpand}
                className="h-8 px-2 text-muted-foreground hover:text-foreground"
              >
                <Maximize2 className="h-4 w-4 mr-1" />
                <span className="text-xs">전체 페이지</span>
              </Button>
            )}

            {/* 닫기 버튼 */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </>
  )
}

// 패널 섹션 컴포넌트
interface PeekPanelSectionProps {
  title?: string
  children: React.ReactNode
  className?: string
}

export function PeekPanelSection({ title, children, className }: PeekPanelSectionProps) {
  return (
    <div className={cn('px-4 py-4', className)}>
      {title && (
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">{title}</h3>
      )}
      {children}
    </div>
  )
}

// 패널 푸터 컴포넌트
interface PeekPanelFooterProps {
  children: React.ReactNode
  className?: string
}

export function PeekPanelFooter({ children, className }: PeekPanelFooterProps) {
  return (
    <div className={cn('border-t px-4 py-3 bg-gray-50', className)}>{children}</div>
  )
}
