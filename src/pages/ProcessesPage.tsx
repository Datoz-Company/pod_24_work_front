import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react'
import { processService } from '@/services/processService'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Process, ProcessCreateRequest } from '@/types'

export function ProcessesPage() {
  const queryClient = useQueryClient()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProcess, setEditingProcess] = useState<Process | null>(null)
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
      closeDialog()
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProcessCreateRequest }) =>
      processService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
      closeDialog()
    },
  })

  const deleteMutation = useMutation({
    mutationFn: processService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] })
    },
  })

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingProcess(null)
    setFormData({ name: '', color: '#3B82F6' })
  }

  const openEditDialog = (process: Process) => {
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

  const handleDelete = (id: number) => {
    if (window.confirm('이 공정을 삭제하시겠습니까?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">공정 관리</h1>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          공정 추가
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground">로딩 중...</div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>순서</TableHead>
                <TableHead>공정명</TableHead>
                <TableHead>색상</TableHead>
                <TableHead className="w-24">작업</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {processes.map((process) => (
                <TableRow key={process.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                  </TableCell>
                  <TableCell>{process.displayOrder}</TableCell>
                  <TableCell className="font-medium">{process.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-6 w-6 rounded"
                        style={{ backgroundColor: process.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {process.color}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
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
                        onClick={() => handleDelete(process.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

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
              <Button type="submit">
                {editingProcess ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
