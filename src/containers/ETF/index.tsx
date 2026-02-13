import type { ColumnDef } from '@tanstack/react-table'
import * as React from 'react'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { IconsRow } from '~/components/IconsRow'
import { BasicLink } from '~/components/Link'
import { Select } from '~/components/Select/Select'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { TagGroup } from '~/components/TagGroup'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { firstDayOfMonth, formattedNum, lastDayOfWeek } from '~/utils'
import type { ETFOverviewProps, IETFSnapshotRow } from './types'

const MultiSeriesChart2 = React.lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const ASSETS = [
	{ key: 'bitcoin', name: 'Bitcoin', iconUrl: 'https://icons.llamao.fi/icons/protocols/bitcoin' },
	{ key: 'ethereum', name: 'Ethereum', iconUrl: 'https://icons.llamao.fi/icons/protocols/ethereum' },
	{ key: 'solana', name: 'Solana', iconUrl: 'https://icons.llamao.fi/icons/protocols/solana' }
] as const

const GROUP_BY_LIST = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const
type GroupBy = (typeof GROUP_BY_LIST)[number]

const GROUP_BY_TO_CHART_GROUP: Record<GroupBy, 'daily' | 'weekly' | 'monthly'> = {
	Daily: 'daily',
	Weekly: 'weekly',
	Monthly: 'monthly',
	Cumulative: 'daily'
}

const ASSET_VALUES = ['Bitcoin', 'Ethereum', 'Solana'] as const
const DEFAULT_SORTING_STATE = [{ id: 'aum', desc: true }]

export const ETFOverview = ({ snapshot, flows, totalsByAsset, lastUpdated }: ETFOverviewProps) => {
	const [groupBy, setGroupBy] = React.useState<GroupBy>('Weekly')
	const [tickers, setTickers] = React.useState<string[]>(['Bitcoin', 'Ethereum', 'Solana'])
	const setTickersFromSelect: React.Dispatch<React.SetStateAction<Array<string> | string>> = React.useCallback(
		(next) => {
			setTickers((prev) => {
				const resolved = typeof next === 'function' ? next(prev) : next
				if (Array.isArray(resolved)) return resolved
				return resolved ? [resolved] : []
			})
		},
		[]
	)
	const { chartInstance, handleChartReady } = useGetChartInstance()

	const chartData = React.useMemo(() => {
		const bitcoin: Record<string | number, number> = {}
		const ethereum: Record<string | number, number> = {}
		const solana: Record<string | number, number> = {}

		let totalBitcoin = 0
		let totalEthereum = 0
		let totalSolana = 0

		// `flows` keys are unix timestamps (integer-like keys), so `Object.entries(flows)` iterates
		// in ascending numeric order. Cumulative running totals rely on this ordering.
		// We intentionally use `bitcoin` as the date anchor while iterating `flows` by `groupBy`.
		// Rendering later iterates `Object.entries(bitcoin)`, so `ethereum`/`solana` values on dates
		// without Bitcoin are dropped, while `totalBitcoin`/`totalEthereum`/`totalSolana` stay aligned.
		for (const [flowDate, flowEntry] of Object.entries(flows)) {
			const date =
				groupBy === 'Daily' || groupBy === 'Cumulative'
					? flowDate
					: groupBy === 'Weekly'
						? lastDayOfWeek(+flowDate)
						: firstDayOfMonth(+flowDate)

			bitcoin[date] = (bitcoin[date] ?? 0) + (flowEntry['Bitcoin'] ?? 0) + totalBitcoin
			if (flowEntry['Ethereum'] != null) {
				ethereum[date] = (ethereum[date] ?? 0) + (flowEntry['Ethereum'] ?? 0) + totalEthereum
			}
			if (flowEntry['Solana'] != null) {
				solana[date] = (solana[date] ?? 0) + (flowEntry['Solana'] ?? 0) + totalSolana
			}

			if (groupBy === 'Cumulative') {
				totalBitcoin += flowEntry['Bitcoin'] ?? 0
				totalEthereum += flowEntry['Ethereum'] ?? 0
				totalSolana += flowEntry['Solana'] ?? 0
			}
		}

		const seriesType: 'line' | 'bar' = groupBy === 'Cumulative' ? 'line' : 'bar'
		const source: Array<Record<string, number | null>> = []
		for (const [date] of Object.entries(bitcoin)) {
			source.push({
				timestamp: +date * 1000,
				Bitcoin: bitcoin[date] ?? null,
				Ethereum: ethereum[date] ?? null,
				Solana: solana[date] ?? null
			})
		}

		return {
			source,
			allCharts: [
				{
					type: seriesType,
					name: 'Bitcoin',
					encode: { x: 'timestamp', y: 'Bitcoin' },
					stack: 'Bitcoin',
					color: '#F7931A'
				},
				{
					type: seriesType,
					name: 'Ethereum',
					encode: { x: 'timestamp', y: 'Ethereum' },
					stack: 'Ethereum',
					color: '#6B7280'
				},
				{
					type: seriesType,
					name: 'Solana',
					encode: { x: 'timestamp', y: 'Solana' },
					stack: 'Solana',
					color: '#9945FF'
				}
			]
		}
	}, [flows, groupBy])

	const finalCharts = React.useMemo(() => {
		const filteredCharts = chartData.allCharts.filter((c) => tickers.includes(c.name))
		const dimensions = ['timestamp', ...filteredCharts.map((c) => c.name)]
		return {
			dataset: { source: chartData.source, dimensions },
			charts: filteredCharts
		}
	}, [chartData, tickers])

	return (
		<>
			<div className="grid grid-cols-1 gap-1 xl:grid-cols-3">
				<div className="flex flex-col gap-6 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<div>
						<h1 className="text-xl font-semibold">Daily Stats</h1>
						<span className="text-xs text-(--text-label)">{lastUpdated}</span>
					</div>

					<div className="flex flex-col gap-4">
						{ASSETS.map(({ key, name, iconUrl }) => {
							const assetFlows = totalsByAsset[key]?.flows ?? 0
							const aum = totalsByAsset[key]?.aum ?? 0
							return (
								<div key={key} className="flex flex-col gap-1">
									<div className="flex items-center gap-2">
										<img src={iconUrl} alt={name} width={24} height={24} className="rounded-full" />
										<span className="text-lg font-semibold">{name}</span>
									</div>
									<p className="flex flex-wrap justify-start gap-4 pl-8">
										<span className="text-(--text-label)">Flows</span>
										<span
											className={`ml-auto font-jetbrains text-base font-medium ${assetFlows > 0 ? 'text-(--success)' : assetFlows < 0 ? 'text-(--error)' : ''}`}
										>
											{formattedNum(assetFlows, true)}
										</span>
									</p>
									<p className="flex flex-wrap justify-start gap-4 pl-8">
										<span className="text-(--text-label)">AUM</span>
										<span className="ml-auto font-jetbrains text-base font-medium">{formattedNum(aum, true)}</span>
									</p>
								</div>
							)
						})}
					</div>
				</div>
				<div className="flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-2">
					<div className="flex flex-wrap justify-end gap-2 p-2 pb-0">
						<h2 className="mr-auto text-lg font-semibold">Flows (Source: Farside)</h2>
						<TagGroup setValue={(val) => setGroupBy(val as GroupBy)} values={GROUP_BY_LIST} selectedValue={groupBy} />
						<Select
							allValues={ASSET_VALUES}
							selectedValues={tickers}
							setSelectedValues={setTickersFromSelect}
							label={'ETF'}
							labelType="smol"
							variant="filter-responsive"
							portal
						/>
						<ChartExportButtons chartInstance={chartInstance} filename="etf-flows" title="ETF Flows" />
					</div>
					<React.Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={finalCharts.dataset}
							charts={finalCharts.charts}
							groupBy={GROUP_BY_TO_CHART_GROUP[groupBy]}
							onReady={handleChartReady}
						/>
					</React.Suspense>
				</div>
			</div>
			<TableWithSearch
				data={snapshot}
				columns={columns}
				columnToSearch={'ticker'}
				placeholder={'Search ETF...'}
				header="Exchange Traded Funds"
				sortingState={DEFAULT_SORTING_STATE}
			/>
		</>
	)
}

