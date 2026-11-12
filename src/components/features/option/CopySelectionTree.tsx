import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { OptionAttribute } from '@/types/option'

/** 트리의 한 줄 — 계층 순서의 속성과 들여쓰기 깊이 */
export interface SelectionRow {
  attribute: OptionAttribute
  depth: number
}

/** 고른 속성 · 값 id */
export interface CopySelectionState {
  attributeIds: ReadonlySet<number>
  valueIds: ReadonlySet<number>
}

/**
 * 속성을 계층 순서(상위 → 하위, 형제는 표시 순서)로 펼칩니다.
 *
 * @param {readonly OptionAttribute[]} attributes - 한 옵션의 속성 전체
 * @param {number} [rootId] - 주면 이 속성과 그 하위만 (속성 복사)
 * @returns {SelectionRow[]} 계층 순서의 행
 */
export function orderAttributes(attributes: readonly OptionAttribute[], rootId?: number): SelectionRow[] {
  const ids = new Set(attributes.map((a) => a.id))
  const children = new Map<number, OptionAttribute[]>()
  const roots: OptionAttribute[] = []
  const byOrder = (a: OptionAttribute, b: OptionAttribute) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0) || a.id - b.id
  for (const attribute of [...attributes].sort(byOrder)) {
    const parentId = attribute.parentAttributeId
    if (parentId != null && ids.has(parentId)) {
      const list = children.get(parentId) ?? []
      list.push(attribute)
      children.set(parentId, list)
    } else {
      roots.push(attribute)
    }
  }
  const rows: SelectionRow[] = []
  const visit = (attribute: OptionAttribute, depth: number) => {
    if (rows.some((row) => row.attribute.id === attribute.id)) return // 순환 방지
    rows.push({ attribute, depth })
    for (const child of children.get(attribute.id) ?? []) visit(child, depth + 1)
  }
  const start = rootId != null ? attributes.filter((a) => a.id === rootId) : roots
  for (const attribute of start) visit(attribute, 0)
  return rows
}

/**
 * 모든 속성 · 값을 고른 상태 (기본값)
 *
 * @param {readonly SelectionRow[]} rows - 트리 행
 * @returns {CopySelectionState} 전체 선택
 */
export function selectAll(rows: readonly SelectionRow[]): CopySelectionState {
  const attributeIds = new Set<number>()
  const valueIds = new Set<number>()
  for (const { attribute } of rows) {
    attributeIds.add(attribute.id)
    for (const value of attribute.values ?? []) valueIds.add(value.id)
  }
  return { attributeIds, valueIds }
}

/**
 * 실제로 복사될 속성 · 값만 남깁니다 (상위가 빠진 하위, 속성이 빠진 값 제외 — 서버 규칙과 동일).
 *
 * @param {readonly SelectionRow[]} rows - 트리 행
 * @param {CopySelectionState} selection - 고른 상태
 * @returns 요청에 넣을 속성 · 값 id
 */
export function effectiveSelection(
  rows: readonly SelectionRow[],
  selection: CopySelectionState
): { attributeIds: number[]; valueIds: number[] } {
  const inRows = new Set(rows.map((row) => row.attribute.id))
  const included = new Set<number>()
  const attributeIds: number[] = []
  const valueIds: number[] = []
  for (const { attribute } of rows) {
    const parentId = attribute.parentAttributeId
    const parentOk = parentId == null || !inRows.has(parentId) || included.has(parentId)
    if (!selection.attributeIds.has(attribute.id) || !parentOk) continue
    included.add(attribute.id)
    attributeIds.push(attribute.id)
    for (const value of attribute.values ?? []) {
      if (selection.valueIds.has(value.id)) valueIds.push(value.id)
    }
  }
  return { attributeIds, valueIds }
}

/** id 속성의 하위(손자 이하 포함) 속성 id */
function descendantsOf(rows: readonly SelectionRow[], id: number): number[] {
  const result: number[] = []
  const queue = [id]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const { attribute } of rows) {
      if (attribute.parentAttributeId === current) {
        result.push(attribute.id)
        queue.push(attribute.id)
      }
    }
  }
  return result
}

/** id 속성의 상위(조부모 이상 포함) 속성 id — 트리 안에 있는 것만 */
function ancestorsOf(rows: readonly SelectionRow[], id: number): number[] {
  const byId = new Map(rows.map((row) => [row.attribute.id, row.attribute]))
  const result: number[] = []
  let parentId = byId.get(id)?.parentAttributeId
  while (parentId != null && byId.has(parentId) && !result.includes(parentId)) {
    result.push(parentId)
    parentId = byId.get(parentId)?.parentAttributeId
  }
  return result
}

interface CopySelectionTreeProps {
  rows: readonly SelectionRow[]
  selection: CopySelectionState
  onChange: (selection: CopySelectionState) => void
  /** 항상 포함되어 해제할 수 없는 속성 (속성 복사의 원본) */
  lockedAttributeId?: number
}

