import {
	type ColumnDef,
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import { startTransition, useMemo, useState } from 'react'
import { Announcement } from '~/components/Announcement'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { VirtualTable } from '~/components/Table/Table'
import { prepareTableCsv, useSortColumnSizesAndOrders, useTableSearch } from '~/components/Table/utils'
import type { ColumnSizesByBreakpoint } from '~/components/Table/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import { definitions } from '~/public/definitions'
import { formattedNum, slug } from '~/utils'
import { ChainsByAdapterChart } from './ChainChart'
import type { IChainsByAdapterPageData } from './types'

type TPageType =
	| 'Fees'
	| 'Revenue'
	| 'Holders Revenue'
	| 'DEX Volume'
	| 'Perp Volume'
	| 'Normalized Volume'
	| 'Bridge Aggregator Volume'
	| 'Perp Aggregator Volume'
	| 'DEX Aggregator Volume'
	| 'Options Premium Volume'
	| 'Options Notional Volume'
	| 'App Revenue'
	| 'App Fees'

interface IProps extends IChainsByAdapterPageData {
	type: TPageType
}

export function ChainsByAdapter(props: IProps) {
	const [enabledSettings] = useLocalStorageSettingsManager('fees')

	const [sorting, setSorting] = useState<SortingState>([{ desc: true, id: 'total24h' }])
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [columnSizing, setColumnSizing] = useState<ColumnSizingState>({})
	const [columnOrder, setColumnOrder] = useState<ColumnOrderState>([])

	const chains = useMemo(() => {
		if (props.adapterType === 'fees' && (enabledSettings.bribes || enabledSettings.tokentax)) {
			return props.chains.map((chain) => {
				const total24h =
					(chain.total24h ?? 0) +
					(enabledSettings.bribes ? (chain.bribes?.total24h ?? 0) : 0) +
					(enabledSettings.tokentax ? (chain.tokenTax?.total24h ?? 0) : 0)
				const total30d =
					(chain.total30d ?? 0) +
					(enabledSettings.bribes ? (chain.bribes?.total30d ?? 0) : 0) +
					(enabledSettings.tokentax ? (chain.tokenTax?.total30d ?? 0) : 0)

				return {
					...chain,
					total24h,
					total30d
				}
			})
		}

		return props.chains
	}, [props.adapterType, props.chains, enabledSettings.bribes, enabledSettings.tokentax])

	const instance = useReactTable({
		data: chains,
		columns: columnsByType[props.type] as any,
		state: {
			sorting,
			columnFilters,
			columnSizing,
			columnOrder
		},
		defaultColumn: {
			sortUndefined: 'last'
		},
		enableSortingRemoval: false,
		filterFromLeafRows: true,
		onSortingChange: (updater) => startTransition(() => setSorting(updater)),
		onColumnFiltersChange: (updater) => startTransition(() => setColumnFilters(updater)),
		onColumnSizingChange: (updater) => startTransition(() => setColumnSizing(updater)),
		onColumnOrderChange: (updater) => startTransition(() => setColumnOrder(updater)),
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({
		instance,
		columnSizes
	})

	return (
		<>
			{props.type === 'Fees' && (
				<Announcement notCancellable>
					<span>Are we missing any protocol?</span>{' '}
					<a
						href="https://airtable.com/shrtBA9lvj6E036Qx"
						className="font-medium text-(--blue) underline"
						target="_blank"
						rel="noopener noreferrer"
					>
						Request it here!
					</a>
				</Announcement>
			)}
			{props.adapterType !== 'fees' && <ChainsByAdapterChart chartData={props.chartData} allChains={props.allChains} />}
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex flex-wrap items-center justify-end gap-4 p-2">
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
							className="w-full rounded-md border border-(--form-control-border) bg-white p-1 pl-7 text-black dark:bg-black dark:text-white"
						/>
					</label>
					<CSVDownloadButton
						prepareCsv={() => prepareTableCsv({ instance, filename: `${props.type}-chains-protocols` })}
						smol
					/>
				</div>
				<VirtualTable instance={instance} rowSize={64} compact />
			</div>
		</>
	)
}

const columnSizes: ColumnSizesByBreakpoint = { 0: { name: 180 }, 640: { name: 240 }, 768: { name: 280 } }

const NameColumn = (route: string): ColumnDef<IChainsByAdapterPageData['chains'][0]> => {
	return {
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue() as string

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo logo={row.original.logo} data-lgonly />

					<BasicLink
						href={route ? `/${route}/chain/${slug(value)}` : `/chain/${slug(value)}`}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{value}
					</BasicLink>
				</span>
			)
		},
		size: 280
	}
}

const columnsByType: Record<IProps['type'], ColumnDef<IChainsByAdapterPageData['chains'][0]>[]> = {
	Fees: [
		NameColumn('fees'),
		{
			id: 'total24h',
			header: 'Fees 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.fees.chain['24h']
			},
			size: 128
		},
		{
			id: 'total7d',
			header: 'Fees 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.fees.chain['7d']
			},
			size: 128
		},
		{
			id: 'total30d',
			header: 'Fees 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.fees.chain['30d']
			},
			size: 128
		}
	],
	Revenue: [
		NameColumn('revenue'),
		{
			id: 'total24h',
			header: 'Revenue 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.revenue.chain['24h']
			},
			size: 128
		},
		{
			id: 'total7d',
			header: 'Revenue 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.revenue.chain['7d']
			},
			size: 128
		},
		{
			id: 'total30d',
			header: 'Revenue 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.revenue.chain['30d']
			},
			size: 128
		}
	],
	'Holders Revenue': [
		NameColumn('holders-revenue'),
		{
			id: 'total24h',
			header: 'Holders Revenue 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.holdersRevenue.chain['24h']
			},
			size: 180
		},
		{
			id: 'total7d',
			header: 'Holders Revenue 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.holdersRevenue.chain['7d']
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'Holders Revenue 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.holdersRevenue.chain['30d']
			},
			size: 180
		}
	],
	'App Revenue': [
		NameColumn('revenue'),
		{
			id: 'total24h',
			header: 'App Revenue 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.appRevenue.chain['24h']
			},
			size: 180
		},
		{
			id: 'total7d',
			header: 'App Revenue 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.appRevenue.chain['7d']
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'App Revenue 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.appRevenue.chain['30d']
			},
			size: 180
		}
	],
	'App Fees': [
		NameColumn('fees'),
		{
			id: 'total24h',
			header: 'App Fees 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.appFees.chain['24h']
			},
			size: 180
		},
		{
			id: 'total7d',
			header: 'App Fees 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.appFees.chain['7d']
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'App Fees 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.appFees.chain['30d']
			},
			size: 180
		}
	],
	'Options Premium Volume': [
		NameColumn('options/premium-volume'),
		{
			id: 'total24h',
			header: 'Premium Volume 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.optionsPremium.chain['24h']
			},
			size: 180
		},
		{
			id: 'total7d',
			header: 'Premium Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.optionsPremium.chain['7d']
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'Premium Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.optionsPremium.chain['30d']
			},
			size: 180
		}
	],
	'Options Notional Volume': [
		NameColumn('options/notional-volume'),
		{
			id: 'total24h',
			header: 'Notional Volume 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.optionsNotional.chain['24h']
			},
			size: 180
		},
		{
			id: 'total7d',
			header: 'Notional Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.optionsNotional.chain['7d']
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'Notional Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.optionsNotional.chain['30d']
			},
			size: 180
		}
	],
	'DEX Volume': [
		NameColumn('dexs'),
		{
			id: 'total24h',
			header: 'DEX Volume 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.dexs.chain['24h']
			},
			size: 152
		},
		{
			id: 'total7d',
			header: 'DEX Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.dexs.chain['7d']
			},
			size: 152
		},
		{
			id: 'total30d',
			header: 'DEX Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.dexs.chain['30d']
			},
			size: 152
		}
	],
	'Perp Volume': [
		NameColumn('perps'),
		{
			id: 'total24h',
			header: 'Perp Volume 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.perps.chain['24h']
			},
			size: 160
		},
		{
			id: 'total7d',
			header: 'Perp Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.perps.chain['7d']
			},
			size: 160
		},
		{
			id: 'total30d',
			header: 'Perp Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.perps.chain['30d']
			},
			size: 160
		},
		{
			header: 'Open Interest',
			id: 'open_interest',
			accessorFn: (protocol) => protocol.openInterest,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.openInterest.chain
			},
			size: 160
		}
	],
	'Normalized Volume': [
		NameColumn('normalized-volume'),
		{
			id: 'total24h',
			header: 'Normalized Volume 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.normalizedVolume.chain['24h']
			},
			size: 160
		},
		{
			id: 'activeLiquidity',
			header: 'Active Liquidity',
			accessorFn: (protocol) => protocol.activeLiquidity,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.activeLiquidity.chain
			},
			size: 160
		},
		{
			id: 'total7d',
			header: 'Normalized Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.normalizedVolume.chain['7d']
			},
			size: 160
		},
		{
			id: 'total30d',
			header: 'Normalized Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.normalizedVolume.chain['30d']
			},
			size: 160
		}
	],
	'Perp Aggregator Volume': [
		NameColumn('perps-aggregators'),
		{
			id: 'total24h',
			header: () => (
				<>
					<span className="md:hidden">Perp Agg Vol 24h</span>
					<span className="hidden md:block">Perp Aggregator Volume 24h</span>
				</>
			),
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.perpsAggregators.chain['24h'],
				csvHeader: 'Perp Aggregator Volume 24h'
			},
			size: 160
		},
		{
			id: 'total7d',
			header: 'Perp Aggregator Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.perpsAggregators.chain['7d']
			},
			size: 160
		},
		{
			id: 'total30d',
			header: () => (
				<>
					<span className="md:hidden">Perps Agg Vol 30d</span>
					<span className="hidden md:block">Perps Aggregator Volume 30d</span>
				</>
			),
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.perpsAggregators.chain['30d'],
				csvHeader: 'Perp Aggregator Volume 30d'
			},
			size: 160
		}
	],
	'Bridge Aggregator Volume': [
		NameColumn('bridge-aggregators'),
		{
			id: 'total24h',
			header: () => (
				<>
					<span className="md:hidden">Bridge Agg Vol 24h</span>
					<span className="hidden md:block">Bridge Aggregator Volume 24h</span>
				</>
			),
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.bridgeAggregators.chain['24h'],
				csvHeader: 'Bridge Aggregator Volume 24h'
			},
			size: 160
		},
		{
			id: 'total7d',
			header: 'Bridge Aggregator Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.bridgeAggregators.chain['7d']
			},
			size: 160
		},
		{
			id: 'total30d',
			header: () => (
				<>
					<span className="md:hidden">Bridge Agg Vol 30d</span>
					<span className="hidden md:block">Bridge Aggregator Volume 30d</span>
				</>
			),
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.bridgeAggregators.chain['30d'],
				csvHeader: 'Bridge Aggregator Volume 30d'
			},
			size: 160
		}
	],
	'DEX Aggregator Volume': [
		NameColumn('dex-aggregators'),
		{
			id: 'total24h',
			header: () => (
				<>
					<span className="md:hidden">DEX Agg Vol 24h</span>
					<span className="hidden md:block">DEX Aggregator Volume 24h</span>
				</>
			),
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.dexAggregators.chain['24h'],
				csvHeader: 'DEX Aggregator Volume 24h'
			},
			size: 160
		},
		{
			id: 'total7d',
			header: 'DEX Aggregator Volume 7d',
			accessorFn: (protocol) => protocol.total7d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.dexAggregators.chain['7d']
			},
			size: 160
		},
		{
			id: 'total30d',
			header: () => (
				<>
					<span className="md:hidden">DEX Agg Vol 30d</span>
					<span className="hidden md:block">DEX Aggregator Volume 30d</span>
				</>
			),
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			meta: {
				align: 'center',
				headerHelperText: definitions.dexAggregators.chain['30d'],
				csvHeader: 'DEX Aggregator Volume 30d'
			},
			size: 160
		}
	]
}
