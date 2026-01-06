import * as React from 'react'
import {
	ColumnDef,
	ColumnFiltersState,
	ExpandedState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { Bookmark } from '~/components/Bookmark'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { TVLRange } from '~/components/Filters/TVLRange'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { VirtualTable } from '~/components/Table/Table'
import { formatColumnOrder } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { Tooltip } from '~/components/Tooltip'
import { DEFI_CHAINS_SETTINGS, subscribeToLocalStorage, useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { IFormattedDataWithExtraTvl } from '~/hooks/data/defi'
import useWindowSize from '~/hooks/useWindowSize'
import { definitions } from '~/public/definitions'
import { chainIconUrl, formattedNum, formattedPercent, slug } from '~/utils'

const optionsKey = 'chains-overview-table-columns'

export function ChainsByCategoryTable({
	data,
	useStickyHeader = true,
	borderless = false,
	showByGroup
}: {
	data: Array<IFormattedDataWithExtraTvl>
	useStickyHeader?: boolean
	borderless?: boolean
	showByGroup: boolean
}) {
	const columnsInStorage = React.useSyncExternalStore(
		subscribeToLocalStorage,
		() => localStorage.getItem(optionsKey) ?? defaultColumns,
		() => defaultColumns
	)

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
	const [sorting, setSorting] = React.useState<SortingState>([{ id: 'tvl', desc: true }])
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
			? (chainsTableColumnOrders.find(([size]) => windowSize.width > size)?.[1] ?? defaultOrder)
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

	const prepareCsv = React.useCallback(() => {
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

				return value
			})
		})

		return { filename: `defillama-chains.csv`, rows: [headers, ...rows] as (string | number | boolean)[][] }
	}, [instance])

	return (
		<div className={`isolate ${borderless ? '' : 'rounded-md border border-(--cards-border) bg-(--cards-bg)'}`}>
			<div className="flex flex-wrap items-center justify-end gap-2 p-2">
				<label className="relative mr-auto w-full sm:max-w-[280px]">
					<span className="sr-only">Search chains</span>
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
						placeholder="Search..."
						className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black max-sm:py-0.5 dark:bg-black dark:text-white"
					/>
				</label>

				<div className="flex items-center gap-2 max-sm:w-full max-sm:flex-col">
					<div className="flex w-full items-center gap-2 sm:w-auto">
						{showByGroup ? (
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
										'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
								}}
							/>
						) : null}
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
									'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
							}}
						/>
					</div>

					<TVLRange triggerClassName="w-full sm:w-auto" />
					<CSVDownloadButton prepareCsv={prepareCsv} />
				</div>
			</div>
			<VirtualTable instance={instance} useStickyHeader={useStickyHeader} />
		</div>
	)
}

// key: min width of window/screen
// values: table columns order
const chainsTableColumnOrders = formatColumnOrder({
	0: [
		'rank',
		'name',
		'tvl',
		'chainAssets',
		'change_7d',
		'protocols',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'users',
		'mcaptvl'
	],
	400: [
		'rank',
		'name',
		'change_7d',
		'tvl',
		'chainAssets',
		'protocols',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'users',
		'mcaptvl'
	],
	600: [
		'rank',
		'name',
		'protocols',
		'tvl',
		'change_7d',
		'chainAssets',
		'change_1d',
		'change_1m',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'users',
		'mcaptvl'
	],
	900: [
		'rank',
		'name',
		'protocols',
		'tvl',
		'change_1d',
		'change_7d',
		'change_1m',
		'chainAssets',
		'stablesMcap',
		'totalVolume24h',
		'totalFees24h',
		'totalRevenue24h',
		'users',
		'mcaptvl'
	]
})

