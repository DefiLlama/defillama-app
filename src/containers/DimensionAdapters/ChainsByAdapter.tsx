import {
	type ColumnFiltersState,
	type ColumnOrderState,
	type ColumnSizingState,
	createColumnHelper,
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

	const [_projectName, setProjectName] = useTableSearch({ instance, columnToSearch: 'name' })
	useSortColumnSizesAndOrders({
		instance,
		columnSizes
	})

	return (
		<>
			{props.type === 'Fees' ? (
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
			) : null}
			{props.adapterType !== 'fees' ? (
				<ChainsByAdapterChart
					chartData={props.chartData}
					allChains={props.allChains}
					chains={chains}
					chartName={props.type}
				/>
			) : null}
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
							onInput={(e) => setProjectName(e.currentTarget.value)}
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

type ChainRow = IChainsByAdapterPageData['chains'][0]

const columnHelper = createColumnHelper<ChainRow>()

const NameColumn = (route: string) =>
	columnHelper.accessor('name', {
		id: 'name',
		header: 'Name',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			const value = getValue()

			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />

					<TokenLogo src={row.original.logo} alt={`Logo of ${row.original.name}`} data-lgonly />

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
	})

const metricColumn = (
	id: string,
	header: any,
	accessor: (protocol: ChainRow) => number | null | undefined,
	headerHelperText: string,
	size: number,
	csvHeader?: string
) =>
	columnHelper.accessor(accessor, {
		id,
		header,
		cell: (info) => (info.getValue() != null ? formattedNum(info.getValue(), true) : null),
		meta: {
			align: 'center',
			headerHelperText,
			...(csvHeader ? { csvHeader } : {})
		},
		size
	})

const columnsByType = {
	Fees: [
		NameColumn('fees'),
		metricColumn('total24h', 'Fees 24h', (protocol) => protocol.total24h, definitions.fees.chain['24h'], 128),
		metricColumn('total7d', 'Fees 7d', (protocol) => protocol.total7d, definitions.fees.chain['7d'], 128),
		metricColumn('total30d', 'Fees 30d', (protocol) => protocol.total30d, definitions.fees.chain['30d'], 128)
	],
	Revenue: [
		NameColumn('revenue'),
		metricColumn('total24h', 'Revenue 24h', (protocol) => protocol.total24h, definitions.revenue.chain['24h'], 128),
		metricColumn('total7d', 'Revenue 7d', (protocol) => protocol.total7d, definitions.revenue.chain['7d'], 128),
		metricColumn('total30d', 'Revenue 30d', (protocol) => protocol.total30d, definitions.revenue.chain['30d'], 128)
	],
	'Holders Revenue': [
		NameColumn('holders-revenue'),
		metricColumn(
			'total24h',
			'Holders Revenue 24h',
			(protocol) => protocol.total24h,
			definitions.holdersRevenue.chain['24h'],
			180
		),
		metricColumn(
			'total7d',
			'Holders Revenue 7d',
			(protocol) => protocol.total7d,
			definitions.holdersRevenue.chain['7d'],
			180
		),
		metricColumn(
			'total30d',
			'Holders Revenue 30d',
			(protocol) => protocol.total30d,
			definitions.holdersRevenue.chain['30d'],
			180
		)
	],
	'App Revenue': [
		NameColumn('revenue'),
		metricColumn(
			'total24h',
			'App Revenue 24h',
			(protocol) => protocol.total24h,
			definitions.appRevenue.chain['24h'],
			180
		),
		metricColumn('total7d', 'App Revenue 7d', (protocol) => protocol.total7d, definitions.appRevenue.chain['7d'], 180),
		metricColumn(
			'total30d',
			'App Revenue 30d',
			(protocol) => protocol.total30d,
			definitions.appRevenue.chain['30d'],
			180
		)
	],
	'App Fees': [
		NameColumn('fees'),
		metricColumn('total24h', 'App Fees 24h', (protocol) => protocol.total24h, definitions.appFees.chain['24h'], 180),
		metricColumn('total7d', 'App Fees 7d', (protocol) => protocol.total7d, definitions.appFees.chain['7d'], 180),
		metricColumn('total30d', 'App Fees 30d', (protocol) => protocol.total30d, definitions.appFees.chain['30d'], 180)
	],
	'Options Premium Volume': [
		NameColumn('options/premium-volume'),
		metricColumn(
			'total24h',
			'Premium Volume 24h',
			(protocol) => protocol.total24h,
			definitions.optionsPremium.chain['24h'],
			180
		),
		metricColumn(
			'total7d',
			'Premium Volume 7d',
			(protocol) => protocol.total7d,
			definitions.optionsPremium.chain['7d'],
			180
		),
		metricColumn(
			'total30d',
			'Premium Volume 30d',
			(protocol) => protocol.total30d,
			definitions.optionsPremium.chain['30d'],
			180
		)
	],
	'Options Notional Volume': [
		NameColumn('options/notional-volume'),
		metricColumn(
			'total24h',
			'Notional Volume 24h',
			(protocol) => protocol.total24h,
			definitions.optionsNotional.chain['24h'],
			180
		),
		metricColumn(
			'total7d',
			'Notional Volume 7d',
			(protocol) => protocol.total7d,
			definitions.optionsNotional.chain['7d'],
			180
		),
		metricColumn(
			'total30d',
			'Notional Volume 30d',
			(protocol) => protocol.total30d,
			definitions.optionsNotional.chain['30d'],
			180
		)
	],
	'DEX Volume': [
		NameColumn('dexs'),
		metricColumn('total24h', 'DEX Volume 24h', (protocol) => protocol.total24h, definitions.dexs.chain['24h'], 152),
		metricColumn('total7d', 'DEX Volume 7d', (protocol) => protocol.total7d, definitions.dexs.chain['7d'], 152),
		metricColumn('total30d', 'DEX Volume 30d', (protocol) => protocol.total30d, definitions.dexs.chain['30d'], 152)
	],
	'Perp Volume': [
		NameColumn('perps'),
		metricColumn('total24h', 'Perp Volume 24h', (protocol) => protocol.total24h, definitions.perps.chain['24h'], 160),
		metricColumn('total7d', 'Perp Volume 7d', (protocol) => protocol.total7d, definitions.perps.chain['7d'], 160),
		metricColumn('total30d', 'Perp Volume 30d', (protocol) => protocol.total30d, definitions.perps.chain['30d'], 160),
		metricColumn(
			'openInterest',
			'Open Interest',
			(protocol) => protocol.openInterest,
			definitions.openInterest.chain,
			160
		)
	],
	'Normalized Volume': [
		NameColumn('normalized-volume'),
		metricColumn(
			'total24h',
			'Normalized Volume 24h',
			(protocol) => protocol.total24h,
			definitions.normalizedVolume.chain['24h'],
			160
		),
		metricColumn(
			'activeLiquidity',
			'Active Liquidity',
			(protocol) => protocol.activeLiquidity,
			definitions.activeLiquidity.chain,
			160
		),
		metricColumn(
			'total7d',
			'Normalized Volume 7d',
			(protocol) => protocol.total7d,
			definitions.normalizedVolume.chain['7d'],
			160
		),
		metricColumn(
			'total30d',
			'Normalized Volume 30d',
			(protocol) => protocol.total30d,
			definitions.normalizedVolume.chain['30d'],
			160
		)
	],
	'Perp Aggregator Volume': [
		NameColumn('perps-aggregators'),
		metricColumn(
			'total24h',
			<>
				<span className="md:hidden">Perp Agg Vol 24h</span>
				<span className="hidden md:block">Perp Aggregator Volume 24h</span>
			</>,
			(protocol) => protocol.total24h,
			definitions.perpsAggregators.chain['24h'],
			160,
			'Perp Aggregator Volume 24h'
		),
		metricColumn(
			'total7d',
			'Perp Aggregator Volume 7d',
			(protocol) => protocol.total7d,
			definitions.perpsAggregators.chain['7d'],
			160
		),
		metricColumn(
			'total30d',
			<>
				<span className="md:hidden">Perps Agg Vol 30d</span>
				<span className="hidden md:block">Perps Aggregator Volume 30d</span>
			</>,
			(protocol) => protocol.total30d,
			definitions.perpsAggregators.chain['30d'],
			160,
			'Perp Aggregator Volume 30d'
		)
	],
	'Bridge Aggregator Volume': [
		NameColumn('bridge-aggregators'),
		metricColumn(
			'total24h',
			<>
				<span className="md:hidden">Bridge Agg Vol 24h</span>
				<span className="hidden md:block">Bridge Aggregator Volume 24h</span>
			</>,
			(protocol) => protocol.total24h,
			definitions.bridgeAggregators.chain['24h'],
			160,
			'Bridge Aggregator Volume 24h'
		),
		metricColumn(
			'total7d',
			'Bridge Aggregator Volume 7d',
			(protocol) => protocol.total7d,
			definitions.bridgeAggregators.chain['7d'],
			160
		),
		metricColumn(
			'total30d',
			<>
				<span className="md:hidden">Bridge Agg Vol 30d</span>
				<span className="hidden md:block">Bridge Aggregator Volume 30d</span>
			</>,
			(protocol) => protocol.total30d,
			definitions.bridgeAggregators.chain['30d'],
			160,
			'Bridge Aggregator Volume 30d'
		)
	],
	'DEX Aggregator Volume': [
		NameColumn('dex-aggregators'),
		metricColumn(
			'total24h',
			<>
				<span className="md:hidden">DEX Agg Vol 24h</span>
				<span className="hidden md:block">DEX Aggregator Volume 24h</span>
			</>,
			(protocol) => protocol.total24h,
			definitions.dexAggregators.chain['24h'],
			160,
			'DEX Aggregator Volume 24h'
		),
		metricColumn(
			'total7d',
			'DEX Aggregator Volume 7d',
			(protocol) => protocol.total7d,
			definitions.dexAggregators.chain['7d'],
			160
		),
		metricColumn(
			'total30d',
			<>
				<span className="md:hidden">DEX Agg Vol 30d</span>
				<span className="hidden md:block">DEX Aggregator Volume 30d</span>
			</>,
			(protocol) => protocol.total30d,
			definitions.dexAggregators.chain['30d'],
			160,
			'DEX Aggregator Volume 30d'
		)
	]
}
