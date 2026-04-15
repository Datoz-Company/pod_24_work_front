import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Link2, Unlink, GitBranch, CornerDownRight, AlertTriangle, Info, Check } from 'lucide-react'
import { optionService } from '@/services/optionService'
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

export function OptionsPage() {
  const queryClient = useQueryClient()
  const [expandedOptions, setExpandedOptions] = useState<Set<number>>(new Set())

  // 다이얼로그 상태
  const [isOptionDialogOpen, setIsOptionDialogOpen] = useState(false)
  const [isAttributeDialogOpen, setIsAttributeDialogOpen] = useState(false)
  const [isValueDialogOpen, setIsValueDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'option' | 'attribute' | 'value'
    id: number
    name: string
  } | null>(null)

  // 편집 대상
  const [editingOption, setEditingOption] = useState<Option | null>(null)
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null)
  const [selectedAttributeId, setSelectedAttributeId] = useState<number | null>(null)

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

  const deleteOptionMutation = useMutation({
    mutationFn: optionService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      setDeleteTarget(null)
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

  const deleteValueMutation = useMutation({
    mutationFn: optionService.deleteAttributeValue,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      setDeleteTarget(null)
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

  const closeAttributeDialog = () => {
    setIsAttributeDialogOpen(false)
    setSelectedOptionId(null)
  }

  const openValueDialog = (attributeId: number) => {
    setSelectedAttributeId(attributeId)
    setValueForm({ value: '', price: 0 })
    setIsValueDialogOpen(true)
  }

  const closeValueDialog = () => {
    setIsValueDialogOpen(false)
    setSelectedAttributeId(null)
  }

  const handleOptionSubmit = () => {
    if (editingOption) {
      updateOptionMutation.mutate({ id: editingOption.id, data: optionForm })
    } else {
      createOptionMutation.mutate(optionForm)
    }
  }

  const handleAttributeSubmit = () => {
    if (selectedOptionId) {
      createAttributeMutation.mutate({ optionId: selectedOptionId, data: attributeForm })
    }
  }

  const handleValueSubmit = () => {
    if (selectedAttributeId) {
      createValueMutation.mutate({ attributeId: selectedAttributeId, data: valueForm })
    }
  }

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
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setDeleteTarget({ type: 'option', id: option.id, name: option.name })
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
                            <div key={attr.id}>
                              {/* 속성 카드 */}
                              <div
                                className={`border rounded-lg p-4 shadow-sm ${styles.bg} ${depth > 0 ? styles.border : ''}`}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center gap-2 flex-wrap">
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
                                      {attr.previewType}
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
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => openValueDialog(attr.id)}
                                    >
                                      <Plus className="h-4 w-4 mr-1" />
                                      값
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() =>
                                        setDeleteTarget({
                                          type: 'attribute',
                                          id: attr.id,
                                          name: attr.name,
                                        })
                                      }
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>

                                {/* 속성의 값들 */}
                                <div className="flex flex-wrap gap-2">
                                  {attr.values.map((value) => {
                                    const hasChildValues = value.hasChildValues || (value.childValueIds && value.childValueIds.length > 0)
                                    return (
                                      <div
                                        key={value.id}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm group border transition-colors ${
                                          hasChildValues
                                            ? 'bg-primary/5 border-primary/30 hover:bg-primary/10'
                                            : depth === 0
                                              ? 'bg-muted border-border hover:bg-muted/80'
                                              : 'bg-white border-border hover:bg-muted/50'
                                        }`}
                                      >
                                        <span className="font-medium">{value.value}</span>
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
                                      </div>
                                    )
                                  })}
                                  {attr.values.length === 0 && (
                                    <span className="text-sm text-muted-foreground italic">값이 없습니다</span>
                                  )}
                                </div>
                              </div>

                              {/* 하위 속성들 재귀 렌더링 */}
                              {childAttributes.length > 0 && (
                                <div className="ml-6 border-l-2 border-primary/40 pl-4 space-y-2">
                                  {childAttributes.map((childAttr) => renderAttributeTree(childAttr, depth + 1))}
                                </div>
                              )}
                            </div>
                          )
                        }

                        // 최상위 속성들(하위가 아닌 속성들)만 렌더링 시작점
                        return option.attributes
                          .filter((attr) => !attr.isChildAttribute)
                          .map((attr) => renderAttributeTree(attr, 0))
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
      <Dialog open={isAttributeDialogOpen} onOpenChange={setIsAttributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 속성 추가</DialogTitle>
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
              disabled={!attributeForm.name || createAttributeMutation.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 속성값 추가 다이얼로그 */}
      <Dialog open={isValueDialogOpen} onOpenChange={setIsValueDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>새 속성값 추가</DialogTitle>
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
              disabled={!valueForm.value || createValueMutation.isPending}
            >
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 확인</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                "{deleteTarget?.name}"을(를) 삭제하시겠습니까?
              </span>
              {deleteTarget?.type === 'option' && (
                <span className="flex items-start gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    이 옵션에 포함된 모든 속성과 속성값이 함께 삭제됩니다.
                    <br />
                    이 옵션을 사용 중인 상품에서 연결이 해제됩니다.
                    <br />
                    속성값 간 연결(계층 관계)도 함께 삭제됩니다.
                  </span>
                </span>
              )}
              {deleteTarget?.type === 'attribute' && (
                <span className="flex items-start gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    이 속성에 포함된 모든 속성값이 함께 삭제됩니다.
                    <br />
                    속성값 간 연결(계층 관계)도 함께 삭제됩니다.
                  </span>
                </span>
              )}
              {deleteTarget?.type === 'value' && (
                <span className="flex items-start gap-2 text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>이 값과 연결된 상위/하위 값 관계가 해제됩니다.</span>
                </span>
              )}
              <span className="block text-muted-foreground text-xs mt-2">
                이 작업은 취소할 수 없습니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              삭제
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
                  <div
                    key={childValue.id}
                    className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedChildValueIds.includes(childValue.id)
                        ? 'border-primary bg-primary/5'
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => toggleChildValueSelection(childValue.id)}
                  >
                    <input
                      type="checkbox"
                      checked={selectedChildValueIds.includes(childValue.id)}
                      onChange={() => toggleChildValueSelection(childValue.id)}
                      className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                    />
                    <span>{childValue.value}</span>
                    {childValue.price > 0 && (
                      <span className="text-xs text-muted-foreground">
                        (+₩{childValue.price.toLocaleString()})
                      </span>
                    )}
                  </div>
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