const columns: ColumnDef<IETFSnapshotRow>[] = [
	{
		header: 'Ticker',
		accessorKey: 'ticker',
		enableSorting: false,
		cell: ({ getValue, row }) => {
			return (
				<span className="relative flex items-center gap-2">
					<span className="vf-row-index shrink-0" aria-hidden="true" />
					<BasicLink
						href={row.original.url}
						className="overflow-hidden text-sm font-medium text-ellipsis whitespace-nowrap text-(--link-text) hover:underline"
					>
						{getValue<string | null>()}
					</BasicLink>
				</span>
			)
		},
		size: 100
	},
	{
		header: 'Issuer',
		accessorKey: 'issuer',
		meta: {
			align: 'end'
		},
		size: 160
	},
	{
		header: 'Coin',
		accessorKey: 'chain',
		enableSorting: true,
		cell: ({ getValue }) => <IconsRow links={getValue<string[]>()} url="" iconType="chain" disableLinks={true} />,
		meta: {
			align: 'end'
		},
		size: 160
	},
	{
		header: 'Flows',
		accessorKey: 'flows',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			const formattedValue = value != null ? formattedNum(value, true) : null

			return (
				<span
					className={
						value != null && value > 0 ? 'text-(--success)' : value != null && value < 0 ? 'text-(--error)' : ''
					}
				>
					{formattedValue}
				</span>
			)
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'AUM',
		accessorKey: 'aum',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? formattedNum(value, true) : null}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	},
	{
		header: 'Volume',
		accessorKey: 'volume',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return <>{value != null ? formattedNum(value, true) : ''}</>
		},
		meta: {
			align: 'end'
		},
		size: 120
	}
]
