import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Link, Unlink } from 'lucide-react'
import { optionService } from '@/services/optionService'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
    childAttribute: OptionAttribute | null
  } | null>(null)
  const [selectedChildAttributeId, setSelectedChildAttributeId] = useState<number | null>(null)
  const [selectedChildValueIds, setSelectedChildValueIds] = useState<number[]>([])

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
    mutationFn: ({ parentId, childId }: { parentId: number; childId: number }) =>
      optionService.setChildAttribute(parentId, childId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['options'] })
      closeChildAttributeDialog()
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

  // 자식 속성 연결 다이얼로그
  const openChildAttributeDialog = (attribute: OptionAttribute, option: Option) => {
    setSelectedParentAttribute(attribute)
    setSelectedChildAttributeId(null)
    // 현재 옵션에서 이 속성의 자식 속성을 찾음
    const childAttr = option.attributes.find(
      (a) => a.parentAttributeId === attribute.id
    )
    if (childAttr) {
      setSelectedChildAttributeId(childAttr.id)
    }
    setIsChildAttributeDialogOpen(true)
  }

  const closeChildAttributeDialog = () => {
    setIsChildAttributeDialogOpen(false)
    setSelectedParentAttribute(null)
    setSelectedChildAttributeId(null)
  }

  const handleChildAttributeSubmit = () => {
    if (selectedParentAttribute && selectedChildAttributeId) {
      setChildAttributeMutation.mutate({
        parentId: selectedParentAttribute.id,
        childId: selectedChildAttributeId,
      })
    }
  }

  // 자식 값 매핑 다이얼로그
  const openValueMappingDialog = (value: OptionAttributeValue, option: Option) => {
    // 부모 값의 속성에서 자식 속성 찾기
    const parentAttr = option.attributes.find((a) =>
      a.values.some((v) => v.id === value.id)
    )
    const childAttr = parentAttr
      ? option.attributes.find((a) => a.parentAttributeId === parentAttr.id)
      : null

    setSelectedParentValue({ value, childAttribute: childAttr ?? null })
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

  // 속성이 자식 속성으로 사용 가능한지 확인 (이미 다른 부모가 있거나 자신이 자식을 가지고 있으면 불가)
  const canBeChildAttribute = (attr: OptionAttribute, parentAttr: OptionAttribute) => {
    if (attr.id === parentAttr.id) return false // 자기 자신
    if (attr.isChildAttribute) return false // 이미 다른 부모가 있음
    if (attr.hasChildAttribute) return false // 이미 자식을 가짐 (3단계 계층 방지)
    return true
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
                    <p className="text-sm text-muted-foreground">
                      속성이 없습니다. 속성을 추가해주세요.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {option.attributes.map((attribute) => {
                        const childAttribute = option.attributes.find(
                          (a) => a.parentAttributeId === attribute.id
                        )
                        return (
                          <div
                            key={attribute.id}
                            className={`border rounded-lg p-4 ${
                              attribute.isChildAttribute
                                ? 'border-l-4 border-l-blue-400 bg-blue-50/30'
                                : ''
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium">{attribute.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {attribute.previewType}
                                </Badge>
                                {attribute.isMultiSelectable && (
                                  <Badge variant="secondary" className="text-xs">
                                    다중선택
                                  </Badge>
                                )}
                                {attribute.isChildAttribute && (
                                  <Badge
                                    variant="default"
                                    className="text-xs bg-blue-500 cursor-help"
                                    title={`부모 속성: ${attribute.parentAttributeName}\n부모 값에 연결된 자식 값만 선택 가능합니다`}
                                  >
                                    자식 속성 ({attribute.parentAttributeName})
                                  </Badge>
                                )}
                                {attribute.hasChildAttribute && childAttribute && (
                                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                                    부모 속성 → {childAttribute.name}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {/* 자식 속성 연결 버튼 (자식 속성이 아닌 경우에만 표시) */}
                                {!attribute.isChildAttribute && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openChildAttributeDialog(attribute, option)}
                                    title="이 속성의 자식 속성을 연결합니다"
                                  >
                                    <Link className="h-4 w-4 mr-1" />
                                    자식 속성
                                  </Button>
                                )}
                                {/* 부모 속성 연결 해제 버튼 */}
                                {attribute.isChildAttribute && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeChildAttributeMutation.mutate(attribute.id)}
                                    title="부모 속성 연결을 해제합니다"
                                  >
                                    <Unlink className="h-4 w-4 mr-1" />
                                    연결 해제
                                  </Button>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openValueDialog(attribute.id)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  값 추가
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteTarget({
                                      type: 'attribute',
                                      id: attribute.id,
                                      name: attribute.name,
                                    })
                                  }
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {attribute.values.map((value) => {
                                const hasChildValues = value.hasChildValues || (value.childValueIds && value.childValueIds.length > 0)
                                return (
                                  <div
                                    key={value.id}
                                    className={`flex items-center gap-1 px-2 py-1 rounded text-sm group ${
                                      hasChildValues ? 'bg-green-100 border border-green-300' : 'bg-muted'
                                    }`}
                                  >
                                    <span>{value.value}</span>
                                    {value.price > 0 && (
                                      <span className="text-muted-foreground">
                                        (+{value.price.toLocaleString()})
                                      </span>
                                    )}
                                    {hasChildValues && (
                                      <Badge
                                        variant="secondary"
                                        className="text-xs ml-1 cursor-help"
                                        title={`자식 값이 ${value.childValueIds?.length || 0}개 연결됨`}
                                      >
                                        {value.childValueIds?.length || 0}개 연결
                                      </Badge>
                                    )}
                                    {/* 자식 값 매핑 버튼 (부모 속성이고 자식 속성이 있는 경우에만) */}
                                    {attribute.hasChildAttribute && childAttribute && (
                                      <button
                                        onClick={() => openValueMappingDialog(value, option)}
                                        className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 hover:text-blue-700"
                                        title="자식 값 연결"
                                      >
                                        <Link className="h-3 w-3" />
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
                                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    </button>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
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
            <AlertDialogDescription>
              "{deleteTarget?.name}"을(를) 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 자식 속성 연결 다이얼로그 */}
      <Dialog open={isChildAttributeDialogOpen} onOpenChange={setIsChildAttributeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>자식 속성 연결</DialogTitle>
            <DialogDescription>
              "{selectedParentAttribute?.name}" 속성의 자식 속성을 선택하세요.
              자식 속성을 연결하면, 부모 값에 따라 자식 값을 필터링할 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {(() => {
              const parentOption = options.find((o) =>
                o.attributes.some((a) => a.id === selectedParentAttribute?.id)
              )
              if (!parentOption || !selectedParentAttribute) return null

              const availableAttributes = parentOption.attributes.filter((attr) =>
                canBeChildAttribute(attr, selectedParentAttribute)
              )

              if (availableAttributes.length === 0) {
                return (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    연결 가능한 속성이 없습니다.
                    <br />
                    <span className="text-xs">
                      (이미 부모/자식 관계가 있거나 같은 옵션 내에 다른 속성이 없습니다)
                    </span>
                  </p>
                )
              }

              return availableAttributes.map((attr) => (
                <div
                  key={attr.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedChildAttributeId === attr.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'hover:border-gray-400'
                  }`}
                  onClick={() => setSelectedChildAttributeId(attr.id)}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={selectedChildAttributeId === attr.id}
                      onChange={() => setSelectedChildAttributeId(attr.id)}
                      className="h-4 w-4"
                    />
                    <span className="font-medium">{attr.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {attr.values.length}개 값
                    </Badge>
                  </div>
                  {attr.values.length > 0 && (
                    <div className="mt-2 ml-6 flex flex-wrap gap-1">
                      {attr.values.slice(0, 5).map((v) => (
                        <Badge key={v.id} variant="secondary" className="text-xs">
                          {v.value}
                        </Badge>
                      ))}
                      {attr.values.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{attr.values.length - 5}개 더
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeChildAttributeDialog}>
              취소
            </Button>
            <Button
              onClick={handleChildAttributeSubmit}
              disabled={!selectedChildAttributeId || setChildAttributeMutation.isPending}
            >
              연결
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 자식 값 매핑 다이얼로그 */}
      <Dialog open={isValueMappingDialogOpen} onOpenChange={setIsValueMappingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>자식 값 연결</DialogTitle>
            <DialogDescription>
              "{selectedParentValue?.value.value}" 값에 연결할 자식 값을 선택하세요.
              {selectedParentValue?.childAttribute && (
                <span className="block mt-1 text-xs">
                  자식 속성: {selectedParentValue.childAttribute.name}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {selectedParentValue?.childAttribute?.values.map((childValue) => (
              <div
                key={childValue.id}
                className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  selectedChildValueIds.includes(childValue.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:border-gray-400'
                }`}
                onClick={() => toggleChildValueSelection(childValue.id)}
              >
                <input
                  type="checkbox"
                  checked={selectedChildValueIds.includes(childValue.id)}
                  onChange={() => toggleChildValueSelection(childValue.id)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <span>{childValue.value}</span>
                {childValue.price > 0 && (
                  <span className="text-xs text-muted-foreground">
                    (+{childValue.price.toLocaleString()})
                  </span>
                )}
              </div>
            ))}
            {(!selectedParentValue?.childAttribute?.values ||
              selectedParentValue.childAttribute.values.length === 0) && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                자식 속성에 값이 없습니다. 먼저 값을 추가해주세요.
              </p>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            선택된 자식 값: {selectedChildValueIds.length}개
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeValueMappingDialog}>
              취소
            </Button>
            <Button
              onClick={handleValueMappingSubmit}
              disabled={setValueMappingsMutation.isPending}
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
