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
import { useRouter } from 'next/router'
import { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Bookmark } from '~/components/Bookmark'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BuyOnLlamaswap } from '~/components/BuyOnLlamaswap'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { PercentChange } from '~/components/PercentChange'
import { QuestionHelper } from '~/components/QuestionHelper'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv } from '~/components/Table/utils'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { getCategoryRoute, removedCategoriesFromChainTvlSet } from '~/constants'
import { applyProtocolTvlSettings } from '~/containers/Protocols/utils'
import { useCustomColumns, useLocalStorageSettingsManager, type CustomColumnDef } from '~/contexts/LocalStorage'
import { setStorageItem, useStorageItem } from '~/contexts/localStorageStore'
import { definitions } from '~/public/definitions'
import { formattedNum, slug } from '~/utils'
import { parseNumberQueryParam } from '~/utils/routerQuery'
import { formatValue } from '../../utils'
import { CustomColumnModal } from './CustomColumnModal'
import { replaceAliases, sampleProtocol } from './customColumnsUtils'
import { evaluateFormula, getSortableValue } from './formula.service'
import type { IProtocol } from './types'
import { filterProtocolsByFork, getAvailableForks } from './filterProtocolsByFork'

const EMPTY_CUSTOM_COLUMN_VALUES: Record<string, unknown> = {}

const getEarningsValue = (revenue: number | null | undefined, emissions: number | null | undefined) => {
	if (revenue != null && emissions != null) {
		return revenue - emissions
	}

	if (revenue != null) {
		return revenue
	}

	return undefined
}

type ChainProtocolsTableProps = {
	protocols: Array<IProtocol>
	sampleRow?: any
	useStickyHeader?: boolean
	borderless?: boolean
}

type TableCategory = (typeof TABLE_CATEGORIES_VALUES)[number]
type TablePeriod = (typeof TABLE_PERIODS_VALUES)[number]
type TableFilterState = TableCategory | TablePeriod
type FilterKey = 'category' | 'period'
type FilterStateByKey = {
	category: TableCategory
	period: TablePeriod
}

type ChainProtocolsTableInnerProps = ChainProtocolsTableProps & {
	filterState: TableFilterState | null
}

export const ChainProtocolsTable = (props: ChainProtocolsTableProps) => {
	const rawFilterState = useStorageItem(tableFilterStateKey, null)
	const filterState = isTableFilterState(rawFilterState) ? rawFilterState : null

	return <ChainProtocolsTableInner {...props} filterState={filterState} key={`filter-state-${filterState}`} />
}

