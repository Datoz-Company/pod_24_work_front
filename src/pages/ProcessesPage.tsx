import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, GripVertical, Lock } from 'lucide-react'
import { processService } from '@/services/processService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import type { Process, ProcessCreateRequest } from '@/types'

export function ProcessesPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | null>(null)
  const [deletingProcess, setDeletingProcess] = useState<Process | null>(null)
  const [formData, setFormData] = useState<ProcessCreateRequest>({
    name: '',
    color: '#3B82F6',
  })

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['processes'],
    queryFn: processService.getAll,
  })

  const createMutation = useMutation({
    mutationFn: processService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
      toast.success('공정이 추가되었습니다')
      closeDialog()
    },
    onError: () => {
      toast.error('공정 추가에 실패했습니다')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProcessCreateRequest }) =>
      processService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
      toast.success('공정이 수정되었습니다')
      closeDialog()
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '공정 수정에 실패했습니다'
      toast.error(message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: processService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
      toast.success('공정이 삭제되었습니다')
      setDeletingProcess(null)
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || '공정 삭제에 실패했습니다'
      toast.error(message)
      setDeletingProcess(null)
    },
  })

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingProcess(null)
    setFormData({ name: '', color: '#3B82F6' })
  }

  const openEditDialog = (process: Process) => {
    // 시스템 공정은 수정 불가
    if (process.isSystem) {
      toast.error('시스템 공정은 수정할 수 없습니다')
      return
    }
    setEditingProcess(process)
    setFormData({ name: process.name, color: process.color })
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingProcess) {
      updateMutation.mutate({ id: editingProcess.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleDelete = (process: Process) => {
    // 시스템 공정은 삭제 불가
    if (process.isSystem) {
      toast.error('시스템 공정은 삭제할 수 없습니다')
      return
    }
    setDeletingProcess(process)
  }

  const confirmDelete = () => {
    if (deletingProcess) {
      deleteMutation.mutate(deletingProcess.id)
    }
  }

  // 시스템 공정 타입에 따른 라벨
  const getSystemLabel = (systemType?: string) => {
    switch (systemType) {
      case 'PENDING':
        return '시작'
      case 'COMPLETED':
        return '완료'
      default:
        return '시스템'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">공정 관리</h1>
          <p className="text-gray-500 mt-1">작업 공정을 추가하고 관리합니다</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-pod24 hover:opacity-90">
          <Plus className="mr-2 h-4 w-4" />
          공정 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">로딩 중...</div>
      ) : (
        <div className="rounded-lg border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-16">순서</TableHead>
                <TableHead>공정명</TableHead>
                <TableHead className="w-32">색상</TableHead>
                <TableHead className="w-24 text-center">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map((process) => (
                <TableRow
                  key={process.id}
                  className={process.isSystem ? 'bg-gray-50' : ''}
                >
                  <TableCell>
                    {process.isSystem ? (
                      <Lock className="h-4 w-4 text-gray-400" />
                    ) : (
                      <GripVertical className="h-4 w-4 cursor-grab text-gray-400" />
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500">{process.displayOrder}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{process.name}</span>
                      {process.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          {getSystemLabel(process.systemType)}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded border"
                        style={{ backgroundColor: process.color }}
                      />
                      <span className="text-sm text-gray-500">
                        {process.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center gap-1">
                      {!process.isSystem && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(process)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(process)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg">
        <p className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <span><strong>작업 전</strong>과 <strong>작업 완료</strong>는 기본 공정으로 수정/삭제할 수 없습니다.</span>
        </p>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProcess ? '공정 수정' : '새 공정 추가'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">공정명</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="공정명을 입력하세요"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="color">색상</Label>
              <div className="flex gap-2">
                <Input
                  id="color"
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  className="h-10 w-20 cursor-pointer p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  placeholder="#000000"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
                취소
              </Button>
              <Button type="submit" className="bg-gradient-pod24 hover:opacity-90">
                {editingProcess ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deletingProcess} onOpenChange={(open) => !open && setDeletingProcess(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공정 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProcess && (
                <>
                  <strong>"{deletingProcess.name}"</strong> 공정을 삭제하시겠습니까?
                  <br />
                  <span className="text-destructive">이 작업은 되돌릴 수 없습니다.</span>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
