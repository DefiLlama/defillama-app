import { Announcement } from '~/components/Announcement'
import { Metrics, TMetric } from '~/components/Metrics'
import { AdaptorsSearch } from '~/components/Search/Adaptors'
import { IChainsByAdapterPageData } from './types'
import { download, formattedNum, slug } from '~/utils'
import { TokenLogo } from '~/components/TokenLogo'
import { BasicLink } from '~/components/Link'
import {
	ColumnDef,
	ColumnFiltersState,
	ColumnOrderState,
	ColumnSizingState,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getSortedRowModel,
	SortingState,
	useReactTable
} from '@tanstack/react-table'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocalStorageSettingsManager } from '~/contexts/LocalStorage'
import useWindowSize from '~/hooks/useWindowSize'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { VirtualTable } from '~/components/Table/Table'
import { Icon } from '~/components/Icon'
import { ChainsByAdapterChart } from './ChainChart'

interface IProps extends IChainsByAdapterPageData {
	type: Extract<
		TMetric,
		| 'Fees'
		| 'Revenue'
		| 'Holders Revenue'
		| 'DEX Volume'
		| 'Perp Volume'
		| 'Bridge Aggregator Volume'
		| 'Perp Aggregator Volume'
		| 'DEX Aggregator Volume'
		| 'Options Premium Volume'
		| 'Options Notional Volume'
		| 'App Revenue'
	>
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
					(enabledSettings.bribes ? chain.bribes?.total24h ?? 0 : 0) +
					(enabledSettings.tokentax ? chain.tokenTax?.total24h ?? 0 : 0)
				const total30d =
					(chain.total30d ?? 0) +
					(enabledSettings.bribes ? chain.bribes?.total30d ?? 0 : 0) +
					(enabledSettings.tokentax ? chain.tokenTax?.total30d ?? 0 : 0)

				return {
					...chain,
					total24h,
					total30d
				}
			})
		}

		return props.chains
	}, [props, enabledSettings])

	const instance = useReactTable({
		data: chains,
		columns: columnsByType[props.type] as any,
		state: {
			sorting,
			columnFilters,
			columnSizing,
			columnOrder
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
		filterFromLeafRows: true,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnSizingChange: setColumnSizing,
		onColumnOrderChange: setColumnOrder,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		getFilteredRowModel: getFilteredRowModel()
	})

	const [projectName, setProjectName] = useState('')

	useEffect(() => {
		const columns = instance.getColumn('name')

		const id = setTimeout(() => {
			if (columns) {
				columns.setFilterValue(projectName)
			}
		}, 200)

		return () => clearTimeout(id)
	}, [projectName, instance])

	const windowSize = useWindowSize()

	useEffect(() => {
		const colSize = windowSize.width ? columnSizes.find((size) => windowSize.width > +size[0]) : columnSizes[0]
		// const colOrder = windowSize.width ? columnOrders.find((size) => windowSize.width > +size[0]) : columnOrders[0]
		// instance.setColumnOrder(colOrder[1])
		instance.setColumnSizing(colSize[1])
	}, [instance, windowSize])

	const downloadCsv = useCallback(() => {
		const header = ['Chain', 'Total 1d', 'Total 1m']
		const csvdata = chains.map((protocol) => {
			return [protocol.name, protocol.total24h, protocol.total30d]
		})
		const csv = [header, ...csvdata].map((row) => row.join(',')).join('\n')

		download(`${props.type}-chains-protocols.csv`, csv)
	}, [props, chains])

	return (
		<>
			{props.type === 'Fees' && (
				<Announcement notCancellable>
					<span>Are we missing any protocol?</span>{' '}
					<a
						href="https://airtable.com/shrtBA9lvj6E036Qx"
						className="text-[var(--blue)] underline font-medium"
						target="_blank"
						rel="noopener noreferrer"
					>
						Request it here!
					</a>
				</Announcement>
			)}
			<AdaptorsSearch type={props.adapterType} dataType={props.dataType} />
			<Metrics currentMetric={props.type} isChains={true} />
			{props.adapterType !== 'fees' && (
				<ChainsByAdapterChart chartData={props.chartData} allChains={props.allChains} type={props.type} />
			)}
			<div className="bg-[var(--cards-bg)] rounded-md">
				<div className="flex items-center justify-end flex-wrap gap-4 p-3">
					<div className="relative w-full sm:max-w-[280px] mr-auto">
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
							className="border border-[var(--form-control-border)] w-full pl-7 pr-2 py-[6px] bg-white dark:bg-black text-black dark:text-white rounded-md text-sm"
						/>
					</div>
					<CSVDownloadButton onClick={downloadCsv} className="min-h-8" />
				</div>
				<VirtualTable instance={instance} />
			</div>
		</>
	)
}