/**
 * 복사 · 가져오기 범위를 고르는 체크 트리 (속성 › 값). 기본은 전체 선택.
 * 상위 속성을 해제하면 하위 속성도 해제되고, 값을 고르면 그 속성과 상위 속성이 함께 선택된다.
 *
 * @param {CopySelectionTreeProps} props - 행, 선택 상태, 변경 콜백, 잠근 속성
 */
export function CopySelectionTree({ rows, selection, onChange, lockedAttributeId }: CopySelectionTreeProps) {
  const totalAttributes = rows.length
  const totalValues = rows.reduce((sum, row) => sum + (row.attribute.values?.length ?? 0), 0)
  const effective = effectiveSelection(rows, selection)
  const allSelected = effective.attributeIds.length === totalAttributes && effective.valueIds.length === totalValues
  const noneSelected = effective.attributeIds.filter((id) => id !== lockedAttributeId).length === 0 && effective.valueIds.length === 0

  const toggleAll = (checked: boolean) => {
    if (checked) {
      onChange(selectAll(rows))
      return
    }
    onChange({
      attributeIds: new Set(lockedAttributeId != null ? [lockedAttributeId] : []),
      valueIds: new Set(),
    })
  }

  const toggleAttribute = (attribute: OptionAttribute, checked: boolean) => {
    const attributeIds = new Set(selection.attributeIds)
    const valueIds = new Set(selection.valueIds)
    const byId = new Map(rows.map((row) => [row.attribute.id, row.attribute]))
    if (checked) {
      for (const id of [attribute.id, ...ancestorsOf(rows, attribute.id)]) attributeIds.add(id)
      for (const value of attribute.values ?? []) valueIds.add(value.id)
    } else {
      for (const id of [attribute.id, ...descendantsOf(rows, attribute.id)]) {
        if (id === lockedAttributeId) continue
        attributeIds.delete(id)
        for (const value of byId.get(id)?.values ?? []) valueIds.delete(value.id)
      }
    }
    onChange({ attributeIds, valueIds })
  }

  const toggleValue = (attribute: OptionAttribute, valueId: number, checked: boolean) => {
    const attributeIds = new Set(selection.attributeIds)
    const valueIds = new Set(selection.valueIds)
    if (checked) {
      valueIds.add(valueId)
      for (const id of [attribute.id, ...ancestorsOf(rows, attribute.id)]) attributeIds.add(id)
    } else {
      valueIds.delete(valueId)
    }
    onChange({ attributeIds, valueIds })
  }

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">속성이 없습니다.</p>
  }

  return (
    <div className="rounded-md border">
      <label className="flex cursor-pointer items-center gap-2 border-b bg-muted/40 px-3 py-2 text-sm">
        <Checkbox
          checked={allSelected ? true : noneSelected ? false : 'indeterminate'}
          onCheckedChange={(checked) => toggleAll(checked === true)}
          aria-label="전체 선택"
        />
        <span className="font-medium">전체 선택</span>
        <span className="ml-auto text-xs text-muted-foreground">
          속성 {effective.attributeIds.length}/{totalAttributes} · 값 {effective.valueIds.length}/{totalValues}
        </span>
      </label>
      <div className="max-h-72 space-y-2 overflow-y-auto p-3">
        {rows.map(({ attribute, depth }) => {
          const attributeChecked = effective.attributeIds.includes(attribute.id)
          const locked = attribute.id === lockedAttributeId
          return (
            <div key={attribute.id} style={{ paddingLeft: depth * 20 }} className="space-y-1.5">
              <label className={cn('flex items-center gap-2 text-sm', locked ? 'cursor-default' : 'cursor-pointer')}>
                <Checkbox
                  checked={attributeChecked}
                  disabled={locked}
                  onCheckedChange={(checked) => toggleAttribute(attribute, checked === true)}
                  aria-label={`${attribute.name} 속성 선택`}
                />
                <span className={cn('font-medium', !attributeChecked && 'text-muted-foreground line-through')}>
                  {depth > 0 && <span className="mr-1 text-muted-foreground">└</span>}
                  {attribute.name}
                </span>
                <span className="text-xs text-muted-foreground">값 {attribute.values?.length ?? 0}개</span>
              </label>
              {(attribute.values?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {attribute.values.map((value) => {
                    const valueChecked = attributeChecked && selection.valueIds.has(value.id)
                    return (
                      <label
                        key={value.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-1 rounded border px-1.5 py-0.5 text-xs',
                          valueChecked ? 'border-blue-200 bg-blue-50 text-blue-700' : 'text-muted-foreground'
                        )}
                      >
                        <Checkbox
                          className="h-3.5 w-3.5 [&_svg]:h-3 [&_svg]:w-3"
                          checked={valueChecked}
                          onCheckedChange={(checked) => toggleValue(attribute, value.id, checked === true)}
                          aria-label={`${attribute.name} ${value.value} 값 선택`}
                        />
                        {value.value}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