const columns: ColumnDef<IFormattedDataWithExtraTvl>[] = [
	{
		id: 'rank',
		header: 'Rank',
		accessorKey: 'rank',
		size: 60,
		enableSorting: false,
		cell: ({ row }) => {
			const index = row.index
			return <span className="font-bold">{index + 1}</span>
		},
		meta: {
			align: 'center' as const
		}
	},
	{
		header: 'Name',
		accessorKey: 'name',
		enableSorting: true,
		cell: ({ getValue, row, table }) => {
			return (
				<span
					className="relative flex items-center gap-2"
					style={{ paddingLeft: row.depth ? row.depth * 48 : row.depth === 0 ? 24 : 0 }}
				>
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
						<Bookmark readableName={getValue() as string} isChain data-bookmark className="absolute -left-0.5" />
					)}

					<TokenLogo logo={chainIconUrl(getValue())} />
					<BasicLink
						href={`/chain/${slug(getValue() as string)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
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
		header: 'DeFi TVL',
		accessorKey: 'tvl',
		cell: (info) => {
			return <>{formattedNum(info.getValue(), true)}</>
		},
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Sum of value of all coins held in smart contracts of all the protocols on the chain'
		}
	},
	{
		header: '1d TVL Change',
		accessorKey: 'change_1d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 24 hours'
		}
	},
	{
		header: '7d TVL Change',
		accessorKey: 'change_7d',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 7 days'
		}
	},
	{
		header: '1m TVL Change',
		accessorKey: 'change_1m',
		cell: (info) => <>{formattedPercent(info.getValue())}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: 'Change in TVL in the last 30 days'
		}
	},
	{
		header: 'Bridged TVL',
		accessorKey: 'chainAssets',
		accessorFn: (row) => (row.chainAssets?.total?.total ? +(+row.chainAssets.total.total).toFixed(2) : undefined),
		cell: ({ row }) => {
			const chainAssets: any = row.original.chainAssets
			if (!chainAssets?.total?.total) return null

			const chainAssetsBreakdown = (
				<div className="flex w-52 flex-col gap-1">
					{chainAssets.native ? (
						<div className="flex items-center justify-between gap-1">
							<span>Native:</span>
							<span>{formattedNum(+chainAssets.native, true)}</span>
						</div>
					) : null}
					{chainAssets.canonical ? (
						<div className="flex items-center justify-between gap-1">
							<span>Canonical:</span>
							<span>{formattedNum(+chainAssets.canonical, true)}</span>
						</div>
					) : null}
					{chainAssets.ownTokens ? (
						<div className="flex items-center justify-between gap-1">
							<span>Own Tokens:</span>
							<span>{formattedNum(+chainAssets.ownTokens, true)}</span>
						</div>
					) : null}
					{chainAssets.thirdParty ? (
						<div className="flex items-center justify-between gap-1">
							<span>Third Party:</span>
							<span>{formattedNum(+chainAssets.thirdParty, true)}</span>
						</div>
					) : null}
				</div>
			)

			return (
				<Tooltip content={chainAssetsBreakdown} className="justify-end">
					{formattedNum(+chainAssets.total?.total, true)}
				</Tooltip>
			)
		},
		sortUndefined: 'last',
		size: 120,
		meta: {
			align: 'end',
			headerHelperText: 'Value of all tokens held on the chain'
		}
	},
	{
		header: 'Stables MCap',
		accessorKey: 'stablesMcap',
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 128,
		meta: {
			align: 'end',
			headerHelperText: 'Sum of market cap of all stablecoins on the chain'
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
			headerHelperText: 'Sum of 24h volume on all DEXs on the chain. Updated daily at 00:00UTC'
		}
	},
	{
		header: `24h Chain Fees`,
		accessorKey: 'totalFees24h',
		enableSorting: true,
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 140,
		meta: {
			align: 'end',
			headerHelperText: definitions.fees.chain['24h']
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
			headerHelperText: definitions.appRevenue.chain['24h']
		}
	},
	{
		header: 'Active Addresses',
		accessorKey: 'users',
		cell: (info) => <>{+info?.getValue() > 0 ? formattedNum(info.getValue()) : null}</>,
		size: 180,
		meta: {
			align: 'end',
			headerHelperText: 'Active addresses in the last 24h'
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
			align: 'end',
			headerHelperText: 'Market cap / DeFi TVL ratio'
		}
	},
	{
		header: '24h NFT Volume',
		accessorKey: 'nftVolume',
		cell: (info) => <>{info.getValue() != null ? `$${formattedNum(info.getValue())}` : null}</>,
		size: 148,
		meta: {
			align: 'end',
			headerHelperText: 'Sum of 24h volume on all NFTs on the chain. Updated daily at 00:00UTC'
		}
	}
]

const columnOptions = columns.map((c: any) => ({ name: c.header, key: c.id || c.accessorKey }))

const defaultColumns = JSON.stringify(Object.fromEntries(columnOptions.map((c) => [c.key, true])))
