import * as React from 'react'
import {
	useReactTable,
	SortingState,
	getCoreRowModel,
	getSortedRowModel,
	ExpandedState,
	getExpandedRowModel,
	ColumnDef,
	getFilteredRowModel,
	ColumnFiltersState
} from '@tanstack/react-table'
import { VirtualTable } from '~/components/Table/Table'
import useWindowSize from '~/hooks/useWindowSize'
import { DEFI_CHAINS_SETTINGS, subscribeToLocalStorage, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { formatColumnOrder } from '~/components/Table/utils'
import { chainIconUrl, formattedNum, formattedPercent, slug } from '~/utils'
import { Tooltip } from '~/components/Tooltip'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
import { IFormattedDataWithExtraTvl } from '~/hooks/data/defi'

const optionsKey = 'chains-overview-table-columns'

export function ChainsByCategoryTable({ data }: { data: Array<IFormattedDataWithExtraTvl> }) {
	const columnsInStorage = React.useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(optionsKey) ?? defaultColumns,
		() => defaultColumns
	)

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([])
	const [expanded, setExpanded] = React.useState<ExpandedState>({})
	const windowSize = useWindowSize()

	const instance = useReactTable({
		data,
		columns: columns,
		state: {
			sorting,
			expanded,
			columnFilters,
			columnVisibility: JSON.parse(columnsInStorage)
		},
		onExpandedChange: setExpanded,
		getSubRows: (row: IFormattedDataWithExtraTvl) => row.subRows,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = React.useState('')

	React.useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			columns.setFilterValue(projectName)
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	React.useEffect(() => {
		const defaultOrder = instance.getAllLeafColumns().map((d) => d.id)

		const order = windowSize.width
			? chainsTableColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder
			: defaultOrder

		instance.setColumnOrder(order)
	}, [windowSize, instance])

	const clearAllColumns = () => {
		const ops = JSON.stringify(Object.fromEntries(columnOptions.map((option) => [option.key, false])))
		window.localStorage.setItem(optionsKey, ops)
		window.dispatchEvent(new Event('storage'))
	}
	const toggleAllColumns = () => {
		const ops = JSON.stringify(Object.fromEntries(columnOptions.map((option) => [option.key, true])))
		window.localStorage.setItem(optionsKey, ops)
		window.dispatchEvent(new Event('storage'))
	}

	const addColumn = (newOptions) => {
		const ops = Object.fromEntries(columnOptions.map((col) => [col.key, newOptions.includes(col.key) ? true : false]))
		window.localStorage.setItem(optionsKey, JSON.stringify(ops))
		window.dispatchEvent(new Event('storage'))
	}

	const addOnlyOneColumn = (newOption) => {
		const ops = Object.fromEntries(
			instance.getAllLeafColumns().map((col) => [col.id, col.id === newOption ? true : false])
		)
		window.localStorage.setItem(optionsKey, JSON.stringify(ops))
		window.dispatchEvent(new Event('storage'))
	}

	const selectedColumns = instance
		.getAllLeafColumns()
		.filter((col) => col.getIsVisible())
		.map((col) => col.id)

	const [groupTvls, updater] = useLocalStorageSettingsManager('tvl_chains')

	const clearAllAggrOptions = () => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (selectedAggregateTypes.includes(item.key)) {
				updater(item.key)
			}
		})
	}

	const toggleAllAggrOptions = () => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (!selectedAggregateTypes.includes(item.key)) {
				updater(item.key)
			}
		})
	}

	const addAggrOption = (selectedKeys) => {
		for (const item in groupTvls) {
			// toggle on
			if (!groupTvls[item] && selectedKeys.includes(item)) {
				updater(item)
			}

			// toggle off
			if (groupTvls[item] && !selectedKeys.includes(item)) {
				updater(item)
			}
		}
	}

	const addOnlyOneAggrOption = (newOption) => {
		DEFI_CHAINS_SETTINGS.forEach((item) => {
			if (item.key === newOption) {
				if (!selectedAggregateTypes.includes(item.key)) {
					updater(item.key)
				}
			} else {
				if (selectedAggregateTypes.includes(item.key)) {
					updater(item.key)
				}
			}
		})
	}

	const selectedAggregateTypes = React.useMemo(() => {
		return DEFI_CHAINS_SETTINGS.filter((key) => groupTvls[key.key]).map((option) => option.key)
	}, [groupTvls])

	return (
		<div className="bg-(--cards-bg) rounded-md isolate border border-[#e6e6e6] dark:border-[#222324]">
			<div className="flex items-center justify-end flex-wrap gap-2 p-2">
				<div className="relative w-full sm:max-w-[280px] mr-auto">
					<Icon
						name="search"
						height={16}
						width={16}
						className="absolute text-(--text3) top-0 bottom-0 my-auto left-2"
					/>
					<input
						value={projectName}
						onChange={(e) => {
							setProjectName(e.target.value)
						}}
						placeholder="Search..."
						className="border border-(--form-control-border) w-full pl-7 pr-2 py-[6px] bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
					/>
				</div>
				<SelectWithCombobox
					allValues={DEFI_CHAINS_SETTINGS}
					selectedValues={selectedAggregateTypes}
					setSelectedValues={addAggrOption}
					selectOnlyOne={addOnlyOneAggrOption}
					toggleAll={toggleAllAggrOptions}
					clearAll={clearAllAggrOptions}
					nestedMenu={false}
					label={'Group Chains'}
					labelType="smol"
					triggerProps={{
						className:
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>
				<SelectWithCombobox
					allValues={columnOptions}
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
							'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-[#666] dark:text-[#919296] hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
					}}
				/>

				<TVLRange variant="third" />
			</div>
			<VirtualTable instance={instance} />
		</div>
	)
}