const columnSizes = Object.entries({ 0: { name: 180 }, 640: { name: 240 }, 768: { name: 280 } }).sort(
	(a, b) => Number(b[0]) - Number(a[0])
)

const NameColumn = (route: string): ColumnDef<IChainsByAdapterPageData['chains'][0]> => {
	return {
		id: 'name',
		header: 'Name',
		accessorFn: (protocol) => protocol.name,
		enableSorting: false,
		cell: ({ getValue, row, table }) => {
			const value = getValue() as string
			const index = row.depth === 0 ? table.getSortedRowModel().rows.findIndex((x) => x.id === row.id) : row.index

			return (
				<span className="flex items-center gap-2 relative">
					<span className="flex-shrink-0">{index + 1}</span>

					<TokenLogo logo={row.original.logo} data-lgonly />

					<BasicLink
						href={route ? `/${route}/chain/${slug(value)}` : `/chain/${slug(value)}`}
						className="text-sm font-medium text-[var(--link-text)] overflow-hidden whitespace-nowrap text-ellipsis hover:underline"
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Fees paid by users to all the protocols on the chain in the last 24 hours, updated daily at 00:00 UTC'
			},
			size: 128
		},
		{
			id: 'total30d',
			header: 'Fees 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Fees paid by users to all the protocols on the chain in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Revenue earned by all the protocols on the chain in the last 24 hours, updated daily at 00:00 UTC'
			},
			size: 128
		},
		{
			id: 'total30d',
			header: 'Revenue 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by all the protocols on the chain in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Revenue earned by token holders of all the protocols on the chain in the last 24 hours, updated daily at 00:00 UTC'
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'Holders Revenue 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Revenue earned by token holders of all the protocols on the chain in the last 30 days'
			},
			size: 180
		}
	],
	'App Revenue': [
		NameColumn('app-revenue'),
		{
			id: 'total24h',
			header: 'App Revenue 24h',
			accessorFn: (protocol) => protocol.total24h,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Total revenue earned by the apps on the chain, updated daily at 00:00 UTC. Excludes liquid staking apps and gas fees'
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'App Revenue 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Total revenue earned by the apps on the chain in the last 30 days. Excludes liquid staking apps and gas fees'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Sum of value paid buying and selling options on all options exchanges on the chain in the last 24 hours, updated daily at 00:00 UTC'
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'Premium Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Sum of value paid buying and selling options on all options exchanges on the chain in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Sum of the notional value of all options that have been traded on all options exchanges on the chain in the last 24 hours, updated daily at 00:00 UTC'
			},
			size: 180
		},
		{
			id: 'total30d',
			header: 'Notional Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Sum of the notional value of all options that have been traded on all options exchanges on the chain in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Volume of all spot swaps on all dexs on the chain in the last 24 hours, updated daily at 00:00 UTC'
			},
			size: 152
		},
		{
			id: 'total30d',
			header: 'DEX Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Volume of all spot swaps on all dexs on the chain in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Notional volume of all trades on all perp exchanges on the chain, including leverage in the last 24 hours, updated daily at 00:00 UTC'
			},
			size: 160
		},
		{
			id: 'total30d',
			header: 'Perp Volume 30d',
			accessorFn: (protocol) => protocol.total30d,
			cell: (info) => <>{info.getValue() != null ? formattedNum(info.getValue(), true) : null}</>,
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Notional volume of all trades on all perp exchanges on the chain, including leverage in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Notional volume of all trades on all perp aggregators on the chain, including leverage in the last 24 hours, updated daily at 00:00 UTC'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Notional volume of all trades on all perp aggregators on the chain, including leverage in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Sum of value of all assets that were bridged through all the bridge Aggregators on the chain in the last 24 hours, updated daily at 00:00 UTC'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Sum of value of all assets that were bridged through all the bridge Aggregators on the chain in the last 30 days'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText:
					'Volume of spot token swaps on all the DEX aggregators on the chain in the last 24 hours, updated daily at 00:00 UTC'
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
			sortUndefined: 'last',
			meta: {
				align: 'end',
				headerHelperText: 'Volume of spot token swaps on all the DEX aggregators on the chain in the last 30 days'
			},
			size: 160
		}
	]
}
