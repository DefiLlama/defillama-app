import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnOrderState,
	ColumnSizingState
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { volumesColumnSizes, getColumnsByType, getColumnsOrdernSizeByType } from './columns'
import type { IDexsRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'
import { ColumnFilters2 } from '~/components/Filters/common/ColumnFilters'
import { TableFilters } from '~/components/Table/shared'
import { FiltersByCategory } from '~/components/Filters/yields/Categories'
import { RowFilter } from '~/components/Filters/common/RowFilter'
import { useRouter } from 'next/router'

export const PERIODS = ['24h', '7d', '30d', '1y']
const columnSizesKeys = Object.keys(volumesColumnSizes)
	.map((x) => Number(x))
	.sort((a, b) => Number(b) - Number(a))

const columnsOptions = (type, allChains) => [
	{ name: 'Name', key: 'displayName' },
	...getColumnsByType(type, allChains)
		.filter((c: any) => typeof c.header === 'string' && typeof c.accessorKey === 'string')
		.map((c: any) => ({ name: c.header as string, key: c.accessorKey as string }))
]

function normalizeUndefinedToNull(arr) {
	return arr.map((obj) => {
		if (typeof obj !== 'object' || obj === null) {
			return obj
		}

		const newObj = {}
		for (const [key, value] of Object.entries(obj)) {
			newObj[key] = value === undefined ? null : value
		}
		return newObj
	})
}
export function OverviewTable({ data, type, allChains, categories, selectedCategories, isSimpleFees }) {
	const optionsKey = 'table-columns-' + type
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'total24h' }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [period, setPeriod] = React.useState(null)
	const windowSize = useWindowSize()

	const normalizedData = React.useMemo(() => normalizeUndefinedToNull(data), [data])
	const instance = useReactTable({
		data: normalizedData,
		columns: getColumnsByType(type, allChains, isSimpleFees),
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing
		},
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => {
				const desc = sorting.length ? sorting[0].desc : true

				let a = (rowA.getValue(columnId) ?? null) as any
				let b = (rowB.getValue(columnId) ?? null) as any

				if (typeof a === 'number' && a <= 0) a = null
				if (typeof b === 'number' && b <= 0) b = null

				if (a === null && b !== null) {
					return desc ? -1 : 1
				}

				if (a !== null && b === null) {
					return desc ? 1 : -1
				}

				if (a === null && b === null) {
					return 0
				}

				return a - b
			}
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IDexsRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		enableSortingRemoval: false
	})

	const clearAllOptions = () => {
		window.localStorage.setItem(optionsKey, '{}')
		instance.getToggleAllColumnsVisibilityHandler()({ checked: false } as any)
	}
	const toggleAllOptions = () => {
		const ops = JSON.stringify(Object.fromEntries(columnsOptions(type, allChains).map((option) => [option.key, true])))
		window.localStorage.setItem(optionsKey, ops)
		instance.getToggleAllColumnsVisibilityHandler()({ checked: true } as any)
	}

	const addOption = (newOptions) => {
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, newOptions.includes(col.id) ? true : false])
		)
		window.localStorage.setItem(optionsKey, JSON.stringify(ops))
		instance.setColumnVisibility(ops)
	}

	const selectedOptions = instance
		.getAllLeafColumns()
		.filter((col) => col.getIsVisible())
		.map((col) => col.id)

	const setNewPeriod = (newPeriod) => {
		const periodsToRemove = PERIODS.filter((period) => period !== newPeriod)
		const columnsToRemove = instance
			.getAllLeafColumns()
			.filter((col) => periodsToRemove.some((p) => col?.columnDef?.header?.toString().includes(p)))
			.map((col) => col?.id)
		const newColumns = instance
			.getAllColumns()
			.filter((col) => !columnsToRemove.includes(col.id))
			.map((col) => col.id)

		setPeriod(newPeriod)
		addOption(newColumns)
	}

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? getColumnsOrdernSizeByType(type)?.order?.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		const cSize = windowSize.width
			? columnSizesKeys.find((size) => windowSize.width > Number(size))
			: columnSizesKeys[0]

		instance.setColumnSizing(getColumnsOrdernSizeByType(type).size[cSize])

		instance.setColumnOrder(order)
	}, [windowSize, instance, type])

	const router = useRouter()

	return (
		<>
			<TableFilters style={{ justifyContent: 'flex-end' }}>
				{isSimpleFees ? null : (
					<ColumnFilters2
						label={'Columns'}
						options={columnsOptions(type, allChains)}
						clearAllOptions={clearAllOptions}
						toggleAllOptions={toggleAllOptions}
						selectedOptions={selectedOptions}
						addOption={addOption}
						subMenu={false}
					/>
				)}

				{categories?.length > 0 && type !== 'dexs' && (
					<FiltersByCategory
						categoryList={categories}
						selectedCategories={selectedCategories}
						pathname={router.basePath}
						hideSelectedCount
					/>
				)}
				{type === 'fees' ? <RowFilter selectedValue={period} setValue={setNewPeriod} values={PERIODS} /> : null}
			</TableFilters>

			<VirtualTable instance={instance} />
		</>
	)
}
