import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnOrderState,
	ColumnSizingState,
	getFilteredRowModel,
	ColumnFiltersState
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import { volumesColumnSizes, getColumnsByType, getColumnsOrdernSizeByType } from './columns'
import type { IDexsRow } from './types'
import useWindowSize from '~/hooks/useWindowSize'
import { TagGroup } from '~/components/TagGroup'
import { useRouter } from 'next/router'
import { Icon } from '~/components/Icon'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

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
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const [period, setPeriod] = React.useState(null)
	const windowSize = useWindowSize()
	const columns = React.useMemo(() => getColumnsByType(type, allChains, isSimpleFees), [type, isSimpleFees, allChains])
	const normalizedData = React.useMemo(() => normalizeUndefinedToNull(data), [data])
	const instance = useReactTable({
		data: normalizedData,
		columns,
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing,
			columnFilters
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
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
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

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('displayName')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(projectName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	const router = useRouter()

	const { category, chain, ...queries } = router.query

	const addCategory = (newCategory) => {
		router.push(
			{
				pathname: router.basePath,
				query: {
					...queries,
					...(!router.basePath.includes('/chains/') && chain ? { chain } : {}),
					category: newCategory
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAllCategories = () => {
		router.push(
			{
				pathname: router.basePath,
				query: {
					...queries,
					category: 'All'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllCategories = () => {
		router.push(
			{
				pathname: router.basePath,
				query: {
					...queries,
					category: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<>
			<div className="flex items-center justify-end flex-wrap gap-5 -mb-5">
				<div className="relative w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-[var(--text3)] top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="border border-black/10 dark:border-white/10 w-full p-2 pl-7 bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
				{isSimpleFees ? null : (
					<SelectWithCombobox
						allValues={columnsOptions(type, allChains)}
						selectedValues={selectedOptions}
						setSelectedValues={addOption}
						toggleAll={toggleAllOptions}
						clearAll={clearAllOptions}
						nestedMenu={false}
						label={'Columns'}
						labelType="smol"
						triggerProps={{
							className:
								'bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative'
						}}
					/>
				)}

				{categories?.length > 0 && type !== 'dexs' && (
					<SelectWithCombobox
						allValues={categories}
						selectedValues={selectedCategories}
						setSelectedValues={addCategory}
						toggleAll={toggleAllCategories}
						clearAll={clearAllCategories}
						nestedMenu={false}
						label={'Category'}
						labelType="smol"
						triggerProps={{
							className:
								'bg-[var(--btn2-bg)]  hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative'
						}}
					/>
				)}
				{type === 'fees' ? <TagGroup selectedValue={period} setValue={setNewPeriod} values={PERIODS} /> : null}
			</div>

			<VirtualTable instance={instance} />
		</>
	)
}
