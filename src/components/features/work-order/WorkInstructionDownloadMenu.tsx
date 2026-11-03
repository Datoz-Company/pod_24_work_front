import { useState } from 'react'
import { ChevronDown, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { DocumentFormat } from '@/services/excelService'

interface WorkInstructionDownloadMenuProps {
  /** 선택한 형식으로 다운로드를 수행 (실패 시 reject) */
  onDownload: (format: DocumentFormat) => Promise<void>
  /** 실패 시 토스트 메시지 */
  errorMessage?: string
}

/**
 * "작업 지시서 ▾" 드롭다운 — 엑셀(.xlsx) / PDF(.pdf) 중 골라 내려받습니다.
 * 생성 중에는 버튼을 비활성화하고 스피너를 보여 줍니다.
 *
 * @param {WorkInstructionDownloadMenuProps} props - 다운로드 함수와 실패 메시지
 * @returns {JSX.Element} 드롭다운 버튼
 */
export function WorkInstructionDownloadMenu({
  onDownload,
  errorMessage = '작업 지시서 생성에 실패했습니다',
}: WorkInstructionDownloadMenuProps) {
  const [pendingFormat, setPendingFormat] = useState<DocumentFormat | null>(null)

  const handleDownload = async (format: DocumentFormat) => {
    setPendingFormat(format)
    try {
      await onDownload(format)
    } catch {
      toast.error(errorMessage)
    } finally {
      setPendingFormat(null)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pendingFormat !== null}>
          {pendingFormat !== null ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-1 h-4 w-4" />
          )}
          {pendingFormat !== null ? '생성 중...' : '작업 지시서'}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleDownload('xlsx')}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          엑셀 (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownload('pdf')}>
          <FileText className="mr-2 h-4 w-4" />
          PDF (.pdf)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