// key: min width of window/screen
// values: table columns order
const chainsTableColumnOrders = formatColumnOrder({
	0: [
		'name',
		'tvl',
		'chainAssets',
		'change_7d',
		'protocols',
		'users',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	],
	400: [
		'name',
		'change_7d',
		'tvl',
		'chainAssets',
		'protocols',
		'users',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	],
	600: [
		'name',
		'protocols',
		'users',
		'change_7d',
		'tvl',
		'chainAssets',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	],
	900: [
		'name',
		'protocols',
		'users',
		'change_1d',
		'change_7d',
		'change_1m',
		'tvl',
		'chainAssets',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'mcaptvl'
	]
})

const columns: ColumnDef<IFormattedDataWithExtraTvl>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: true,
		cell: ({ getValue, row, table }) => {
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span
					className="flex items-center gap-2 relative"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
					{row.subRows?.length > 0 && (
						<button
							className="absolute -left-[2px]"
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
					)}
					<span className="shrink-0">{index + 1}</span>
					<TokenLogo logo={chainIconUrl(getValue())} />
					<BasicLink
						href={`/chain/${slug(getValue() as string)}`}
						className="text-sm font-medium text-(--link-text) overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
					>
						{getValue() as string | null}
					</BasicLink>
				</span>
			)
		},
		size: 200
	},
	{
		header: 'Protocols',
		accessorKey: 'protocols',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Active Addresses',
		accessorKey: 'users',
		cell: (info) => <>{info.getValue() === 0 || formattedNum(info.getValue())}</>,
		size: 180,
		meta: {
			align: 'end',
			headerHelperText: 'Active addresses in the last 24h'
		}
	},
	{
		header: '1d Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '7d Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: '1m Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'DeFi TVL',
		accessorKey: 'tvl',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Bridged TVL',
		accessorKey: 'chainAssets',
		accessorFn: (row) => row.chainAssets?.total ?? undefined,
		cell: ({ row }) => {
			const chainAssets: any = row.original.chainAssets
			if (!chainAssets?.total) return null

			const chainAssetsBreakdown = (
				<div className="w-52 flex flex-col gap-1">
					{chainAssets.native ? (
						<div className="flex items-center gap-1 justify-between">
							<span>Native:</span>
							<span>{formattedNum(+chainAssets.native, true)}</span>
						</div>
					) : null}
					{chainAssets.canonical ? (
						<div className="flex items-center gap-1 justify-between">
							<span>Canonical:</span>
							<span>{formattedNum(+chainAssets.canonical, true)}</span>
						</div>
					) : null}
					{chainAssets.ownTokens ? (
						<div className="flex items-center gap-1 justify-between">
							<span>Own Tokens:</span>
							<span>{formattedNum(+chainAssets.ownTokens, true)}</span>
						</div>
					) : null}
					{chainAssets.thirdParty ? (
						<div className="flex items-center gap-1 justify-between">
							<span>Third Party:</span>
							<span>{formattedNum(+chainAssets.thirdParty, true)}</span>
						</div>
					) : null}
				</div>
			)

			return (
				<Tooltip content={chainAssetsBreakdown} className="justify-end">
					{formattedNum(+chainAssets.total, true)}
				</Tooltip>
			)
		},
		sortUndefined: 'last',
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'Stables',
		accessorKey: 'stablesMcap',
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	},
	{
		header: '24h DEXs Volume',
		accessorKey: 'totalVolume24h',
		enableSorting: true,
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 152,
		meta: {
			align: 'end',
			headerHelperText: 'Sum of volume of all DEXs on the chain. Updated daily at 00:00UTC'
		}
	},
	{
		header: `24h Chain Fees`,
		accessorKey: 'totalFees24h',
		enableSorting: true,
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 140,
		meta: {
			align: 'end'
		}
	},
	{
		header: `24h App Revenue`,
		accessorKey: 'totalAppRevenue24h',
		enableSorting: true,
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 180,
		meta: {
			align: 'end',
			headerHelperText: 'Sum of revenue of all protocols on the chain. Updated daily at 00:00UTC'
		}
	},
	{
		header: 'Mcap / DeFi TVL',
		accessorKey: 'mcaptvl',
		cell: (info) => {
			return <>{(info.getValue() ?? null) as string | null}</>
		},
		size: 148,
		meta: {
			align: 'end'
		}
	},
	{
		header: 'NFT Volume',
		accessorKey: 'nftVolume',
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 120,
		meta: {
			align: 'end'
		}
	}
]

const columnOptions = columns.map((c: any) => ({ name: c.header, key: c.accessorKey }))

const defaultColumns = JSON.stringify(Object.fromEntries(columnOptions.map((c) => [c.key, true])))