const ChainProtocolsTableInner = ({
	protocols,
	sampleRow = sampleProtocol,
	useStickyHeader = true,
	borderless = false,
	filterState
}: ChainProtocolsTableInnerProps) => {
	const { customColumns, setCustomColumns } = useCustomColumns()

	const router = useRouter()
	const [extraTvlsEnabled] = useLocalStorageSettingsManager('tvl')
	const minTvl = parseNumberQueryParam(router.query.minTvl)
	const maxTvl = parseNumberQueryParam(router.query.maxTvl)

	const finalProtocols = useMemo(() => {
		return applyProtocolTvlSettings({ protocols, extraTvlsEnabled, minTvl, maxTvl })
	}, [protocols, extraTvlsEnabled, minTvl, maxTvl])

	// Fork filter — reads selection from URL (?fork=...), filters table data, exposes available forks for the dropdown.
	// Defer the URL read until after the first client render so SSR and initial CSR HTML match (page is statically generated, so query params aren't in the SSR HTML).
	const [hasMountedForFork, setHasMountedForFork] = useState(false)
	useEffect(() => {
		setHasMountedForFork(true)
	}, [])
	const forkParam = hasMountedForFork
		? (() => {
				const q = router.query.fork
				if (typeof q === 'string') return q || null
				if (Array.isArray(q)) return q[0] ?? null
				return null
			})()
		: null

	const availableForks = useMemo(() => getAvailableForks(finalProtocols), [finalProtocols])

	const protocolsForTable = useMemo(
		() => filterProtocolsByFork(finalProtocols, forkParam),
		[finalProtocols, forkParam]
	)

	const handleForkChange = (next: string | null) => {
		const nextQuery = { ...router.query }
		if (next) {
			nextQuery.fork = next
		} else {
			delete nextQuery.fork
		}
		router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
			shallow: true,
			scroll: false
		})
	}

	const rawColumnsInStorage = useStorageItem(tableColumnOptionsKey, defaultColumns)
	const columnsInStorage = useDeferredValue(rawColumnsInStorage)

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
			for (const key of allKeys) {
				if (key === newColumnKey) {
					ops[key] = true
				} else if (!(key in ops)) {
					ops[key] = false
				}
			}
			setStorageItem(tableColumnOptionsKey, JSON.stringify(ops))
			if (instance && instance.setColumnVisibility) {
				instance.setColumnVisibility(ops)
			}
		}
	}

	const { mergedColumns, columnVisibility, selectedColumns } = useMemo(() => {
		const mergedColumns = [
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
		const defaultColumnVisibility = Object.fromEntries(mergedColumns.map((col) => [col.key, true] as const))

		let parsedColumnVisibility: Record<string, boolean> = {}
		try {
			parsedColumnVisibility = JSON.parse(columnsInStorage) as Record<string, boolean>
		} catch {}

		const columnVisibility = { ...defaultColumnVisibility, ...parsedColumnVisibility }
		const selectedColumns = mergedColumns.flatMap((column) => (columnVisibility[column.key] ? [column.key] : []))

		return { mergedColumns, columnVisibility, selectedColumns }
	}, [customColumns, columnsInStorage])

	const setColumnOptions = (newColumns: string[]) => {
		const allKeys = mergedColumns.map((col) => col.key)
		const ops = Object.fromEntries(allKeys.map((key) => [key, newColumns.includes(key)]))
		setStorageItem(tableColumnOptionsKey, JSON.stringify(ops))

		if (instance && instance.setColumnVisibility) {
			instance.setColumnVisibility(ops)
		}
	}

	const toggleAllColumns = () => {
		setColumnOptions(mergedColumns.map((col) => col.key))
	}

	const [sorting, setSorting] = useState<SortingState>([
		{ desc: true, id: MAIN_COLUMN_BY_CATEGORY[filterState] ?? 'tvl' }
	])
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [expanded, setExpanded] = useState<ExpandedState>({})
	const sortingRef = useRef(sorting)
	sortingRef.current = sorting

	const allColumns = useMemo<ColumnDef<IProtocol>[]>(() => {
		const customColumnDefs = customColumns.map((col, idx) => {
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
					sortingFn: (rowA, rowB, sortColumnId) => {
						const usedFormat = col.determinedFormat || col.formatType
						const sortEntry = sortingRef.current.find((s) => s.id === sortColumnId)
						const desc = sortEntry?.desc ?? true

						let a = rowA.getValue(sortColumnId)
						let b = rowB.getValue(sortColumnId)

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
					size: 140,
					meta: { align: 'end', headerHelperText: col.formula }
				}
			)
		})

		if (customColumnDefs.length === 0) {
			return columns
		}

		return [
			...columns,
			{
				id: 'custom_columns',
				header: 'Custom Columns',
				columns: customColumnDefs
			}
		]
	}, [customColumns])

	const instance = useReactTable({
		data: protocolsForTable,
		columns: allColumns,
		state: {
			sorting,
			expanded,
			columnSizing,
			columnVisibility
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		filterFromLeafRows: true,
		onExpandedChange: (updater) => startTransition(() => setExpanded(updater)),
		getSubRows: (row: IProtocol) => row.childProtocols,
		onSortingChange: (updater) => startTransition(() => setSorting(updater)),
		onColumnSizingChange: (updater) => startTransition(() => setColumnSizing(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const selectedCategory = isTableCategory(filterState) ? filterState : null
	const selectedPeriod = isTablePeriod(filterState) ? filterState : null

	const setFilter =
		<K extends FilterKey>(key: K) =>
		(newState: FilterStateByKey[K]) => {
			const newColumns = Object.fromEntries(
				columnOptions.map((column) => [
					column.key,
					['name', 'category'].includes(column.key) ? true : column[key] === newState
				])
			)

			if (columnsInStorage === JSON.stringify(newColumns)) {
				toggleAllColumns()
				setStorageItem(tableFilterStateKey, 'null')
				instance.setSorting([{ id: 'tvl', desc: true }])
				// window.dispatchEvent(new Event('storage'))
			} else {
				setStorageItem(tableColumnOptionsKey, JSON.stringify(newColumns))
				setStorageItem(tableFilterStateKey, newState)
				instance.setSorting([{ id: isTableCategory(newState) ? MAIN_COLUMN_BY_CATEGORY[newState] : 'tvl', desc: true }])
				// window.dispatchEvent(new Event('storage'))
			}
		}
	const chainQuery = router.query.chain
	const activeChain = Array.isArray(chainQuery) ? chainQuery[0] : chainQuery

	return (
		<div className={borderless ? 'isolate' : 'isolate rounded-md border border-(--cards-border) bg-(--cards-bg)'}>
			<div className="flex flex-wrap items-center justify-end gap-2 p-3">
				{borderless ? null : (
					<h2 className="mr-auto flex w-full grow text-lg font-semibold md:w-auto">Protocol Rankings</h2>
				)}

				<TagGroup
					setValue={setFilter('category')}
					selectedValue={selectedCategory}
					values={TABLE_CATEGORIES_VALUES}
					variant="responsive"
				/>
				<TagGroup
					setValue={setFilter('period')}
					selectedValue={selectedPeriod}
					values={TABLE_PERIODS_VALUES}
					variant="responsive"
				/>

				{availableForks.length > 0 && (
					<SelectWithCombobox
						allValues={availableForks}
						selectedValues={forkParam ? [forkParam] : []}
						setSelectedValues={(updater) => {
							const next = typeof updater === 'function' ? updater(forkParam ? [forkParam] : []) : updater
							const lastValue = next[next.length - 1] ?? null
							handleForkChange(lastValue)
						}}
						singleSelect
						nestedMenu={false}
						label="Forked from"
						labelType="smol"
						variant="filter"
					/>
				)}
				<SelectWithCombobox
					allValues={mergedColumns}
					selectedValues={selectedColumns}
					setSelectedValues={setColumnOptions}
					nestedMenu={false}
					label={'Columns'}
					labelType="smol"
					variant="filter"
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
				<CSVDownloadButton
					prepareCsv={() => prepareTableCsv({ instance, filename: `defillama-${activeChain ?? 'all'}-protocols` })}
					smol
				/>
			</div>
			<VirtualTable instance={instance} useStickyHeader={useStickyHeader} />
			<CustomColumnModal
				dialogStore={customColumnDialogStore}
				onSave={handleSaveCustomColumn}
				sampleRow={sampleRow}
				key={`custom-index-${customColumnModalEditIndex}`}
				{...(customColumnModalInitialValues ?? EMPTY_CUSTOM_COLUMN_VALUES)}
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

const TABLE_CATEGORIES_VALUES = [
	TABLE_CATEGORIES.FEES,
	TABLE_CATEGORIES.REVENUE,
	TABLE_CATEGORIES.VOLUME,
	TABLE_CATEGORIES.TVL
] as const
const TABLE_PERIODS_VALUES = [TABLE_PERIODS.ONE_DAY, TABLE_PERIODS.SEVEN_DAYS, TABLE_PERIODS.ONE_MONTH] as const

function isTableCategory(value: string | null): value is TableCategory {
	return value != null && (TABLE_CATEGORIES_VALUES as readonly string[]).includes(value)
}

function isTablePeriod(value: string | null): value is TablePeriod {
	return value != null && (TABLE_PERIODS_VALUES as readonly string[]).includes(value)
}

function isTableFilterState(value: string | null): value is TableFilterState {
	return isTableCategory(value) || isTablePeriod(value)
}

const columnOptions = [
	{ name: 'Name', key: 'name' },
	{ name: 'Category', key: 'category' },
	{ name: 'TVL', key: 'tvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'TVL 1d change', key: 'change_1d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'TVL 7d change', key: 'change_7d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'TVL 1m change', key: 'change_1m', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Token Price', key: 'token_price' },
	{ name: 'Market Cap', key: 'mcap' },
	{ name: 'Mcap/TVL', key: 'mcaptvl' },
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

const ProtocolChainsComponent = ({ chains }: { chains: string[] }) => (
	<span className="flex flex-col gap-1">
		{chains.map((chain) => (
			<span key={`chain${chain}-of-protocol`} className="flex items-center gap-1">
				<TokenLogo name={chain} kind="chain" size={14} alt={`Logo of ${chain}`} />
				<span>{chain}</span>
			</span>
		))}
	</span>
)

const columns = [
	columnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()

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

					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo name={row.original.name} kind="token" data-lgonly alt={`Logo of ${row.original.name}`} />

					<span className="-my-2 flex flex-col">
						<BasicLink
							href={`/protocol/${row.original.slug}`}
							className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
						>
							{value}
						</BasicLink>

						<Tooltip
							content={<ProtocolChainsComponent chains={row.original.chains} />}
							className="text-[0.7rem] text-(--text-disabled)"
						>
							{`${row.original.chains.length} chain${row.original.chains.length > 1 ? 's' : ''}`}
						</Tooltip>
					</span>
					{value === 'SyncDEX Finance' ? (
						<Tooltip content={'Many users have reported issues with this protocol'}>
							<Icon name="alert-triangle" height={14} width={14} />
						</Tooltip>
					) : null}
				</span>
			)
		},
		size: 240
	}),
	columnHelper.accessor('category', {
		id: 'category',
		header: 'Category',
		enableSorting: false,
		cell: ({ getValue }) => {
			const category = getValue()

			if (!category) return ''

			const href = getCategoryRoute(slug(category))

			return (
				<BasicLink href={href} className="text-sm font-medium text-(--link-text)">
					{category}
				</BasicLink>
			)
		},
		size: 140,
		meta: {
			align: 'end'
		}
	}),
	columnHelper.group({
		id: 'tvl',
		header: 'TVL',
		columns: [
			columnHelper.accessor((row) => row.tvl?.default?.tvl ?? undefined, {
				id: 'tvl',
				header: 'TVL',
				cell: ({ row }) =>
					row.original.tvl ? (
						row.original.strikeTvl || row.original.tvl.excludeParent ? (
							<ProtocolTvlCell rowValues={row.original} />
						) : (
							`$${formattedNum(row.original.tvl?.default?.tvl || 0)}`
						)
					) : null,
				meta: {
					align: 'end',
					headerHelperText: 'Value of all coins held in smart contracts of the protocol'
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.tvlChange?.change1d ?? undefined, {
				id: 'change_1d',
				header: '1d Change',
				cell: ({ getValue }) => <PercentChange percent={getValue()} />,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 24 hours'
				},
				size: 110
			}),
			columnHelper.accessor((row) => row.tvlChange?.change7d ?? undefined, {
				id: 'change_7d',
				header: '7d Change',
				cell: ({ getValue }) => <PercentChange percent={getValue()} />,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 7 days'
				},
				size: 110
			}),
			columnHelper.accessor((row) => row.tvlChange?.change1m ?? undefined, {
				id: 'change_1m',
				header: '1m Change',
				cell: ({ getValue }) => <PercentChange percent={getValue()} />,
				meta: {
					align: 'end',
					headerHelperText: 'Change in TVL in the last 30 days'
				},
				size: 110
			})
		],
		meta: { headerHelperText: 'Value of all coins held in smart contracts of the protocol' }
	}),
	columnHelper.accessor((row) => row.mcap ?? undefined, {
		id: 'mcap',
		header: 'Market Cap',
		cell: ({ getValue }) => (getValue() != null ? formattedNum(getValue(), true) : null),
		meta: {
			align: 'end',
			headerHelperText: 'Current protocol token market cap'
		},
		size: 120
	}),
	columnHelper.accessor((row) => row.tokenPrice ?? undefined, {
		id: 'token_price',
		header: 'Token Price',
		cell: ({ getValue, row }) => {
			const price = getValue()
			if (price == null) return null

			return (
				<span className="flex items-center justify-end gap-2">
					{row.original.llamaswapChains?.length ? (
						<BuyOnLlamaswap chains={row.original.llamaswapChains} placement="chain_overview_table" />
					) : null}
					<span>{formattedNum(price, true)}</span>
				</span>
			)
		},
		meta: {
			align: 'end',
			headerHelperText: 'Current protocol token price'
		},
		size: 120
	}),
	columnHelper.accessor((row) => row.mcaptvl ?? undefined, {
		id: 'mcaptvl',
		header: 'Mcap/TVL',
		cell: (info) => info.getValue() ?? null,
		size: 110,
		meta: {
			align: 'end',
			headerHelperText: 'Market cap / TVL ratio'
		}
	}),
	columnHelper.group({
		id: 'fees',
		header: 'Fees & Revenue',
		columns: [
			columnHelper.accessor((row) => row.fees?.total24h ?? undefined, {
				id: 'fees_24h',
				header: 'Fees 24h',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['24h']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total24h ?? undefined, {
				id: 'revenue_24h',
				header: 'Revenue 24h',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['24h']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total24h ?? undefined, {
				id: 'holdersRevenue_24h',
				header: 'Holders Revenue 24h',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['24h']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.emissions?.total24h ?? undefined, {
				id: 'emissions_24h',
				header: 'Incentives 24h',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['24h']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total7d ?? undefined, {
				id: 'fees_7d',
				header: 'Fees 7d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['7d']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total7d ?? undefined, {
				id: 'revenue_7d',
				header: 'Revenue 7d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['7d']
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total7d ?? undefined, {
				id: 'holdersRevenue_7d',
				header: 'Holders Revenue 7d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['7d']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.emissions?.total7d ?? undefined, {
				id: 'emissions_7d',
				header: 'Incentives 7d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['7d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total30d ?? undefined, {
				id: 'fees_30d',
				header: 'Fees 30d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['30d']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.revenue?.total30d ?? undefined, {
				id: 'revenue_30d',
				header: 'Revenue 30d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['30d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total30d ?? undefined, {
				id: 'holdersRevenue_30d',
				header: 'Holders Revenue 30d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['30d']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.emissions?.total30d ?? undefined, {
				id: 'emissions_30d',
				header: 'Incentives 30d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['30d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.fees?.total1y ?? undefined, {
				id: 'fees_1y',
				header: 'Fees 1Y',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['1y']
				},
				size: 100
			}),
			columnHelper.accessor((row) => row.fees?.monthlyAverage1y ?? undefined, {
				id: 'average_fees_1y',
				header: 'Monthly Avg 1Y Fees',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['monthlyAverage1y']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.revenue?.total1y ?? undefined, {
				id: 'revenue_1y',
				header: 'Revenue 1Y',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['1y']
				},
				size: 120
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.total1y ?? undefined, {
				id: 'holdersRevenue_1y',
				header: 'Holders Revenue 1Y',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['1y']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.revenue?.monthlyAverage1y ?? undefined, {
				id: 'average_revenue_1y',
				header: 'Monthly Avg 1Y Rev',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['monthlyAverage1y']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.monthlyAverage1y ?? undefined, {
				id: 'average_holdersRevenue_1y',
				header: 'Monthly Avg 1Y Holders Revenue',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['monthlyAverage1y']
				},
				size: 260
			}),
			columnHelper.accessor((row) => row.emissions?.total1y ?? undefined, {
				id: 'emissions_1y',
				header: 'Incentives 1Y',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['1y']
				},
				size: 125
			}),
			columnHelper.accessor((row) => row.emissions?.monthlyAverage1y ?? undefined, {
				id: 'average_emissions_1y',
				header: 'Monthly Avg 1Y Incentives',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['monthlyAverage1y']
				},
				size: 220
			}),
			columnHelper.accessor((row) => row.fees?.totalAllTime ?? undefined, {
				id: 'fees_cumulative',
				header: 'Cumulative Fees',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['cumulative']
				},
				size: 150
			}),
			columnHelper.accessor((row) => row.revenue?.totalAllTime ?? undefined, {
				id: 'cumulativeRevenue',
				header: 'Cumulative Revenue',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['cumulative']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.holdersRevenue?.totalAllTime ?? undefined, {
				id: 'cumulativeHoldersRevenue',
				header: 'Cumulative Holders Revenue',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.holdersRevenue.protocol['cumulative']
				},
				size: 220
			}),
			columnHelper.accessor((row) => row.emissions?.totalAllTime ?? undefined, {
				id: 'cumulativeEmissions',
				header: 'Cumulative Incentives',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.incentives.protocol['cumulative']
				},
				size: 180
			}),
			columnHelper.accessor((row) => row.fees?.pf ?? undefined, {
				id: 'pf',
				header: 'P/F',
				cell: (info) => (info.getValue() != null ? `${info.getValue()}x` : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.fees.protocol['pf']
				},
				size: 80
			}),
			columnHelper.accessor((row) => row.revenue?.ps ?? undefined, {
				id: 'ps',
				header: 'P/S',
				cell: (info) => (info.getValue() != null ? `${info.getValue()}x` : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.revenue.protocol['ps']
				},
				size: 80
			}),
			columnHelper.accessor((row) => getEarningsValue(row.revenue?.total24h, row.emissions?.total24h), {
				id: 'earnings_24h',
				header: 'Earnings 24h',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),

				meta: {
					align: 'end',
					headerHelperText: definitions.earnings.protocol['24h']
				},
				size: 125
			}),
			columnHelper.accessor((row) => getEarningsValue(row.revenue?.total7d, row.emissions?.total7d), {
				id: 'earnings_7d',
				header: 'Earnings 7d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),

				meta: {
					align: 'end',
					headerHelperText: definitions.earnings.protocol['7d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => getEarningsValue(row.revenue?.total30d, row.emissions?.total30d), {
				id: 'earnings_30d',
				header: 'Earnings 30d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.earnings.protocol['30d']
				},
				size: 125
			}),
			columnHelper.accessor((row) => getEarningsValue(row.revenue?.total1y, row.emissions?.total1y), {
				id: 'earnings_1y',
				header: 'Earnings 1Y',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.earnings.protocol['1y']
				},
				size: 125
			}),
			columnHelper.accessor((row) => getEarningsValue(row.revenue?.monthlyAverage1y, row.emissions?.monthlyAverage1y), {
				id: 'average_earnings_1y',
				header: 'Monthly Avg 1Y Earnings',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.earnings.protocol['monthlyAverage1y']
				},
				size: 200
			}),
			columnHelper.accessor((row) => getEarningsValue(row.revenue?.totalAllTime, row.emissions?.totalAllTime), {
				id: 'cumulativeEarnings',
				header: 'Cumulative Earnings',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.earnings.protocol['cumulative']
				},
				size: 180
			})
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
			columnHelper.accessor((row) => row.dexs?.total24h ?? undefined, {
				id: 'dex_volume_24h',
				header: 'Spot Volume 24h',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['24h']
				},
				size: 150
			}),
			columnHelper.accessor((row) => row.dexs?.total7d ?? undefined, {
				id: 'dex_volume_7d',
				header: 'Spot Volume 7d',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['7d']
				},
				size: 150
			}),
			columnHelper.accessor((row) => row.dexs?.change_7dover7d ?? undefined, {
				id: 'dex_volume_change_7d',
				header: 'Spot Change 7d',
				cell: ({ getValue }) => (getValue() !== 0 ? <PercentChange percent={getValue()} /> : null),
				meta: {
					align: 'end',
					headerHelperText: definitions.dexs.protocol['change7d']
				},
				size: 140
			}),
			columnHelper.accessor((row) => row.dexs?.totalAllTime ?? undefined, {
				id: 'dex_cumulative_volume',
				header: 'Spot Cumulative Volume',
				cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
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
	mcap: true,
	token_price: true,
	fees_24h: true,
	revenue_24h: true
})

const ProtocolTvlCell = ({ rowValues }) => {
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
