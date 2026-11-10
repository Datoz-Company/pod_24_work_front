import { useState } from 'react'
import { toast } from 'sonner'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Link2, Unlink, GitBranch, CornerDownRight, AlertTriangle, Info, Check, Copy } from 'lucide-react'
import { optionService } from '@/services/optionService'
import { SortableGroup, SortableItem } from '@/components/features/option/SortableList'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import type {
  Option,
  OptionAttribute,
  OptionAttributeValue,
  OptionCreateRequest,
  AttributeCreateRequest,
  AttributeValueCreateRequest,
  PreviewType,
} from '@/types/option'
import { PREVIEW_TYPE_LABELS } from '@/types/option'

/**
 * 형제 속성끼리 바꾼 순서를 옵션 전체 속성 순서에 반영합니다.
 * 형제가 차지하던 자리에 새 순서대로 다시 채우고, 나머지 속성의 위치는 그대로 둡니다.
 * (서버는 형제끼리만 displayOrder를 비교하므로 전체 순서를 보내도 계층은 유지됨)
 *
 * @param allIds - 옵션의 전체 속성 id (현재 표시 순서)
 * @param reorderedSiblingIds - 새 순서의 형제 속성 id
 * @returns 옵션 전체 속성 id의 새 순서
 */
export function mergeSiblingOrder(allIds: readonly number[], reorderedSiblingIds: readonly number[]): number[] {
  const siblings = new Set(reorderedSiblingIds)
  const queue = [...reorderedSiblingIds]
  const result: number[] = []
  for (const id of allIds) {
    if (siblings.has(id)) {
      const next = queue.shift()
      if (next !== undefined) result.push(next)
    } else {
      result.push(id)
    }
  }
  return result
}

/** id 목록 순서대로 배열을 정렬한 새 배열을 반환합니다 (목록에 없는 항목은 뒤로). */
function sortByIds<T extends { id: number }>(items: readonly T[], ids: readonly number[]): T[] {
  const rank = new Map(ids.map((id, index) => [id, index]))
  return [...items].sort((a, b) => (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity))
}

