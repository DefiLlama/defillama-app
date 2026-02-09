import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import * as React from 'react'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { TagGroup } from '~/components/TagGroup'
import { getStorageItem, setStorageItem, subscribeToStorageKey } from '~/contexts/localStorageStore'
import { useSortColumnSizesAndOrders, useTableSearch } from '../../utils'
import { columnOrders, columnSizes, protocolAddlColumns, protocolsByChainColumns, protocolsColumns } from './columns'
import { IProtocolRow } from './types'

export enum TABLE_CATEGORIES {
	FEES = 'Fees',
	REVENUE = 'Revenue',
	VOLUME = 'Volume',
	TVL = 'TVL'
}

export enum TABLE_PERIODS {
	ONE_DAY = '1d',
	SEVEN_DAYS = '7d',
	ONE_MONTH = '1m'
}

export const TABLE_CATEGORIES_VALUES = Object.values(TABLE_CATEGORIES) as Array<string>
export const TABLE_PERIODS_VALUES = Object.values(TABLE_PERIODS) as Array<string>

export const protocolsByChainTableColumns = [
	{ name: 'Name', key: 'name' },
	{ name: 'Category', key: 'category' },
	{ name: 'Oracles', key: 'oracles' },
	{ name: 'Chains', key: 'chains' },
	{ name: 'TVL', key: 'tvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'TVL 1d change', key: 'change_1d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'TVL 7d change', key: 'change_7d', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'TVL 1m change', key: 'change_1m', category: TABLE_CATEGORIES.TVL, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Market Cap', key: 'mcap', category: TABLE_CATEGORIES.TVL },
	{ name: 'Mcap/TVL', key: 'mcaptvl', category: TABLE_CATEGORIES.TVL },
	{ name: 'Fees 24h', key: 'fees_24h', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Fees 7d', key: 'fees_7d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Fees 30d', key: 'fees_30d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Fees 1y', key: 'fees_1y', category: TABLE_CATEGORIES.FEES },
	{
		name: 'Monthly Avg 1Y Fees',
		key: 'average_1y',
		category: TABLE_CATEGORIES.FEES
	},
	{ name: 'Fees Change 1d', key: 'feesChange_1d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Fees Change 7d', key: 'feesChange_7d', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Fees Change 1m', key: 'feesChange_1m', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Fees Change 7d (vs prev 7d)',
		key: 'feesChange_7dover7d',
		category: TABLE_CATEGORIES.FEES,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Fees Change 30d',
		key: 'feesChange_30dover30d',
		category: TABLE_CATEGORIES.FEES,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Revenue 24h', key: 'revenue_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Revenue 7d', key: 'revenue_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Revenue 30d', key: 'revenue_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{ name: 'Revenue 1y', key: 'revenue_1y', category: TABLE_CATEGORIES.REVENUE },
	{
		name: 'Monthly Avg 1Y Rev',
		key: 'average_revenue_1y',
		category: TABLE_CATEGORIES.REVENUE
	},
	{
		name: 'Revenue Change 1d',
		key: 'revenueChange_1d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Revenue Change 7d',
		key: 'revenueChange_7d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Revenue Change 1m',
		key: 'revenueChange_1m',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Revenue Change 7d (vs prev 7d)',
		key: 'revenueChange_7dover7d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Revenue Change 30d',
		key: 'revenueChange_30dover30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'User Fees 24h', key: 'userFees_24h', category: TABLE_CATEGORIES.FEES, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Cumulative Fees', key: 'cumulativeFees', category: TABLE_CATEGORIES.FEES },
	{
		name: 'Holders Revenue 24h',
		key: 'holderRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Holders Revenue 30d',
		key: 'holdersRevenue30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Treasury Revenue 24h',
		key: 'treasuryRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Supply Side Revenue 24h',
		key: 'supplySideRevenue_24h',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{ name: 'P/S', key: 'ps', category: TABLE_CATEGORIES.REVENUE },
	{ name: 'P/F', key: 'pf', category: TABLE_CATEGORIES.FEES },
	{ name: 'Earnings 24h', key: 'earnings_24h', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_DAY },
	{
		name: 'Earnings Change 1d',
		key: 'earningsChange_1d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_DAY
	},
	{ name: 'Earnings 7d', key: 'earnings_7d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.SEVEN_DAYS },
	{
		name: 'Earnings Change 7d',
		key: 'earningsChange_7d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{ name: 'Earnings 30d', key: 'earnings_30d', category: TABLE_CATEGORIES.REVENUE, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Earnings Change 1m',
		key: 'earningsChange_1m',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Earnings 1y', key: 'earnings_1y', category: TABLE_CATEGORIES.REVENUE },
	{ name: 'Spot Volume 24h', key: 'volume_24h', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.ONE_DAY },
	{ name: 'Spot Volume 7d', key: 'volume_7d', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.SEVEN_DAYS },
	{ name: 'Spot Volume 30d', key: 'volume_30d', category: TABLE_CATEGORIES.VOLUME, period: TABLE_PERIODS.ONE_MONTH },
	{
		name: 'Spot Volume Change 1d',
		key: 'volumeChange_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Spot Volume Change 7d',
		key: 'volumeChange_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Spot Volume Change 1m',
		key: 'volumeChange_1m',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Spot Cumulative Volume', key: 'cumulativeVolume', category: TABLE_CATEGORIES.VOLUME },
	{ name: 'Spot Volume % Share 24h', key: 'volumeDominance_24h', category: TABLE_CATEGORIES.VOLUME },
	{ name: 'Spot Volume % Share 7d', key: 'volumeMarketShare7d', category: TABLE_CATEGORIES.VOLUME },
	{
		name: 'DEX Agg Volume 24h',
		key: 'aggregators_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'DEX Agg Volume Change 1d',
		key: 'aggregators_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'DEX Agg Volume 7d',
		key: 'aggregators_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'DEX Agg Volume Change 7d',
		key: 'aggregators_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'DEX Agg Volume 30d',
		key: 'aggregators_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'DEX Agg Volume % 24h',
		key: 'aggregators_volume_dominance_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'DEX Agg Volume % 7d',
		key: 'aggregators_volume_marketShare7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Bridge Agg Volume 24h',
		key: 'bridge_aggregators_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Bridge Agg Volume Change 1d',
		key: 'bridge_aggregators_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Bridge Agg Volume 7d',
		key: 'bridge_aggregators_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Bridge Agg Volume Change 7d',
		key: 'bridge_aggregators_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Bridge Agg Volume 30d',
		key: 'bridge_aggregators_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Bridge Agg Volume % 24h',
		key: 'bridge_aggregators_volume_dominance_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Options Volume 24h',
		key: 'options_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Options Volume Change 1d',
		key: 'options_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Options Volume 7d',
		key: 'options_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Options Volume Change 7d',
		key: 'options_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Options Volume 30d',
		key: 'options_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Options Volume % 24h',
		key: 'options_volume_dominance_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Perp Volume 24h',
		key: 'perps_volume_24h',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Perp Volume 7d',
		key: 'perps_volume_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Perp Volume 30d',
		key: 'perps_volume_30d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{
		name: 'Perp Volume Change 1d',
		key: 'perps_volume_change_1d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_DAY
	},
	{
		name: 'Perp Volume Change 7d',
		key: 'perps_volume_change_7d',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.SEVEN_DAYS
	},
	{
		name: 'Perp Volume Change 1m',
		key: 'perps_volume_change_1m',
		category: TABLE_CATEGORIES.VOLUME,
		period: TABLE_PERIODS.ONE_MONTH
	},
	{ name: 'Perp Volume % Share 24h', key: 'perps_volume_dominance_24h', category: TABLE_CATEGORIES.VOLUME },
	{ name: 'Open Interest', key: 'openInterest', category: TABLE_CATEGORIES.VOLUME },
	{
		name: 'Holders Revenue 30d Change',
		key: 'holdersRevenueChange_30dover30d',
		category: TABLE_CATEGORIES.REVENUE,
		period: TABLE_PERIODS.ONE_MONTH
	}
]

export const defaultColumns = JSON.stringify({
	name: true,
	category: true,
	oracles: false,
	chains: false,
	tvl: true,
	change_1d: true,
	change_7d: true,
	change_1m: true,
	mcap: false,
	mcaptvl: false,
	fees_24h: true,
	revenue_24h: true,
	revenueChange_1d: false,
	revenueChange_7d: false,
	revenueChange_1m: false,
	feesChange_7dover7d: false,
	feesChange_30dover30d: false,
	revenueChange_7dover7d: false,
	revenueChange_30dover30d: false,
	fees_7d: false,
	revenue_7d: false,
	fees_30d: false,
	revenue_30d: false,
	holdersRevenue30d: false,
	fees_1y: false,
	average_1y: false,
	revenue_1y: false,
	average_revenue_1y: false,
	feesChange_1d: false,
	feesChange_7d: false,
	feesChange_1m: false,
	userFees_24h: false,
	cumulativeFees: false,
	holderRevenue_24h: false,
	treasuryRevenue_24h: false,
	supplySideRevenue_24h: false,
	pf: false,
	ps: false,
	earnings_24h: false,
	earningsChange_1d: false,
	earnings_7d: false,
	earningsChange_7d: false,
	earnings_30d: false,
	earningsChange_1m: false,
	earnings_1y: false,
	volume_24h: true,
	volume_7d: false,
	volume_30d: false,
	volumeChange_1d: false,
	volumeChange_7d: false,
	volumeChange_1m: false,
	cumulativeVolume: false,
	volumeDominance_24h: false,
	volumeMarketShare7d: false,
	perps_volume_24h: false,
	perps_volume_7d: false,
	perps_volume_30d: false,
	perps_volume_change_1d: false,
	perps_volume_change_7d: false,
	perps_volume_change_1m: false,
	perps_volume_dominance_24h: false,
	aggregators_volume_24h: false,
	aggregators_volume_change_1d: false,
	aggregators_volume_7d: false,
	aggregators_volume_change_7d: false,
	aggregators_volume_30d: false,
	aggregators_volume_dominance_24h: false,
	aggregators_volume_marketShare7d: false,
	bridge_aggregators_volume_24h: false,
	bridge_aggregators_volume_change_1d: false,
	bridge_aggregators_volume_7d: false,
	bridge_aggregators_volume_change_7d: false,
	bridge_aggregators_volume_30d: false,
	bridge_aggregators_volume_dominance_24h: false,
	options_volume_24h: false,
	options_volume_change_1d: false,
	options_volume_7d: false,
	options_volume_change_7d: false,
	options_volume_30d: false,
	options_volume_dominance_24h: false,
	openInterest: false,
	holdersRevenueChange_30dover30d: false
})

const optionsKey = 'protocolsTableColumns'

const setColumnOptions = (newOptions: string[]) => {
	const ops = Object.fromEntries(protocolsByChainTableColumns.map((col) => [col.key, newOptions.includes(col.key)]))
	setStorageItem(optionsKey, JSON.stringify(ops))
}

const toggleAllOptions = () => {
	setColumnOptions(protocolsByChainTableColumns.map((col) => col.key))
}

const ProtocolsTable = ({
	data,
	columnsInStorage,
	useStickyHeader = true
}: {
	data: Array<IProtocolRow>
	columnsInStorage: string
	useStickyHeader?: boolean
}) => {
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'tvl' }])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [expanded, setExpanded] = React.useState<ExpandedState>({})

	const instance = useReactTable({
		data,
		columns: protocolsByChainColumns,
		state: {
			sorting,
			expanded,
			columnSizing,
			columnVisibility: JSON.parse(columnsInStorage)
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: IProtocolRow) => row.subRows,
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

	return (
		<>
			<VirtualTable instance={instance} useStickyHeader={useStickyHeader} />
		</>
	)
}

export function ProtocolsByChainTable({
	data,
	useStickyHeader = true
}: {
	data: Array<IProtocolRow>
	useStickyHeader?: boolean
}) {
	const columnsInStorage = React.useSyncExternalStore(
		(callback) => subscribeToStorageKey(optionsKey, callback),
		() => getStorageItem(optionsKey, defaultColumns) ?? defaultColumns,
		() => defaultColumns
	)

	const [filterState, setFilterState] = React.useState(null)

	const setFilter = (key) => (newState) => {
		const newOptions = Object.fromEntries(
			protocolsByChainTableColumns.map((column) => [
				[column.key],
				['name', 'category'].includes(column.key) ? true : column[key] === newState
			])
		)

		if (columnsInStorage === JSON.stringify(newOptions)) {
			toggleAllOptions()
			setFilterState(null)
		} else {
			setStorageItem(optionsKey, JSON.stringify(newOptions))
			setFilterState(newState)
		}
	}

	const selectedOptions = React.useMemo(() => {
		const storage = JSON.parse(columnsInStorage)
		return protocolsByChainTableColumns.flatMap((c) => (storage[c.key] ? [c.key] : []))
	}, [columnsInStorage])

	return (
		<div className="rounded-md bg-(--cards-bg)">
			<div className="flex flex-wrap items-center justify-between gap-2 p-3">
				<h3 className="mr-auto text-lg font-medium">Protocol Rankings</h3>
				<TagGroup setValue={setFilter('category')} selectedValue={filterState} values={TABLE_CATEGORIES_VALUES} />
				<TagGroup setValue={setFilter('period')} selectedValue={filterState} values={TABLE_PERIODS_VALUES} />
				<SelectWithCombobox
					allValues={protocolsByChainTableColumns}
					selectedValues={selectedOptions}
					setSelectedValues={setColumnOptions}
					nestedMenu={false}
					label={'Columns'}
					labelType="smol"
					variant="filter"
				/>
				<TVLRange />
			</div>
			<ProtocolsTable data={data} columnsInStorage={columnsInStorage} useStickyHeader={useStickyHeader} />
		</div>
	)
}

export function ProtocolsTableWithSearch({
	data,
	addlColumns,
	removeColumns,
	columns
}: {
	data: Array<IProtocolRow>
	addlColumns?: Array<string>
	removeColumns?: Array<string>
	columns?: ColumnDef<any>[]
}) {
	const columnsToUse = columns ?? protocolsColumns
	const [sorting, setSorting] = React.useState<SortingState>([{ desc: true, id: 'tvl' }])
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([])
	const [columnSizing, setColumnSizing] = React.useState<ColumnSizingState>({})
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])

	const [expanded, setExpanded] = React.useState<ExpandedState>({})

	const columnsData = React.useMemo(() => {
		if (!addlColumns && !removeColumns) return columnsToUse
		const removeColumnsSet = removeColumns ? new Set(removeColumns) : null
		return [
			...(columnsToUse as any).filter((c) => !removeColumnsSet || !removeColumnsSet.has((c as any).accessorKey)),
			...(addlColumns ?? []).map((x) => protocolAddlColumns[x])
		]
	}, [addlColumns, removeColumns, columnsToUse])

	const instance = useReactTable({
		data,
		columns: columnsData,
		state: {
			sorting,
			expanded,
			columnOrder,
			columnSizing,
			columnFilters
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		filterFromLeafRows: true,
		onExpandedChange: setExpanded,
		getSubRows: (row: IProtocolRow) => row.subRows,
		onSortingChange: setSorting,
		onColumnOrderChange: setColumnOrder,
		onColumnSizingChange: setColumnSizing,
		onColumnFiltersChange: setColumnFilters,
		getFilteredRowModel: getFilteredRowModel(),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({
		instance,
		columnSizes,
		columnOrders
	})

	return (
		<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex items-center justify-between gap-4 p-3">
				<h1 className="mr-auto text-lg font-semibold">Protocol Rankings</h1>
				<div className="relative ml-auto w-full sm:max-w-[280px]">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search protocols..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
					/>
				</div>
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}
