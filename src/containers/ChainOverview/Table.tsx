import { useCallback, useMemo, useState, useSyncExternalStore } from 'react'
import { useRouter } from 'next/router'
import * as Ariakit from '@ariakit/react'
import {
	createColumnHelper,
	getCoreRowModel,
	getExpandedRowModel,
	getSortedRowModel,
	useReactTable,
	type ColumnDef,
	type ColumnSizingState,
	type ExpandedState,
	type SortingState
} from '@tanstack/react-table'
import { Bookmark } from '~/components/Bookmark'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { QuestionHelper } from '~/components/QuestionHelper'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { alphanumericFalsyLast } from '~/components/Table/utils'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { ICONS_CDN, removedCategoriesFromChainTvlSet } from '~/constants'
import { subscribeToLocalStorage, useCustomColumns, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { formatProtocolsList2 } from '~/hooks/data/defi'
import { definitions } from '~/public/definitions'
import { chainIconUrl, formattedNum, formattedPercent, slug, toNumberOrNullFromQueryParam } from '~/utils'
import { formatValue } from '../../utils'
import { CustomColumnModal } from './CustomColumnModal'
import { replaceAliases, sampleProtocol } from './customColumnsUtils'
import { evaluateFormula, getSortableValue } from './formula.service'
import type { IProtocol } from './types'

export interface CustomColumnDef {
	name: string
	formula: string
	formatType: 'auto' | 'number' | 'usd' | 'percent' | 'string' | 'boolean'
	determinedFormat?: 'number' | 'usd' | 'percent' | 'string' | 'boolean'
}

export const ChainProtocolsTable = ({
	protocols,
	sampleRow = sampleProtocol,
	useStickyHeader = true,
	borderless = false
}: {
	protocols: Array<IProtocol>
	sampleRow?: any
	useStickyHeader?: boolean
	borderless?: boolean
}) => {
	const { customColumns, setCustomColumns } = useCustomColumns()

	const router = useRouter()
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const minTvl = toNumberOrNullFromQueryParam(router.query.minTvl)
	const maxTvl = toNumberOrNullFromQueryParam(router.query.maxTvl)

	const finalProtocols = useMemo(() => {
		return formatProtocolsList2({ protocols, extraTvlsEnabled, minTvl, maxTvl })
	}, [protocols, extraTvlsEnabled, minTvl, maxTvl])

	const columnsInStorage = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(tableColumnOptionsKey) ?? defaultColumns,
		() => defaultColumns
	)

	const filterState = useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(tableFilterStateKey) ?? null,
		() => null
	)

	const clearAllColumns = () => {
		const ops = JSON.stringify(
			Object.fromEntries(
				[...columnOptions, ...customColumns.map((col, idx) => ({ key: `custom_formula_${idx}` }))].map((option) => [
					option.key,
					false
				])
			)
		)
		window.localStorage.setItem(tableColumnOptionsKey, ops)
		window.dispatchEvent(new Event('storage'))
		if (instance && instance.setColumnVisibility) {
			instance.setColumnVisibility(JSON.parse(ops))
		}
	}
	const toggleAllColumns = () => {
		const ops = JSON.stringify(
			Object.fromEntries(
				[...columnOptions, ...customColumns.map((col, idx) => ({ key: `custom_formula_${idx}` }))].map((option) => [
					option.key,
					true
				])
			)
		)
		window.localStorage.setItem(tableColumnOptionsKey, ops)
		window.dispatchEvent(new Event('storage'))
		if (instance && instance.setColumnVisibility) {
			instance.setColumnVisibility(JSON.parse(ops))
		}
	}

	const [customColumnModalEditIndex, setCustomColumnModalEditIndex] = useState<number | null>(null)
	const [customColumnModalInitialValues, setCustomColumnModalInitialValues] = useState<
		Partial<CustomColumnDef> | undefined
	>(undefined)

	const customColumnDialogStore = Ariakit.useDialogStore()
	const handleAddCustomColumn = () => {
		setCustomColumnModalEditIndex(null)
		setCustomColumnModalInitialValues(undefined)
		customColumnDialogStore.toggle()
	}
	const handleEditCustomColumn = (idx: number) => {
		setCustomColumnModalEditIndex(idx)
		setCustomColumnModalInitialValues(customColumns[idx])
		customColumnDialogStore.toggle()
	}
	const handleDeleteCustomColumn = (idx: number) => {
		const next = customColumns.filter((_, i) => i !== idx)
		setCustomColumns(next)
	}
	const handleSaveCustomColumn = (def: CustomColumnDef) => {
		let next: CustomColumnDef[]
		let newColumnKey: string | undefined
		if (customColumnModalEditIndex === null) {
			next = [...customColumns, def]
			newColumnKey = `custom_formula_${customColumns.length}`
		} else {
			next = customColumns.map((col, i) => (i === customColumnModalEditIndex ? def : col))
		}
		setCustomColumns(next)
		customColumnDialogStore.toggle()

		if (newColumnKey) {
			const allKeys = [...columnOptions.map((c) => c.key), ...next.map((_, idx) => `custom_formula_${idx}`)]
			let ops: Record<string, boolean> = {}
			try {
				ops = JSON.parse(localStorage.getItem(tableColumnOptionsKey) ?? '{}')
			} catch {}
			allKeys.forEach((key) => {
				if (key === newColumnKey) {
					ops[key] = true
				} else if (!(key in ops)) {
					ops[key] = false
				}
			})
			localStorage.setItem(tableColumnOptionsKey, JSON.stringify(ops))
			window.dispatchEvent(new Event('storage'))
			if (instance && instance.setColumnVisibility) {
				instance.setColumnVisibility(ops)
			}
		}
	}

	const mergedColumns = useMemo(() => {
		return [
			...columnOptions,
			...customColumns.map((col, idx) => ({
				name: col.name,
				key: `custom_formula_${idx}`,
				isCustom: true,
				customIndex: idx,
				formula: col.formula,
				formatType: col.formatType
			}))
		]
	}, [customColumns])

	const addColumn = (newColumns) => {
		const allKeys = mergedColumns.map((col) => col.key)
		const ops = Object.fromEntries(allKeys.map((key) => [key, newColumns.includes(key) ? true : false]))
		window.localStorage.setItem(tableColumnOptionsKey, JSON.stringify(ops))

		if (instance && instance.setColumnVisibility) {
			instance.setColumnVisibility(ops)
		} else {
			window.dispatchEvent(new Event('storage'))
		}
	}

	const addOnlyOneColumn = (newOption) => {
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, col.id === newOption ? true : false])
		)
		window.localStorage.setItem(tableColumnOptionsKey, JSON.stringify(ops))
		window.dispatchEvent(new Event('storage'))
		if (instance && instance.setColumnVisibility) {
			instance.setColumnVisibility(ops)
		} else {
			window.dispatchEvent(new Event('storage'))
		}
	}

	const selectedColumns = useMemo(() => {
		const storage = JSON.parse(columnsInStorage)
		return mergedColumns.filter((c) => (storage[c.key] ? true : false)).map((c) => c.key)
	}, [columnsInStorage, mergedColumns])

	const [sorting, setSorting] = useState<SortingState>([
		{ desc: true, id: MAIN_COLUMN_BY_CATEGORY[filterState] ?? 'tvl' }
	])
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [expanded, setExpanded] = useState<ExpandedState>({})

	const customColumnDefs = useMemo(() => {
		return customColumns.map((col, idx) => {
			const columnId = `custom_formula_${idx}`

			return columnHelper.accessor(
				(row) => {
					const formulaWithPaths = replaceAliases(col.formula)
					const { value, error } = evaluateFormula(formulaWithPaths, row)

					if (error) {
						return null
					}

					const usedFormat = col.determinedFormat || col.formatType
					return getSortableValue(value, usedFormat)
				},
				{
					id: columnId,
					header: col.name,
					cell: ({ row }) => {
						const formulaWithPaths = replaceAliases(col.formula)
						const { value, error } = evaluateFormula(formulaWithPaths, row.original)

						if (error || value === '' || value === null || (typeof value === 'boolean' && value === false && error)) {
							return null
						}

						if (error) {
							return (
								<span title={error} className="cursor-help text-red-600">
									Err
								</span>
							)
						}

						const usedFormat = col.determinedFormat || col.formatType
						if (usedFormat === 'boolean' && typeof value === 'boolean') {
							return (
								<span title={value ? 'True' : 'False'} className="flex items-center">
									{value ? '✅' : '❌'}
								</span>
							)
						}

						return <span className="flex items-center">{formatValue(value, usedFormat)}</span>
					},
					sortingFn: (rowA, rowB, columnId) => {
						const usedFormat = col.determinedFormat || col.formatType
						const desc = sorting.length ? sorting[0].desc : true

						let a = rowA.getValue(columnId)
						let b = rowB.getValue(columnId)

						if (a === null && b !== null) {
							return desc ? -1 : 1
						}

						if (a !== null && b === null) {
							return desc ? 1 : -1
						}

						if (a === null && b === null) {
							return 0
						}

						if (usedFormat === 'string') {
							return String(a).localeCompare(String(b))
						} else if (usedFormat === 'boolean') {
							if (a === true && b === false) return 1
							if (a === false && b === true) return -1
							return 0
						} else {
							return Number(a) - Number(b)
						}
					},
					sortUndefined: 'last',
					size: 140,
					meta: { align: 'end', headerHelperText: col.formula }
				}
			)
		})
	}, [customColumns, sorting])

	const allColumns = useMemo(
		() => [
			...columns,
			...(customColumnDefs.length > 0
				? [
						{
							id: 'custom_columns',
							header: 'Custom Columns',
							columns: customColumnDefs
						}
					]
				: [])
		],
		[customColumnDefs]
	)

	const instance = useReactTable({
		data: finalProtocols,
		columns: allColumns,
		state: {
			sorting,
			expanded,
			columnSizing,
			columnVisibility: JSON.parse(columnsInStorage)
		},
		sortingFns: {
			alphanumericFalsyLast: (rowA, rowB, columnId) => alphanumericFalsyLast(rowA, rowB, columnId, sorting)
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: IProtocol) => row.childProtocols,
		onSortingChange: (updater) => {
			setSorting((old) => {
				const newSorting = updater instanceof Function ? updater(old) : updater

				if (newSorting.length === 0 && old.length === 1) {
					const currentDesc = old[0].desc
					if (currentDesc === undefined) {
						return [{ ...old[0], desc: false }]
					} else if (currentDesc === false) {
						return [{ ...old[0], desc: true }]
					} else {
						return [{ ...old[0], desc: undefined }]
					}
				}

				return newSorting
			})
		},
		onColumnSizingChange: setColumnSizing,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const setFilter = (key) => (newState) => {
		const newColumns = Object.fromEntries(
			columnOptions.map((column) => [
				column.key,
				['name', 'category'].includes(column.key) ? true : column[key] === newState
			])
		)

		if (columnsInStorage === JSON.stringify(newColumns)) {
			toggleAllColumns()
			window.localStorage.setItem(tableFilterStateKey, null)
			instance.setSorting([{ id: 'tvl', desc: true }])
			// window.dispatchEvent(new Event('storage'))
		} else {
			window.localStorage.setItem(tableColumnOptionsKey, JSON.stringify(newColumns))
			window.localStorage.setItem(tableFilterStateKey, newState)
			instance.setSorting([{ id: MAIN_COLUMN_BY_CATEGORY[newState] ?? 'tvl', desc: true }])
			// window.dispatchEvent(new Event('storage'))
		}
	}

	const prepareCsv = useCallback(() => {
		const visibleColumns = instance.getVisibleFlatColumns().filter((col) => col.id !== 'custom_columns')
		const headers = visibleColumns.map((col) => {
			if (typeof col.columnDef.header === 'string') {
				return col.columnDef.header
			}
			return col.id
		})

		const rows = instance.getSortedRowModel().rows.map((row) => {
			return visibleColumns.map((col) => {
				const cell = row.getAllCells().find((c) => c.column.id === col.id)
				if (!cell) return ''

				const value = cell.getValue()
				if (value === null || value === undefined) return ''

				if (col.id === 'name') {
					return `"${row.original.name}"`
				} else if (col.id === 'category') {
					return row.original.category || ''
				} else if (col.id === 'tvl') {
					return row.original.tvl?.default?.tvl || 0
				} else if (col.id.includes('change_')) {
					return value
				} else if (col.id === 'mcaptvl' || col.id === 'pf' || col.id === 'ps') {
					return value
				} else if (typeof value === 'number') {
					return value
				} else {
					const str = String(value)
					return str.includes(',') ? `"${str}"` : str
				}
			})
		})

		const chainName = router.query.chain || 'all'

		return {
			filename: `defillama-${chainName}-protocols.csv`,
			rows: [headers, ...rows] as (string | number | boolean)[][]
		}
	}, [instance, router.query.chain])

	return (
		<div className={borderless ? 'isolate' : 'isolate rounded-md border border-(--cards-border) bg-(--cards-bg)'}>
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				{borderless ? null : (
					<div className="mr-auto flex w-full grow text-lg font-semibold md:w-auto">Protocol Rankings</div>
				)}

				<TagGroup
					setValue={setFilter('category')}
					selectedValue={filterState}
					values={Object.values(TABLE_CATEGORIES) as Array<string>}
					className="max-sm:w-full"
					triggerClassName="inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
				/>
				<TagGroup
					setValue={setFilter('period')}
					selectedValue={filterState}
					values={Object.values(TABLE_PERIODS) as Array<string>}
					className="max-sm:w-full"
					triggerClassName="inline-flex max-sm:flex-1 items-center justify-center whitespace-nowrap"
				/>

				<SelectWithCombobox
					allValues={mergedColumns}
					selectedValues={selectedColumns}
					setSelectedValues={addColumn}
					selectOnlyOne={addOnlyOneColumn}
					toggleAll={toggleAllColumns}
					clearAll={clearAllColumns}
					nestedMenu={false}
					label={'Columns'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
					customFooter={
						<button
							className="flex w-full items-center gap-2 rounded-md border border-(--form-control-border) bg-(--btn-bg) p-3 text-sm font-medium text-(--text-primary) hover:bg-(--btn-hover-bg)"
							onClick={handleAddCustomColumn}
							type="button"
						>
							<Icon name="plus" height={16} width={16} />
							Add Custom Column
						</button>
					}
					onEditCustomColumn={handleEditCustomColumn}
					onDeleteCustomColumn={handleDeleteCustomColumn}
				/>
				<TVLRange triggerClassName="w-full sm:w-auto" />
				<CSVDownloadButton prepareCsv={prepareCsv} />
			</div>
			<VirtualTable instance={instance} useStickyHeader={useStickyHeader} />
			<CustomColumnModal
				dialogStore={customColumnDialogStore}
				onSave={handleSaveCustomColumn}
				sampleRow={sampleRow}
				key={`custom-index-${customColumnModalEditIndex}`}
				{...(customColumnModalInitialValues || {})}
			/>
		</div>
	)
}

const tableColumnOptionsKey = 'ptc'
const tableFilterStateKey = 'ptcfs'

enum TABLE_CATEGORIES {
	FEES = 'Fees',
	REVENUE = 'Revenue',
	VOLUME = 'Volume',
	TVL = 'TVL'
}

const MAIN_COLUMN_BY_CATEGORY = {
	[TABLE_CATEGORIES.TVL]: 'tvl',
	[TABLE_CATEGORIES.FEES]: 'fees_24h',
	[TABLE_CATEGORIES.REVENUE]: 'revenue_24h',
	[TABLE_CATEGORIES.VOLUME]: 'dex_volume_24h'
}

enum TABLE_PERIODS {
	ONE_DAY = '1d',
	SEVEN_DAYS = '7d',
	ONE_MONTH = '1m'
}

const columnOptions = [
	{ name: 'Name', key: 'name' },
	{ name: 'Category', key: 'category' },
	{ name: 'TVL', key: 'tvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'TVL 1d change', key: 'change_1d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'TVL 7d change', key: 'change_7d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'TVL 1m change', key: 'change_1m', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Mcap/TVL', key: 'mcaptvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'Fees 24h', key: 'fees_24h', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Fees 7d', key: 'fees_7d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Fees 30d', key: 'fees_30d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Fees 1Y',
		key: 'fees_1y',
		category: TABLE_CATEGORIES.FEES
	},
	{
		name: 'Monthly Avg 1Y Fees',
		key: 'average_fees_1y',
		category: TABLE_CATEGORIES.FEES
	},
	{ name: 'Cumulative Fees', key: 'fees_cumulative', category: TABLE_CATEGORIES.FEES },
	{ name: 'Revenue 24h', key: 'revenue_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Revenue 7d', key: 'revenue_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Revenue 30d', key: 'revenue_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Revenue 1y', key: 'revenue_1y', category: TABLE_CATEGORIES.REVENUE },
	{
		name: 'Monthly Avg 1Y Rev',
		key: 'average_revenue_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{ name: 'Cumulative Revenue', key: 'cumulativeRevenue', category: TABLE_CATEGORIES.REVENUE },
	{
		name: 'Holders Revenue 24h',
		key: 'holdersRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Holders Revenue 7d',
		key: 'holdersRevenue_7d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Holders Revenue 30d',
		key: 'holdersRevenue_30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Holders Revenue 1y', key: 'holdersRevenue_1y', category: TABLE_CATEGORIES.REVENUE },
	{
		name: 'Monthly Avg 1Y Holders Revenue',
		key: 'average_holdersRevenue_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{ name: 'Cumulative Holders Revenue', key: 'cumulativeHoldersRevenue', category: TABLE_CATEGORIES.REVENUE },
	{ name: 'Incentives 24h', key: 'emissions_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Incentives 7d', key: 'emissions_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Incentives 30d', key: 'emissions_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Incentives 1Y',
		key: 'emissions_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{
		name: 'Monthly Avg 1Y Incentives',
		key: 'average_emissions_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{ name: 'Cumulative Incentives', key: 'cumulativeEmissions', category: TABLE_CATEGORIES.REVENUE },
	{ name: 'Earnings 24h', key: 'earnings_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Earnings 7d', key: 'earnings_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Earnings 30d', key: 'earnings_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Earnings 1Y',
		key: 'earnings_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{
		name: 'Monthly Avg 1Y Earnings',
		key: 'average_earnings_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{
		name: 'Cumulative Earnings',
		key: 'cumulativeEarnings',
		category: TABLE_CATEGORIES.REVENUE
	},
	{ name: 'P/S', key: 'ps', category: TABLE_CATEGORIES.REVENUE },
	{ name: 'P/F', key: 'pf', category: TABLE_CATEGORIES.FEES },
	{ name: 'Spot Volume 24h', key: 'dex_volume_24h', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Spot Volume 7d', key: 'dex_volume_7d', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.SEVEN_DAYS },
	{
		name: 'Spot Volume Change 7d',
		key: 'dex_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{ name: 'Spot Cumulative Volume', key: 'dex_cumulative_volume', category: TABLE_CATEGORIES.VOLUME }
]

const columnHelper = createColumnHelper<IProtocol>()

const columns: ColumnDef<IProtocol>[] = [
	{
		id: 'name',
		header: 'Name',
		accessorKey: 'name',
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index
			const Chains = () => (
				<span className="flex flex-col gap-1">
					{row.original.chains.map((chain) => (
						<span key={`/chain/${chain}/${row.original.slug}`} className="flex items-center gap-1">
							<TokenLogo logo={chainIconUrl(chain)} size={14} />
							<span>{chain}</span>
						</span>
					))}
				</span>
			)

			return (
				<span className={`relative flex items-center gap-2 ${row.depth > 0 ? 'pl-12' : 'pl-6'}`}>
					{row.subRows?.length > 0 ? (
						<button
							className="absolute -left-0.5"
							{...{
								onClick: row.getToggleExpandedHandler()
							}}
						>
							{row.getIsExpanded() ? (
								<>
									<Icon name="chevron-down" height={16} width={16} />
									<span className="sr-only">View child protocols</span>
								</>
							) : (
								<>
									<Icon name="chevron-right" height={16} width={16} />
									<span className="sr-only">Hide child protocols</span>
								</>
							)}
						</button>
					) : (
						<Bookmark readableName={value} data-lgonly data-bookmark />
					)}

					<span className="shrink-0">{index + 1}</span>

					<TokenLogo logo={`${ICONS_CDN}/protocols/${row.original.slug}?w=48&h=48`} data-lgonly />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/protocol/${row.original.slug}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>

						<Tooltip content={<Chains />} className="text-[0.7rem] text-(--text-disabled)">
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' && (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					)}
				</span>
			)
		},
		size: 240
	},
	{
		id: 'category',
		header: 'Category',
		accessorKey: 'category',
		enableSorting: false,
		cell: ({ getValue }) =>
			getValue() ? (
				<BasicLink href={`/protocols/${slug(getValue() as string)}`} className="text-sm font-medium text-(--link-text)">
					{getValue() as string}
				</BasicLink>
			) : (
				''
			),
		size: 140,
		meta: {
			align: 'end'
		}
	},
	columnHelper.group({
		id: 'tvl',
		header: 'TVL',
		columns: [
			columnHelper.accessor((row) => row.tvl?.default?.tvl, {
				id: 'tvl',
				header: 'TVL',
				cell: ({ row }) =>
					row.original.tvl ? (
						row.original.strikeTvl || row.original.tvl.excludeParent ? (
							<ProtocolTvlCell rowValues={row.original} />
						) : (
							<>{`$${formattedNum(row.original.tvl?.default?.tvl || 0)}`}</>
						)
					) : null,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: 'Value of all coins held in smart contracts of the protocol'
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.tvlChange?.change1d, {
				id: 'change_1d',
				header: '1d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 24 hours'
				},
				size: 110
			}),
			columnHelper.accessor((row) => row.tvlChange?.change7d, {
				id: 'change_7d',
				header: '7d Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 7 days'
				},
				size: 110
			}),
			columnHelper.accessor((row) => row.tvlChange?.change1m, {
				id: 'change_1m',
				header: '1m Change',
				cell: ({ getValue }) => <>{formattedPercent(getValue())}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 30 days'
				},
				size: 110
			}),
			columnHelper.accessor('mcaptvl', {
				id: 'mcaptvl',
				header: 'Mcap/TVL',
				cell: (info) => {
					return <>{info.getValue() ?? null}</>
				},
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				size: 110,
				meta: {
					align: 'end',
					headerHelperText: 'Market cap / TVL ratio'
				}
			})
		],
		meta: { headerHelperText: 'Value of all coins held in smart contracts of the protocol' }
	}),
	columnHelper.group({
		id: 'fees',
		header: 'Fees & Revenue',
		columns: [
			columnHelper.accessor((row) => row.fees?.total24h, {
				id: 'fees_24h',
				header: 'Fees 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['24h']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total24h, {
				id: 'revenue_24h',
				header: 'Revenue 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['24h']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total24h, {
				id: 'holdersRevenue_24h',
				header: 'Holders Revenue 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['24h']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.emissions?.total24h, {
				id: 'emissions_24h',
				header: 'Incentives 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['24h']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total7d, {
				id: 'fees_7d',
				header: 'Fees 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['7d']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total7d, {
				id: 'revenue_7d',
				header: 'Revenue 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['7d']
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total7d, {
				id: 'holdersRevenue_7d',
				header: 'Holders Revenue 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['7d']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.emissions?.total7d, {
				id: 'emissions_7d',
				header: 'Incentives 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['7d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total30d, {
				id: 'fees_30d',
				header: 'Fees 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['30d']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total30d, {
				id: 'revenue_30d',
				header: 'Revenue 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['30d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total30d, {
				id: 'holdersRevenue_30d',
				header: 'Holders Revenue 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['30d']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.emissions?.total30d, {
				id: 'emissions_30d',
				header: 'Incentives 30d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['30d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total1y, {
				id: 'fees_1y',
				header: 'Fees 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['1y']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.fees?.monthlyAverage1y, {
				id: 'average_fees_1y',
				header: 'Monthly Avg 1Y Fees',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['monthlyAverage1y']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.revenue?.total1y, {
				id: 'revenue_1y',
				header: 'Revenue 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['1y']
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total1y, {
				id: 'holdersRevenue_1y',
				header: 'Holders Revenue 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['1y']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.revenue?.monthlyAverage1y, {
				id: 'average_revenue_1y',
				header: 'Monthly Avg 1Y Rev',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['monthlyAverage1y']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.monthlyAverage1y, {
				id: 'average_holdersRevenue_1y',
				header: 'Monthly Avg 1Y Holders Revenue',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['monthlyAverage1y']
				},
				size: 260
			}),
			columnHelper.accessor((row) => row.emissions?.total1y, {
				id: 'emissions_1y',
				header: 'Incentives 1Y',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['1y']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.emissions?.monthlyAverage1y, {
				id: 'average_emissions_1y',
				header: 'Monthly Avg 1Y Incentives',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['monthlyAverage1y']
				},
				size: 220
			}),
			columnHelper.accessor((row) => row.fees?.totalAllTime, {
				id: 'fees_cumulative',
				header: 'Cumulative Fees',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['cumulative']
				},
				size: 150
			}),
			columnHelper.accessor((row) => row.revenue?.totalAllTime, {
				id: 'cumulativeRevenue',
				header: 'Cumulative Revenue',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['cumulative']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.totalAllTime, {
				id: 'cumulativeHoldersRevenue',
				header: 'Cumulative Holders Revenue',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['cumulative']
				},
				size: 220
			}),
			columnHelper.accessor((row) => row.emissions?.totalAllTime, {
				id: 'cumulativeEmissions',
				header: 'Cumulative Incentives',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['cumulative']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.fees?.pf, {
				id: 'pf',
				header: 'P/F',
				cell: (info) => <>{info.getValue() != null ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['pf']
				},
				size: 80
			}),
			columnHelper.accessor((row) => row.revenue?.ps, {
				id: 'ps',
				header: 'P/S',
				cell: (info) => <>{info.getValue() != null ? info.getValue() + 'x' : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['ps']
				},
				size: 80
			}),
			columnHelper.accessor(
				(row) => {
					const revenue = row.revenue?.total24h ?? 0
					const emissions = row.emissions?.total24h ?? 0
					return revenue && emissions ? revenue - emissions : revenue || null
				},
				{
					id: 'earnings_24h',
					header: 'Earnings 24h',
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					sortingFn: 'alphanumericFalsyLast' as any,
					meta: {
						align: 'end',
						headerHelperText: definitions.earnings.protocol['24h']
					},
					size: 125
				}
			),
			columnHelper.accessor(
				(row) => {
					const revenue = row.revenue?.total7d ?? 0
					const emissions = row.emissions?.total7d ?? 0
					return revenue && emissions ? revenue - emissions : revenue || null
				},
				{
					id: 'earnings_7d',
					header: 'Earnings 7d',
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					sortingFn: 'alphanumericFalsyLast' as any,
					meta: {
						align: 'end',
						headerHelperText: definitions.earnings.protocol['7d']
					},
					size: 125
				}
			),
			columnHelper.accessor(
				(row) => {
					const revenue = row.revenue?.total30d ?? 0
					const emissions = row.emissions?.total30d ?? 0
					return revenue && emissions ? revenue - emissions : revenue || null
				},
				{
					id: 'earnings_30d',
					header: 'Earnings 30d',
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					sortingFn: 'alphanumericFalsyLast' as any,
					meta: {
						align: 'end',
						headerHelperText: definitions.earnings.protocol['30d']
					},
					size: 125
				}
			),
			columnHelper.accessor(
				(row) => {
					const revenue = row.revenue?.total1y ?? 0
					const emissions = row.emissions?.total1y ?? 0
					return revenue && emissions ? revenue - emissions : revenue || null
				},
				{
					id: 'earnings_1y',
					header: 'Earnings 1Y',
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					sortingFn: 'alphanumericFalsyLast' as any,
					meta: {
						align: 'end',
						headerHelperText: definitions.earnings.protocol['1y']
					},
					size: 125
				}
			),
			columnHelper.accessor(
				(row) => {
					const revenue = row.revenue?.monthlyAverage1y ?? 0
					const emissions = row.emissions?.monthlyAverage1y ?? 0
					return revenue && emissions ? revenue - emissions : revenue || null
				},
				{
					id: 'average_earnings_1y',
					header: 'Monthly Avg 1Y Earnings',
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					sortingFn: 'alphanumericFalsyLast' as any,
					meta: {
						align: 'end',
						headerHelperText: definitions.earnings.protocol['monthlyAverage1y']
					},
					size: 200
				}
			),
			columnHelper.accessor(
				(row) => {
					const revenue = row.revenue?.totalAllTime ?? 0
					const emissions = row.emissions?.totalAllTime ?? 0
					return revenue && emissions ? revenue - emissions : revenue || null
				},
				{
					id: 'cumulativeEarnings',
					header: 'Cumulative Earnings',
					cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
					sortUndefined: 'last',
					sortingFn: 'alphanumericFalsyLast' as any,
					meta: {
						align: 'end',
						headerHelperText: definitions.earnings.protocol['cumulative']
					},
					size: 180
				}
			)
		],
		meta: {
			headerHelperText:
				definitions.fees.common + '\n\n' + definitions.revenue.common + '\n\n' + definitions.holdersRevenue.common
		}
	}),
	columnHelper.group({
		id: 'volume',
		header: 'Volume',
		columns: [
			columnHelper.accessor((row) => row.dexs?.total24h, {
				id: 'dex_volume_24h',
				header: 'Spot Volume 24h',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['24h']
				},
				size: 150
			}),
			columnHelper.accessor((row) => row.dexs?.total7d, {
				id: 'dex_volume_7d',
				header: 'Spot Volume 7d',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['7d']
				},
				size: 150
			}),
			columnHelper.accessor((row) => row.dexs?.change_7dover7d, {
				id: 'dex_volume_change_7d',
				header: 'Spot Change 7d',
				cell: ({ getValue }) => <>{getValue() != 0 ? formattedPercent(getValue()) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['change7d']
				},
				size: 140
			}),
			columnHelper.accessor((row) => row.dexs?.totalAllTime, {
				id: 'dex_cumulative_volume',
				header: 'Spot Cumulative Volume',
				cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
				sortUndefined: 'last',
				sortingFn: 'alphanumericFalsyLast' as any,
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['cumulative']
				},
				size: 200
			})
		],
		meta: {
			headerHelperText: definitions.dexs.common
		}
	})
]
const defaultColumns = JSON.stringify({
	name: true,
	category: true,
	tvl: true,
	change_1d: true,
	change_7d: true,
	change_1m: true,
	fees_24h: true,
	revenue_24h: true
})

export const ProtocolTvlCell = ({ rowValues }) => {
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')

	let text = null

	if (rowValues.strikeTvl) {
		if (!extraTvlsEnabled['doublecounted']) {
			text =
				'This protocol deposits into another protocol and is subtracted from total TVL because "Double Count" toggle is off'
		}

		if (!extraTvlsEnabled['liquidstaking']) {
			text =
				'This protocol is under Liquid Staking category and is subtracted from total TVL because "Liquid Staking" toggle is off'
		}

		if (!extraTvlsEnabled['doublecounted'] && !extraTvlsEnabled['liquidstaking']) {
			text =
				'This protocol deposits into another protocol or is under Liquid Staking category, so it is subtracted from total TVL because both "Liquid Staking" and "Double Count" toggles are off'
		}

		const whiteLabeledVaultProviders = ['Veda']
		if (whiteLabeledVaultProviders.includes(rowValues.name)) {
			text =
				'This protocol issues white-labeled vaults which may result in TVL being counted by another protocol (e.g., double counted).'
		}

		if (removedCategoriesFromChainTvlSet.has(rowValues.category)) {
			text = `${rowValues.category} protocols are not counted into Chain TVL`
		}

		if (text && rowValues.childProtocols) {
			text = 'Some sub-protocols are excluded from chain tvl'
		}
	}

	return (
		<span className="flex items-center justify-end gap-1">
			{text ? <QuestionHelper text={text} /> : null}
			{rowValues.tvl.excludeParent && rowValues.childProtocols ? (
				<QuestionHelper
					text={"There's some internal doublecounting that is excluded from parent TVL, so sum won't match"}
				/>
			) : null}
			<span className={rowValues.strikeTvl ? 'text-(--text-disabled)' : ''}>
				{formattedNum(rowValues.tvl.default.tvl, true)}
			</span>
		</span>
	)
}