export function OptionsPage() {
  const queryClient = useQueryClient()
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set())

  // 다이얼로그 상태
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false)
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false)
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false)
  // 삭제 대상 — 옵션/속성은 하위 항목 안내를 위해 원본 객체를 함께 보관
  const [deleteTarget, setDeleteTarget] = useState<
    | { type: 'option'; id: number; name: string; option: Option }
    | { type: 'attribute'; id: number; name: string; attribute: OptionAttribute }
    | { type: 'value'; id: number; name: string }
    | null
  >(null)

  // 편집 대상
  const [editingOption, setEditingOption] = useState<Option | null>(null)
  // 복제할 옵션과 새 옵션 이름
  const [copySource, setCopySource] = useState<Option | null>(null)
  const [copyName, setCopyName] = useState('')
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null)
  // 수정 중인 속성/속성값 (null이면 추가 모드)
  const [editingAttribute, setEditingAttribute] = useState<OptionAttribute | null>(null)
  const [editingValue, setEditingValue] = useState<OptionAttributeValue | null>(null)

  // 폼 데이터
  const [optionForm, setOptionForm] = useState<OptionCreateRequest>({
    name: '',
    description: '',
    isRequired: false,
    isMultipleAllowed: false,
    quantityType: 'FIXED',
    optionType: 'STANDARD',
  })
  const [attributeForm, setAttributeForm] = useState<AttributeCreateRequest>({
    name: '',
    isAddable: false,
    isMultiSelectable: false,
    previewType: 'SELECT_BOX',
  })
  const [valueForm, setValueForm] = useState<AttributeValueCreateRequest>({
    value: '',
    price: 0,
  })

  // 계층 구조 관련 상태
  const [isChildAttributeDialogOpen, setIsChildAttributeDialogOpen] = useState(false)
  const [isValueMappingDialogOpen, setIsValueMappingDialogOpen] = useState(false)
  const [selectedParentAttribute, setSelectedParentAttribute] = useState<OptionAttribute | null>(null)
  const [selectedParentValue, setSelectedParentValue] = useState<{
    value: OptionAttributeValue
    childAttributes: OptionAttribute[]
  } | null>(null)
  const [selectedChildAttributeIds, setSelectedChildAttributeIds] = useState<number[]>([])
  const [selectedChildValueIds, setSelectedChildValueIds] = useState<number[]>([])
  // 각 하위 속성별로 표시될 상위 값 ID 목록 (key: 하위 속성 ID, value: 상위 값 ID 배열)
  const [visibleForValueSelections, setVisibleForValueSelections] = useState<Record<number, number[]>>({})

  // 데이터 조회
  const { data: options = [], isLoading } = useQuery({
    queryKey: ['options'],
    queryFn: optionService.getAll,
  })

  // Mutations
  const createOptionMutation = useMutation({
    mutationFn: optionService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeOptionDialog()
    },
  })

  const updateOptionMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: OptionCreateRequest }) =>
      optionService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeOptionDialog()
    },
  })

  const copyOptionMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) => optionService.copyOption(id, name),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      // 새 옵션을 펼쳐서 바로 확인할 수 있게 함
      setExpandedOptions((prev) => new Set(prev).add(created.id))
      setCopySource(null)
      toast.success(`'${created.name}' 옵션을 만들었습니다`)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '옵션 복제에 실패했습니다')
    },
  })

  const submitCopy = () => {
    if (!copySource || !copyName.trim() || copyOptionMutation.isPending) return
    copyOptionMutation.mutate({ id: copySource.id, name: copyName })
  }

  const openCopyDialog = (option: Option) => {
    setCopySource(option)
    setCopyName(`${option.name} (복사)`)
  }

  const deleteOptionMutation = useMutation({
    mutationFn: optionService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      setDeleteTarget(null)
      toast.success('옵션이(가) 삭제되었습니다')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '옵션 삭제에 실패했습니다')
    },
  })

  const createAttributeMutation = useMutation({
    mutationFn: ({ optionId, data }: { optionId: number; data: AttributeCreateRequest }) =>
      optionService.createAttribute(optionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeAttributeDialog()
    },
  })

  const deleteAttributeMutation = useMutation({
    mutationFn: optionService.deleteAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      setDeleteTarget(null)
      toast.success('속성이(가) 삭제되었습니다')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '속성 삭제에 실패했습니다')
    },
  })

  const updateAttributeMutation = useMutation({
    mutationFn: ({ attribute, data }: { attribute: OptionAttribute; data: AttributeCreateRequest }) =>
      // 서버 수정 API가 systemAttributeType을 그대로 덮어쓰므로 기존 값을 함께 보냄
      optionService.updateAttribute(attribute.id, { ...data, systemAttributeType: attribute.systemAttributeType }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeAttributeDialog()
      toast.success('속성을 수정했습니다')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '속성 수정에 실패했습니다')
    },
  })

  const updateValueMutation = useMutation({
    mutationFn: ({ value, data }: { value: OptionAttributeValue; data: AttributeValueCreateRequest }) =>
      // 서버 수정 API가 트리거 필드를 그대로 덮어쓰므로 기존 값을 함께 보냄
      optionService.updateAttributeValue(value.id, {
        value: data.value,
        imageUrl: data.imageUrl,
        price: data.price,
        allowCustomInput: data.allowCustomInput,
        isEnabled: value.isEnabled,
        triggerAttributeValueIds: value.triggerAttributeValueIds,
        triggerVisibleType: value.triggerVisibleType,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeValueDialog()
      toast.success('속성값을 수정했습니다')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '속성값 수정에 실패했습니다')
    },
  })

  const createValueMutation = useMutation({
    mutationFn: ({ attributeId, data }: { attributeId: number; data: AttributeValueCreateRequest }) =>
      optionService.createAttributeValue(attributeId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeValueDialog()
    },
  })

  // 값의 "직접 입력 허용" 토글 (예: 별도 사이즈 → 입력란 표시)
  // 서버 수정 API가 이미지/트리거 필드를 그대로 덮어쓰므로 기존 값을 함께 보냄
  const toggleCustomInputMutation = useMutation({
    mutationFn: (value: OptionAttributeValue) =>
      optionService.updateAttributeValue(value.id, {
        value: value.value,
        imageUrl: value.imageUrl,
        price: value.price,
        isEnabled: value.isEnabled,
        triggerAttributeValueIds: value.triggerAttributeValueIds,
        triggerVisibleType: value.triggerVisibleType,
        allowCustomInput: !value.allowCustomInput,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
    },
  })

  const deleteValueMutation = useMutation({
    mutationFn: optionService.deleteAttributeValue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      setDeleteTarget(null)
      toast.success('속성값이(가) 삭제되었습니다')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '속성값 삭제에 실패했습니다')
    },
  })

  // 정렬 Mutations — 드롭 즉시 화면에 반영하고(낙관적 업데이트) 실패하면 되돌림
  const reorderAttributesMutation = useMutation({
    mutationFn: ({ optionId, ids }: { optionId: number; ids: number[] }) =>
      optionService.reorderAttributes(optionId, ids),
    onMutate: async ({ optionId, ids }) => {
      await queryClient.cancelQueries({ queryKey: ['options'] })
      const previous = queryClient.getQueryData<Option[]>(['options'])
      queryClient.setQueryData<Option[]>(['options'], (old) =>
        old?.map((o) => (o.id === optionId ? { ...o, attributes: sortByIds(o.attributes, ids) } : o))
      )
      return { previous }
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['options'], context.previous)
      toast.error(error.response?.data?.message || '속성 순서 변경에 실패했습니다')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      queryClient.invalidateQueries({ queryKey: ['product-options'] })
    },
  })

  const reorderValuesMutation = useMutation({
    mutationFn: ({ attributeId, ids }: { attributeId: number; ids: number[] }) =>
      optionService.reorderAttributeValues(attributeId, ids),
    onMutate: async ({ attributeId, ids }) => {
      await queryClient.cancelQueries({ queryKey: ['options'] })
      const previous = queryClient.getQueryData<Option[]>(['options'])
      queryClient.setQueryData<Option[]>(['options'], (old) =>
        old?.map((o) => ({
          ...o,
          attributes: o.attributes.map((a) =>
            a.id === attributeId ? { ...a, values: sortByIds(a.values, ids) } : a
          ),
        }))
      )
      return { previous }
    },
    onError: (error: any, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(['options'], context.previous)
      toast.error(error.response?.data?.message || '값 순서 변경에 실패했습니다')
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      queryClient.invalidateQueries({ queryKey: ['product-options'] })
    },
  })

  // 계층 구조 관련 Mutations
  const setChildAttributeMutation = useMutation({
    mutationFn: ({ parentId, childId, visibleForParentValueIds }: {
      parentId: number
      childId: number
      visibleForParentValueIds?: number[]
    }) => optionService.setChildAttribute(parentId, childId, visibleForParentValueIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
    },
  })

  const removeChildAttributeMutation = useMutation({
    mutationFn: optionService.removeChildAttribute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
    },
  })

  const setValueMappingsMutation = useMutation({
    mutationFn: ({ parentValueId, childValueIds }: { parentValueId: number; childValueIds: number[] }) =>
      optionService.setValueMappings(parentValueId, childValueIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeValueMappingDialog()
    },
  })

  // 핸들러
  const toggleExpand = (optionId: number) => {
    setExpandedOptions((prev) => {
      const next = new Set(prev)
      if (next.has(optionId)) {
        next.delete(optionId)
      } else {
        next.add(optionId)
      }
      return next
    })
  }

  const openOptionDialog = (option?: Option) => {
    if (option) {
      setEditingOption(option)
      setOptionForm({
        name: option.name,
        description: option.description,
        isRequired: option.isRequired,
        isMultipleAllowed: option.isMultipleAllowed,
        quantityType: option.quantityType,
        optionType: option.optionType,
      })
    } else {
      setEditingOption(null)
      setOptionForm({
        name: '',
        description: '',
        isRequired: false,
        isMultipleAllowed: false,
        quantityType: 'FIXED',
        optionType: 'STANDARD',
      })
    }
    setIsOptionDialogOpen(true)
  }

  const closeOptionDialog = () => {
    setIsOptionDialogOpen(false)
    setEditingOption(null)
  }

  const openAttributeDialog = (optionId: number) => {
    setSelectedOptionId(optionId)
    setAttributeForm({
      name: '',
      isAddable: false,
      isMultiSelectable: false,
      previewType: 'SELECT_BOX',
    })
    setIsAttributeDialogOpen(true)
  }

  const openEditAttributeDialog = (attribute: OptionAttribute) => {
    setEditingAttribute(attribute)
    setAttributeForm({
      name: attribute.name,
      isAddable: attribute.isAddable,
      isMultiSelectable: attribute.isMultiSelectable,
      previewType: attribute.previewType,
    })
    setIsAttributeDialogOpen(true)
  }

  const closeAttributeDialog = () => {
    setIsAttributeDialogOpen(false)
    setSelectedOptionId(null)
    setEditingAttribute(null)
  }

  const openValueDialog = (attributeId: number) => {
    setSelectedAttributeId(attributeId)
    setValueForm({ value: '', price: 0 })
    setIsValueDialogOpen(true)
  }

  const openEditValueDialog = (value: OptionAttributeValue) => {
    setEditingValue(value)
    setValueForm({
      value: value.value,
      price: value.price,
      imageUrl: value.imageUrl,
      allowCustomInput: value.allowCustomInput,
    })
    setIsValueDialogOpen(true)
  }

  const closeValueDialog = () => {
    setIsValueDialogOpen(false)
    setSelectedAttributeId(null)
    setEditingValue(null)
  }

  const handleOptionSubmit = () => {
    if (editingOption) {
      updateOptionMutation.mutate({ id: editingOption.id, data: optionForm })
    } else {
      createOptionMutation.mutate(optionForm)
    }
  }

  const handleAttributeSubmit = () => {
    if (editingAttribute) {
      updateAttributeMutation.mutate({ attribute: editingAttribute, data: attributeForm })
    } else if (selectedOptionId) {
      createAttributeMutation.mutate({ optionId: selectedOptionId, data: attributeForm })
    }
  }

  const handleValueSubmit = () => {
    if (editingValue) {
      updateValueMutation.mutate({ value: editingValue, data: valueForm })
    } else if (selectedAttributeId) {
      createValueMutation.mutate({ attributeId: selectedAttributeId, data: valueForm })
    }
  }

  const isDeleting =
    deleteOptionMutation.isPending || deleteAttributeMutation.isPending || deleteValueMutation.isPending

  const handleDelete = () => {
    if (!deleteTarget) return
    switch (deleteTarget.type) {
      case 'option':
        deleteOptionMutation.mutate(deleteTarget.id)
        break
      case 'attribute':
        deleteAttributeMutation.mutate(deleteTarget.id)
        break
      case 'value':
        deleteValueMutation.mutate(deleteTarget.id)
        break
    }
  }

  // 하위 속성 연결 다이얼로그
  const openChildAttributeDialog = (attribute: OptionAttribute, option: Option) => {
    setSelectedParentAttribute(attribute)
    // 현재 옵션에서 이 속성의 하위 속성들을 모두 찾음
    const childAttrs = option.attributes.filter(
      (a) => a.parentAttributeId === attribute.id
    )
    setSelectedChildAttributeIds(childAttrs.map((a) => a.id))
    // 기존 표시 조건 로드
    const visibilityMap: Record<number, number[]> = {}
    for (const childAttr of childAttrs) {
      visibilityMap[childAttr.id] = childAttr.visibleForParentValueIds || []
    }
    setVisibleForValueSelections(visibilityMap)
    setIsChildAttributeDialogOpen(true)
  }

  const closeChildAttributeDialog = () => {
    setIsChildAttributeDialogOpen(false)
    setSelectedParentAttribute(null)
    setSelectedChildAttributeIds([])
    setVisibleForValueSelections({})
  }

  const toggleChildAttributeSelection = (attributeId: number) => {
    setSelectedChildAttributeIds((prev) => {
      const isRemoving = prev.includes(attributeId)
      if (isRemoving) {
        // 선택 해제 시 표시 조건도 제거
        setVisibleForValueSelections((vs) => {
          const newVs = { ...vs }
          delete newVs[attributeId]
          return newVs
        })
        return prev.filter((id) => id !== attributeId)
      } else {
        // 선택 시 빈 배열로 초기화 (모든 값에서 표시)
        setVisibleForValueSelections((vs) => ({ ...vs, [attributeId]: [] }))
        return [...prev, attributeId]
      }
    })
  }

  const handleChildAttributeSubmit = async () => {
    if (!selectedParentAttribute) return

    const parentOption = options.find((o) =>
      o.attributes.some((a) => a.id === selectedParentAttribute.id)
    )
    if (!parentOption) return

    // 현재 연결된 자식 속성들
    const currentChildIds = parentOption.attributes
      .filter((a) => a.parentAttributeId === selectedParentAttribute.id)
      .map((a) => a.id)

    // 연결 해제할 속성들 (기존에 있었지만 선택 해제됨)
    const toRemove = currentChildIds.filter(
      (id) => !selectedChildAttributeIds.includes(id)
    )
    // 새로 연결하거나 업데이트할 속성들
    const toAddOrUpdate = selectedChildAttributeIds

    try {
      // 연결 해제
      for (const childId of toRemove) {
        await removeChildAttributeMutation.mutateAsync(childId)
      }
      // 새로 연결 또는 표시 조건 업데이트
      for (const childId of toAddOrUpdate) {
        const visibleFor = visibleForValueSelections[childId] || []
        await setChildAttributeMutation.mutateAsync({
          parentId: selectedParentAttribute.id,
          childId,
          visibleForParentValueIds: visibleFor.length > 0 ? visibleFor : undefined,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeChildAttributeDialog()
    } catch (error) {
      console.error('하위 속성 연결 실패:', error)
    }
  }

  // 하위 값 매핑 다이얼로그
  const openValueMappingDialog = (value: OptionAttributeValue, option: Option) => {
    // 상위 값의 속성에서 하위 속성들 찾기 (여러 개)
    const parentAttr = option.attributes.find((a) =>
      a.values.some((v) => v.id === value.id)
    )
    const childAttrs = parentAttr
      ? option.attributes.filter((a) => a.parentAttributeId === parentAttr.id)
      : []

    setSelectedParentValue({ value, childAttributes: childAttrs })
    setSelectedChildValueIds(value.childValueIds || [])
    setIsValueMappingDialogOpen(true)
  }

  const closeValueMappingDialog = () => {
    setIsValueMappingDialogOpen(false)
    setSelectedParentValue(null)
    setSelectedChildValueIds([])
  }

  const handleValueMappingSubmit = () => {
    if (selectedParentValue) {
      setValueMappingsMutation.mutate({
        parentValueId: selectedParentValue.value.id,
        childValueIds: selectedChildValueIds,
      })
    }
  }

  const toggleChildValueSelection = (valueId: number) => {
    setSelectedChildValueIds((prev) =>
      prev.includes(valueId)
        ? prev.filter((id) => id !== valueId)
        : [...prev, valueId]
    )
  }

  if (isLoading) {
    return <div className="p-6">로딩 중...</div>
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">옵션 관리</h1>
        <Button onClick={() => openOptionDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          옵션 추가
        </Button>
      </div>

      {options.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            등록된 옵션이 없습니다. 새 옵션을 추가해주세요.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {options.map((option) => (
            <Card key={option.id}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(option.id)}
                    >
                      {expandedOptions.has(option.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </Button>
                    <CardTitle className="text-lg">{option.name}</CardTitle>
                    {option.isRequired && (
                      <Badge variant="destructive">필수</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAttributeDialog(option.id)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      속성 추가
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openOptionDialog(option)}
                      aria-label={`${option.name} 수정`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openCopyDialog(option)}
                      title="옵션 복제"
                      aria-label={`${option.name} 복제`}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDeleteTarget({ type: 'option', id: option.id, name: option.name, option })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {option.description && (
                  <p className="text-sm text-muted-foreground mt-1 ml-10">
                    {option.description}
                  </p>
                )}
              </CardHeader>

              {expandedOptions.has(option.id) && (
                <CardContent className="pt-0">
                  <Separator className="mb-4" />
                  {option.attributes.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      속성이 없습니다. 속성을 추가해주세요.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* 재귀적으로 속성 트리 렌더링 */}
                      {(() => {
                        // 계층 깊이에 따른 스타일
                        const getDepthStyles = (depth: number) => {
                          const opacityLevels = [5, 8, 12, 16, 20]
                          const opacity = opacityLevels[Math.min(depth, opacityLevels.length - 1)]
                          return {
                            bg: depth === 0 ? 'bg-white' : `bg-primary/${opacity}`,
                            border: depth === 0 ? 'border-primary/20' : 'border-primary/30',
                          }
                        }

                        // 상위 속성 이름 찾기
                        const getParentName = (parentId: number | undefined): string | undefined => {
                          if (!parentId) return undefined
                          return option.attributes.find(a => a.id === parentId)?.name
                        }

                        // 상위 값 이름 찾기
                        const getParentValueNames = (attr: OptionAttribute): string[] => {
                          if (!attr.visibleForParentValueIds || attr.visibleForParentValueIds.length === 0) {
                            return []
                          }
                          const parentAttr = option.attributes.find(a => a.id === attr.parentAttributeId)
                          if (!parentAttr) return []
                          return attr.visibleForParentValueIds
                            .map(vId => parentAttr.values.find(v => v.id === vId)?.value)
                            .filter((v): v is string => !!v)
                        }

                        // 재귀적으로 속성과 하위 속성 렌더링
                        const renderAttributeTree = (attr: OptionAttribute, depth: number): React.ReactNode => {
                          const childAttributes = option.attributes.filter(
                            (a) => a.parentAttributeId === attr.id
                          )
                          const hasChildren = childAttributes.length > 0
                          const styles = getDepthStyles(depth)
                          const parentName = getParentName(attr.parentAttributeId)
                          const visibleForValueNames = getParentValueNames(attr)

                          return (
                            <SortableItem key={attr.id} id={attr.id}>
                              {(attrHandle) => (
                            <>
                              {/* 속성 카드 */}
                              <div
                                className={`border rounded-lg p-4 shadow-sm ${styles.bg} ${depth > 0 ? styles.border : ''}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {attrHandle({ label: attr.name })}
                                    {depth > 0 ? (
                                      <CornerDownRight className="h-4 w-4 text-primary" />
                                    ) : hasChildren ? (
                                      <GitBranch className="h-4 w-4 text-pod24-blue" />
                                    ) : null}
                                    <span className={depth === 0 ? 'font-semibold text-base' : 'font-medium'}>
                                      {attr.name}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={`text-xs ${depth > 0 ? 'border-primary/30 bg-primary/10' : ''}`}
                                    >
                                      {PREVIEW_TYPE_LABELS[attr.previewType] ?? attr.previewType}
                                    </Badge>
                                    {attr.isMultiSelectable && (
                                      <Badge variant="secondary" className="text-xs">
                                        다중선택
                                      </Badge>
                                    )}
                                    {parentName && (
                                      <Badge className="text-xs bg-gradient-pod24">
                                        {parentName}의 하위
                                      </Badge>
                                    )}
                                    {visibleForValueNames.length > 0 && (
                                      <Badge variant="outline" className="text-xs border-amber-400 bg-amber-50 text-amber-700">
                                        {visibleForValueNames.join(', ')}에서만 표시
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => openEditAttributeDialog(attr)}
                                      aria-label={`${attr.name} 속성 수정`}
                                      title="속성 수정"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                    {/* 하위 속성 연결 버튼 - 모든 속성에 표시 */}
                                    <Button
                                      variant={hasChildren ? 'default' : 'outline'}
                                      size="sm"
                                      onClick={() => openChildAttributeDialog(attr, option)}
                                      className={hasChildren ? 'bg-gradient-pod24 hover:opacity-90' : ''}
                                    >
                                      <Link2 className="h-4 w-4 mr-1" />
                                      {hasChildren ? `하위 (${childAttributes.length})` : '하위 연결'}
                                    </Button>
                                    {/* TOGGLE_BUTTON 타입은 값 추가 불가 (true/false만 가능) */}
                                    {attr.previewType !== 'TOGGLE_BUTTON' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => openValueDialog(attr.id)}
                                      >
                                        <Plus className="h-4 w-4 mr-1" />
                                        값
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: 'attribute',
                                          id: attr.id,
                                          name: attr.name,
                                          attribute: attr,
                                        })
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>

                                {/* 속성의 값들 - TOGGLE_BUTTON은 값 대신 설명 표시 */}
                                <div className="flex flex-wrap gap-2">
                                  {attr.previewType === 'TOGGLE_BUTTON' ? (
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-blue-50 border border-blue-200">
                                      <div className="w-8 h-4 bg-blue-500 rounded-full relative">
                                        <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" />
                                      </div>
                                      <span className="text-blue-700">ON / OFF 토글</span>
                                      <span className="text-xs text-muted-foreground ml-2">
                                        (하위 속성은 ON일 때만 표시됨)
                                      </span>
                                    </div>
                                  ) : (
                                    <SortableGroup
                                      layout="grid"
                                      ids={attr.values.map((v) => v.id)}
                                      onReorder={(ids) => reorderValuesMutation.mutate({ attributeId: attr.id, ids })}
                                    >
                                      {attr.values.map((value) => {
                                        const hasChildValues = value.hasChildValues || (value.childValueIds && value.childValueIds.length > 0)
                                        return (
                                          <SortableItem
                                            key={value.id}
                                            id={value.id}
                                            className={`flex items-center gap-1.5 pl-1.5 pr-3 py-1.5 rounded-md text-sm group border transition-colors ${
                                              hasChildValues
                                                ? 'bg-primary/5 border-primary/30 hover:bg-primary/10'
                                                : depth === 0
                                                  ? 'bg-muted border-border hover:bg-muted/80'
                                                  : 'bg-white border-border hover:bg-muted/50'
                                            }`}
                                          >
                                            {(valueHandle) => (
                                            <>
                                            {valueHandle({ label: value.value, size: 'sm' })}
                                            <button
                                              type="button"
                                              onClick={() => openEditValueDialog(value)}
                                              className="font-medium hover:underline"
                                              title="값 수정"
                                            >
                                              {value.value}
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => toggleCustomInputMutation.mutate(value)}
                                              className={`flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-colors ${
                                                value.allowCustomInput
                                                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                                                  : 'text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted'
                                              }`}
                                              title="선택 시 텍스트 직접 입력란 표시 (예: 별도 사이즈)"
                                            >
                                              <Pencil className="h-3 w-3" />
                                              직접입력
                                            </button>
                                            {value.price > 0 && (
                                              <span className="text-muted-foreground text-xs">
                                                +₩{value.price.toLocaleString()}
                                              </span>
                                            )}
                                            {hasChildren && (
                                              <button
                                                onClick={() => openValueMappingDialog(value, option)}
                                                className={`ml-1 flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-colors ${
                                                  hasChildValues
                                                    ? 'bg-primary/20 text-primary hover:bg-primary/30'
                                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                                }`}
                                                title="하위 값 연결 관리"
                                              >
                                                <Link2 className="h-3 w-3" />
                                                {hasChildValues ? `${value.childValueIds?.length || 0}` : '연결'}
                                              </button>
                                            )}
                                            <button
                                              onClick={() =>
                                                setDeleteTarget({
                                                  type: 'value',
                                                  id: value.id,
                                                  name: value.value,
                                                })
                                              }
                                              className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-destructive/10 rounded"
                                            >
                                              <Trash2 className="h-3 w-3 text-destructive" />
                                            </button>
                                            </>
                                            )}
                                          </SortableItem>
                                        )
                                      })}
                                      {attr.values.length === 0 && (
                                        <span className="text-sm text-muted-foreground italic">값이 없습니다</span>
                                      )}
                                    </SortableGroup>
                                  )}
                                </div>
                              </div>

                              {/* 하위 속성들 재귀 렌더링 */}
                              {childAttributes.length > 0 && (
                                <div className="ml-6 mt-2 border-l-2 border-primary/40 pl-4 space-y-2">
                                  {renderSiblings(childAttributes, depth + 1)}
                                </div>
                              )}
                            </>
                              )}
                            </SortableItem>
                          )
                        }

                        // 같은 상위를 가진 형제 속성 묶음 — 이 안에서만 드래그로 순서 변경
                        const renderSiblings = (siblings: OptionAttribute[], depth: number): React.ReactNode => (
                          <SortableGroup
                            ids={siblings.map((a) => a.id)}
                            onReorder={(ids) =>
                              reorderAttributesMutation.mutate({
                                optionId: option.id,
                                ids: mergeSiblingOrder(option.attributes.map((a) => a.id), ids),
                              })
                            }
                          >
                            {siblings.map((sibling) => renderAttributeTree(sibling, depth))}
                          </SortableGroup>
                        )

                        // 최상위 속성들(하위가 아닌 속성들)만 렌더링 시작점
                        return renderSiblings(
                          option.attributes.filter((attr) => !attr.isChildAttribute),
                          0
                        )
                      })()}

                      {/* 연결되지 않은 하위 속성 (상위가 삭제된 경우 등) */}
                      {option.attributes.filter(
                        (attr) => attr.isChildAttribute && !option.attributes.some(a => a.id === attr.parentAttributeId)
                      ).length > 0 && (
                        <div className="mt-4 pt-4 border-t border-dashed">
                          <p className="text-sm text-destructive mb-2 flex items-center gap-2">
                            <Unlink className="h-4 w-4" />
                            연결이 끊긴 속성
                          </p>
                          {option.attributes
                            .filter((attr) => attr.isChildAttribute && !option.attributes.some(a => a.id === attr.parentAttributeId))
                            .map((attr) => (
                              <div key={attr.id} className="border border-destructive/30 rounded-lg p-3 bg-destructive/5">
                                <span className="text-sm">{attr.name}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* 옵션 복제 다이얼로그 */}
      <Dialog open={copySource != null} onOpenChange={(open) => !open && setCopySource(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>옵션 복제 - {copySource?.name}</DialogTitle>
            <DialogDescription>
              속성 {copySource?.attributes?.length ?? 0}개와 값, 하위 연결까지 그대로 복사한 새 옵션을 만듭니다.
              상품 연결은 복사하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              submitCopy()
            }}
          >
            <Label htmlFor="copy-option-name">새 옵션명 *</Label>
            <Input
              id="copy-option-name"
              value={copyName}
              onChange={(e) => setCopyName(e.target.value)}
              onKeyDown={(e) => {
                // 한글 조합 중 Enter는 글자 확정용이므로 제출하지 않음
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  submitCopy()
                }
              }}
              maxLength={200}
              autoFocus
            />
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCopySource(null)}>
                취소
              </Button>
              <Button type="submit" disabled={!copyName.trim() || copyOptionMutation.isPending}>
                {copyOptionMutation.isPending ? '복제 중...' : '복제'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 옵션 생성/수정 다이얼로그 */}
      <Dialog open={isOptionDialogOpen} onOpenChange={setIsOptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingOption ? '옵션 수정' : '새 옵션 추가'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>옵션명 *</Label>
              <Input
                value={optionForm.name}
                onChange={(e) => setOptionForm({ ...optionForm, name: e.target.value })}
                placeholder="예: 사이즈, 색상"
              />
            </div>
            <div className="space-y-2">
              <Label>설명</Label>
              <Input
                value={optionForm.description || ''}
                onChange={(e) => setOptionForm({ ...optionForm, description: e.target.value })}
                placeholder="옵션에 대한 설명"
              />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={optionForm.isRequired}
                  onChange={(e) =>
                    setOptionForm({ ...optionForm, isRequired: e.target.checked })
                  }
                />
                필수 옵션
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={optionForm.isMultipleAllowed}
                  onChange={(e) =>
                    setOptionForm({ ...optionForm, isMultipleAllowed: e.target.checked })
                  }
                />
                다중 선택 허용
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeOptionDialog}>
              취소
            </Button>
            <Button
              onClick={handleOptionSubmit}
              disabled={!optionForm.name || createOptionMutation.isPending}
            >
              {editingOption ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 속성 추가 다이얼로그 */}
      <Dialog open={isAttributeDialogOpen} onOpenChange={(open) => { if (!open) closeAttributeDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAttribute ? '속성 수정' : '새 속성 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>속성명 *</Label>
              <Input
                value={attributeForm.name}
                onChange={(e) => setAttributeForm({ ...attributeForm, name: e.target.value })}
                placeholder="예: 크기, 컬러"
              />
            </div>
            <div className="space-y-2">
              <Label>표시 방식</Label>
              <Select
                value={attributeForm.previewType}
                onValueChange={(value: PreviewType) =>
                  setAttributeForm({ ...attributeForm, previewType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SELECT_BOX">드롭다운</SelectItem>
                  <SelectItem value="RADIO_BUTTON">라디오 버튼</SelectItem>
                  <SelectItem value="CHECK_BOX">체크박스</SelectItem>
                  <SelectItem value="INPUT_NUMBER">숫자 입력</SelectItem>
                  <SelectItem value="INPUT_TEXT">텍스트 입력</SelectItem>
                  <SelectItem value="TOGGLE_BUTTON">토글 버튼</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={attributeForm.isMultiSelectable}
                onChange={(e) =>
                  setAttributeForm({ ...attributeForm, isMultiSelectable: e.target.checked })
                }
              />
              다중 선택 가능
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeAttributeDialog}>
              취소
            </Button>
            <Button
              onClick={handleAttributeSubmit}
              disabled={!attributeForm.name || createAttributeMutation.isPending || updateAttributeMutation.isPending}
            >
              {editingAttribute ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 속성값 추가 다이얼로그 */}
      <Dialog open={isValueDialogOpen} onOpenChange={(open) => { if (!open) closeValueDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingValue ? '속성값 수정' : '새 속성값 추가'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>값 *</Label>
              <Input
                value={valueForm.value}
                onChange={(e) => setValueForm({ ...valueForm, value: e.target.value })}
                placeholder="예: M, L, XL 또는 빨강, 파랑"
              />
            </div>
            <div className="space-y-2">
              <Label>추가 금액</Label>
              <Input
                type="number"
                value={valueForm.price || 0}
                onChange={(e) => setValueForm({ ...valueForm, price: Number(e.target.value) })}
                placeholder="0"
              />
            </div>
            <div className="flex items-start gap-2">
              <Checkbox
                id="value-allow-custom-input"
                checked={!!valueForm.allowCustomInput}
                onCheckedChange={(checked) => setValueForm({ ...valueForm, allowCustomInput: checked === true })}
              />
              <div className="space-y-0.5">
                <Label htmlFor="value-allow-custom-input">직접 입력 허용</Label>
                <p className="text-xs text-muted-foreground">이 값을 고르면 텍스트 입력란이 나타납니다. 예: "별도 사이즈" → 300 x 450 mm</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>이미지 URL (선택)</Label>
              <Input
                value={valueForm.imageUrl || ''}
                onChange={(e) => setValueForm({ ...valueForm, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeValueDialog}>
              취소
            </Button>
            <Button
              onClick={handleValueSubmit}
              disabled={!valueForm.value || createValueMutation.isPending || updateValueMutation.isPending}
            >
              {editingValue ? '수정' : '추가'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === 'option' && '옵션 삭제'}
              {deleteTarget?.type === 'attribute' && '속성 삭제'}
              {deleteTarget?.type === 'value' && '속성값 삭제'}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  <span className="font-medium text-foreground">"{deleteTarget?.name}"</span>을(를) 삭제하시겠습니까?
                </p>

                {deleteTarget?.type === 'option' && (() => {
                  const attrs = deleteTarget.option.attributes
                  const valueCount = attrs.reduce((sum, a) => sum + a.values.length, 0)
                  return (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                      <p className="flex items-start gap-2 font-medium text-destructive">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {attrs.length > 0
                          ? `하위의 속성 ${attrs.length}개와 속성값 ${valueCount}개가 모두 함께 삭제됩니다.`
                          : '이 옵션에는 하위 속성이 없습니다.'}
                      </p>
                      {attrs.length > 0 && (
                        <ul className="max-h-48 overflow-y-auto space-y-1.5 pl-6 text-xs">
                          {attrs.map((a) => (
                            <li key={a.id}>
                              <span className="font-medium text-foreground">{a.name}</span>
                              {a.values.length > 0 ? (
                                <span> — {a.values.map((v) => v.value).join(', ')}</span>
                              ) : (
                                <span> — 값 없음</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      <p className="pl-6 text-xs">
                        이 옵션을 사용 중인 상품에서 연결이 해제되고, 속성값 간 연결(계층 관계)도 해제됩니다.
                      </p>
                    </div>
                  )
                })()}

                {deleteTarget?.type === 'attribute' && (() => {
                  const values = deleteTarget.attribute.values
                  return (
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                      <p className="flex items-start gap-2 font-medium text-destructive">
                        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        {values.length > 0
                          ? `하위의 속성값 ${values.length}개가 모두 함께 삭제됩니다.`
                          : '이 속성에는 속성값이 없습니다.'}
                      </p>
                      {values.length > 0 && (
                        <p className="pl-6 text-xs text-foreground">
                          {values.map((v) => v.value).join(', ')}
                        </p>
                      )}
                      <p className="pl-6 text-xs">
                        이 속성에 연결된 하위 속성은 연결만 해제되며, 속성값 간 연결(계층 관계)도 해제됩니다.
                      </p>
                    </div>
                  )
                })()}

                {deleteTarget?.type === 'value' && (
                  <p className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    이 값과 연결된 상위/하위 값 관계와 표시 조건이 해제됩니다.
                  </p>
                )}

                <p className="text-xs">
                  이미 등록된 작업지시서에 저장된 옵션 정보는 그대로 유지됩니다.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // 요청이 끝날 때까지 다이얼로그 유지 (실패 시 사용자가 알 수 있도록)
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 하위 속성 연결 다이얼로그 */}
      <Dialog open={isChildAttributeDialogOpen} onOpenChange={setIsChildAttributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>하위 속성 연결</DialogTitle>
            <DialogDescription>
              "{selectedParentAttribute?.name}" 속성에 연결할 하위 속성을 선택하세요. (여러 개 선택 가능)
              하위 속성을 연결하면, 선택한 값에 따라 하위 항목을 필터링할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {(() => {
              const parentOption = options.find((o) =>
                o.attributes.some((a) => a.id === selectedParentAttribute?.id)
              )
              if (!parentOption || !selectedParentAttribute) return null

              // 순환 참조 방지: 선택된 속성의 상위 속성 체인을 구함
              const getAncestorIds = (attrId: number): number[] => {
                const ancestors: number[] = []
                let currentId: number | undefined = attrId
                while (currentId) {
                  const current = parentOption.attributes.find(a => a.id === currentId)
                  if (!current || !current.parentAttributeId) break
                  ancestors.push(current.parentAttributeId)
                  currentId = current.parentAttributeId
                }
                return ancestors
              }

              // 선택된 속성의 모든 하위 속성 체인을 구함 (자기 자신의 하위는 상위로 연결 불가)
              const getDescendantIds = (attrId: number): number[] => {
                const descendants: number[] = []
                const findDescendants = (id: number) => {
                  const children = parentOption.attributes.filter(a => a.parentAttributeId === id)
                  for (const child of children) {
                    descendants.push(child.id)
                    findDescendants(child.id)
                  }
                }
                findDescendants(attrId)
                return descendants
              }

              const ancestorIds = getAncestorIds(selectedParentAttribute.id)
              const descendantIds = getDescendantIds(selectedParentAttribute.id)

              // 연결 가능한 속성 필터링
              const availableAttributes = parentOption.attributes.filter((attr) => {
                if (attr.id === selectedParentAttribute.id) return false // 자기 자신 제외
                // 순환 참조 방지: 자신의 상위 속성은 하위로 연결 불가
                if (ancestorIds.includes(attr.id)) return false
                // 간접 하위(손자 이하)만 제외 - 직접 하위는 해제를 위해 표시해야 함
                const isDirectChild = attr.parentAttributeId === selectedParentAttribute.id
                if (descendantIds.includes(attr.id) && !isDirectChild) return false
                // 이미 다른 상위가 있는 경우 (자신이 상위가 아닌 경우만 제외)
                if (attr.isChildAttribute && attr.parentAttributeId !== selectedParentAttribute.id) return false
                return true
              })

              if (availableAttributes.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    연결 가능한 속성이 없습니다.
                    <br />
                    <span className="text-xs">
                      (이미 다른 속성에 연결되어 있거나 같은 옵션 내에 다른 속성이 없습니다)
                    </span>
                  </p>
                )
              }

              const parentValues = selectedParentAttribute.values

              return (
                <div className="space-y-4">
                  {/* 1단계: 연결할 하위 속성 선택 */}
                  <div>
                    <p className="text-sm font-medium mb-2">연결할 하위 속성 선택</p>
                    <div className="space-y-2">
                      {availableAttributes.map((attr) => {
                        const isSelected = selectedChildAttributeIds.includes(attr.id)
                        const isCurrentlyLinked = attr.parentAttributeId === selectedParentAttribute.id

                        return (
                          <div
                            key={attr.id}
                            className={`p-2 border rounded-lg transition-colors cursor-pointer ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'hover:border-primary/50'
                            }`}
                            onClick={() => toggleChildAttributeSelection(attr.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleChildAttributeSelection(attr.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                              <span className="font-medium text-sm">{attr.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {attr.values.length}개 값
                              </Badge>
                              {isCurrentlyLinked && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                                  <Link2 className="h-3 w-3 mr-1" />
                                  연결됨
                                </Badge>
                              )}
                              {isCurrentlyLinked && !isSelected && (
                                <Badge variant="destructive" className="text-xs">
                                  <Unlink className="h-3 w-3 mr-1" />
                                  해제 예정
                                </Badge>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 2단계: 부모 값별 표시 설정 */}
                  {selectedChildAttributeIds.length > 0 && parentValues.length > 0 && (
                    <div>
                      <Separator className="my-4" />
                      <p className="text-sm font-medium mb-1">부모 값별 표시 설정</p>
                      <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                        <Info className="h-3 w-3" />
                        각 부모 값 선택 시 표시할 하위 속성을 지정하세요 (미지정 시 모든 하위 속성 표시)
                      </p>
                      <div className="space-y-3">
                        {parentValues.map((pv) => (
                            <div key={pv.id} className="p-3 bg-muted/50 rounded-lg">
                              <p className="text-sm font-medium mb-2">
                                "{pv.value}" 선택 시 표시할 하위 속성:
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedChildAttributeIds.map((childId) => {
                                  const childAttr = availableAttributes.find((a) => a.id === childId)
                                  if (!childAttr) return null

                                  const visibleFor = visibleForValueSelections[childId] || []
                                  // 이 부모 값에서 표시되는지 여부
                                  const isVisibleForThisValue = visibleFor.length === 0 || visibleFor.includes(pv.id)

                                  return (
                                    <button
                                      key={childId}
                                      type="button"
                                      onClick={() => {
                                        // 토글 로직: 현재 visibleFor 상태에 따라 처리
                                        setVisibleForValueSelections((prev) => {
                                          const current = prev[childId] || []

                                          if (current.length === 0) {
                                            // 모든 값에서 표시 → 이 값만 제외 (다른 모든 값 추가)
                                            const otherValueIds = parentValues
                                              .filter((v) => v.id !== pv.id)
                                              .map((v) => v.id)
                                            return { ...prev, [childId]: otherValueIds }
                                          } else if (current.includes(pv.id)) {
                                            // 이 값에서 표시 중 → 이 값 제거
                                            const newValues = current.filter((id) => id !== pv.id)
                                            return { ...prev, [childId]: newValues }
                                          } else {
                                            // 이 값에서 미표시 → 이 값 추가
                                            return { ...prev, [childId]: [...current, pv.id] }
                                          }
                                        })
                                      }}
                                      className={`px-2.5 py-1 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                                        isVisibleForThisValue
                                          ? 'bg-primary text-primary-foreground border-primary'
                                          : 'bg-white border-border hover:border-primary/50 text-muted-foreground'
                                      }`}
                                    >
                                      {isVisibleForThisValue && <Check className="h-3 w-3" />}
                                      {childAttr.name}
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>
          <div className="text-sm text-muted-foreground">
            선택된 하위 속성: {selectedChildAttributeIds.length}개
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeChildAttributeDialog}>
              취소
            </Button>
            <Button
              onClick={handleChildAttributeSubmit}
              disabled={setChildAttributeMutation.isPending || removeChildAttributeMutation.isPending}
              className="bg-gradient-pod24 hover:opacity-90"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 하위 값 매핑 다이얼로그 */}
      <Dialog open={isValueMappingDialogOpen} onOpenChange={setIsValueMappingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>하위 값 연결</DialogTitle>
            <DialogDescription>
              "{selectedParentValue?.value.value}" 값을 선택했을 때 표시할 하위 값을 선택하세요.
              {selectedParentValue?.childAttributes && selectedParentValue.childAttributes.length > 0 && (
                <span className="block mt-1 text-xs">
                  하위 속성: {selectedParentValue.childAttributes.map(a => a.name).join(', ')}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {selectedParentValue?.childAttributes?.map((childAttr) => (
              <div key={childAttr.id} className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {childAttr.name}
                </h4>
                {childAttr.values.map((childValue) => (
                  // label로 감싸 클릭을 체크박스 하나로만 전달 (div onClick + onChange 이중 토글 방지)
                  <label
                    key={childValue.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedChildValueIds.includes(childValue.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                  >
                    <Checkbox
                      checked={selectedChildValueIds.includes(childValue.id)}
                      onCheckedChange={() => toggleChildValueSelection(childValue.id)}
                    />
                    <span>{childValue.value}</span>
                    {childValue.price > 0 && (
                      <span className="text-xs text-muted-foreground">
                        (+₩{childValue.price.toLocaleString()})
                      </span>
                    )}
                  </label>
                ))}
                {childAttr.values.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    값이 없습니다.
                  </p>
                )}
              </div>
            ))}
            {(!selectedParentValue?.childAttributes ||
              selectedParentValue.childAttributes.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                하위 속성이 없습니다. 먼저 하위 속성을 연결해주세요.
              </p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            선택된 하위 값: {selectedChildValueIds.length}개
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeValueMappingDialog}>
              취소
            </Button>
            <Button
              onClick={handleValueMappingSubmit}
              disabled={setValueMappingsMutation.isPending}
              className="bg-gradient-pod24 hover:opacity-90"
            >
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default OptionsPage
