import { createColumnHelper, useReactTable, getCoreRowModel, getSortedRowModel } from '@tanstack/react-table'
import { lazy, useEffect } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useContentReady } from '~/containers/SuperLuminal/index'
import { formattedNum } from '~/utils'
import { useBlockchainData, type TopToken } from './blockchainApi'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

function KpiCard({ label, value }: { label: string; value: string | number | null }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value ?? '—'}</span>
		</div>
	)
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			{children}
		</div>
	)
}

function SectionHeader({ title }: { title: string }) {
	return <h2 className="text-xs font-semibold tracking-wider text-(--text-label) uppercase">{title}</h2>
}

// Convert IR server format {dates, series} → ECharts format [{date, key1, key2}]
function toChartData(dates: string[], series: { name: string; data: number[] }[]): Record<string, any>[] {
	return dates.map((date, i) => {
		const entry: Record<string, any> = { date: Math.floor(new Date(date + 'T00:00:00Z').getTime() / 1000) }
		for (const s of series) {
			entry[s.name] = s.data[i] ?? 0
		}
		return entry
	})
}

const ACTIVITY_COLORS = { Transactions: '#4FC3F7', 'Active Addresses': '#FFA726', 'New Addresses': '#66BB6A' }
const ACTIVITY_STACKS = { Transactions: 'a' }

const GAS_COLORS = { 'Total Fees (USD)': '#AB47BC' }
const GAS_STACKS = { 'Total Fees (USD)': 'a' }

const UTILIZATION_COLORS = { 'Utilization %': '#4FC3F7' }

const CONTRACT_COLORS = { 'New Contracts': '#FFA726' }
const CONTRACT_STACKS = { 'New Contracts': 'a' }

const TRANSFER_COLORS = { 'Volume (USD)': '#66BB6A' }
const TRANSFER_STACKS = { 'Volume (USD)': 'a' }

const tokenColumnHelper = createColumnHelper<TopToken>()

const tokenColumns = [
	tokenColumnHelper.accessor('symbol', {
		header: 'Token',
		cell: (info) => <span className="font-medium">{info.getValue()}</span>,
		size: 120
	}),
	tokenColumnHelper.accessor('volumeFormatted', {
		header: '30d Volume (USD)',
		cell: (info) => <span className="tabular-nums">{info.getValue()}</span>,
		size: 150
	}),
	tokenColumnHelper.accessor('transferCount', {
		header: 'Transfers',
		cell: (info) => <span className="tabular-nums">{formattedNum(info.getValue(), false)}</span>,
		size: 120
	}),
	tokenColumnHelper.accessor('uniqueSenders', {
		header: 'Unique Senders',
		cell: (info) => <span className="tabular-nums">{formattedNum(info.getValue(), false)}</span>,
		size: 120
	})
]

export default function Blockchain() {
	const { data, isLoading } = useBlockchainData()
	const onContentReady = useContentReady()

	useEffect(() => {
		if (data && !isLoading) onContentReady()
	}, [data, isLoading, onContentReady])

	const tokenTable = useReactTable({
		data: data?.topTokens ?? [],
		columns: tokenColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		initialState: {
			sorting: [{ id: 'volumeFormatted', desc: true }]
		}
	})

	if (isLoading || !data) return null

	const activityData = toChartData(data.chainActivity.dates, [
		data.chainActivity.series[0],
		data.chainActivity.series[1],
		data.chainActivity.series[2]
	])

	const gasData = toChartData(data.gasFees.dates, [data.gasFees.series[0]])

	const utilizationData = toChartData(data.blockUtilization.dates, [data.blockUtilization.series[0]])

	const contractData = toChartData(data.contractDeployments.dates, [data.contractDeployments.series[0]])

	const transferData = toChartData(data.tokenTransfers.dates, [data.tokenTransfers.series[1]])

	return (
		<div className="flex flex-col gap-6">
			{/* Chain Activity */}
			<SectionHeader title="Chain Activity" />
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<KpiCard label="Latest Daily Txs" value={data.activityKpis.latestTxCount.formatted} />
				<KpiCard label="Active Addresses" value={data.activityKpis.latestActiveAddresses.formatted} />
				<KpiCard label="Avg Daily Txs (7d)" value={data.activityKpis.avgDailyTxs7d.formatted} />
				<KpiCard label="Total Txs (All Time)" value={data.activityKpis.totalTxsAllTime.formatted} />
			</div>

			<ChartCard title="Daily Transactions">
				<BarChart
					chartData={activityData}
					stacks={ACTIVITY_STACKS}
					stackColors={ACTIVITY_COLORS}
					title=""
					height="400px"
				/>
			</ChartCard>

			<ChartCard title="Active & New Addresses">
				<AreaChart
					chartData={activityData}
					stacks={['Active Addresses', 'New Addresses']}
					stackColors={ACTIVITY_COLORS}
					title=""
					height="400px"
				/>
			</ChartCard>

			{/* Gas & Fee Economics */}
			<SectionHeader title="Gas & Fee Economics" />
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<KpiCard label="Fees (7d)" value={data.gasKpis.totalFees7d.formatted} />
				<KpiCard label="Fees (30d)" value={data.gasKpis.totalFees30d.formatted} />
				<KpiCard label="Fees (All Time)" value={data.gasKpis.totalFeesAllTime.formatted} />
				<KpiCard label="Avg Fee per Tx" value={data.gasKpis.avgFeePerTx.formatted} />
			</div>

			<ChartCard title="Daily Gas Fees (USD)">
				<BarChart
					chartData={gasData}
					stacks={GAS_STACKS}
					stackColors={GAS_COLORS}
					valueSymbol="$"
					title=""
					height="400px"
				/>
			</ChartCard>

			<ChartCard title="Block Utilization (%)">
				<AreaChart
					chartData={utilizationData}
					stacks={['Utilization %']}
					stackColors={UTILIZATION_COLORS}
					valueSymbol="%"
					title=""
					height="400px"
				/>
			</ChartCard>

			{/* Contract Deployments */}
			<SectionHeader title="Contract Deployments" />
			<ChartCard title="New Contracts Deployed (Monthly)">
				<BarChart
					chartData={contractData}
					stacks={CONTRACT_STACKS}
					stackColors={CONTRACT_COLORS}
					title=""
					height="400px"
				/>
			</ChartCard>

			{/* Token Transfers */}
			<SectionHeader title="Token Transfers" />
			<ChartCard title="Daily Token Transfer Volume (USD)">
				<BarChart
					chartData={transferData}
					stacks={TRANSFER_STACKS}
					stackColors={TRANSFER_COLORS}
					valueSymbol="$"
					title=""
					height="400px"
				/>
			</ChartCard>

			{data.topTokens.length > 0 && (
				<div className="flex flex-col gap-4">
					<SectionHeader title="Top Tokens by 30d Transfer Volume" />
					<div className="overflow-x-auto rounded-lg border border-(--cards-border) bg-(--cards-bg)">
						<table className="w-full">
							<thead>
								{tokenTable.getHeaderGroups().map((headerGroup) => (
									<tr key={headerGroup.id} className="border-b border-(--cards-border)">
										{headerGroup.headers.map((header) => (
											<th
												key={header.id}
												className="px-4 py-3 text-left text-xs font-semibold tracking-wide text-(--text-label) uppercase"
												style={{ width: header.getSize() }}
												onClick={header.column.getToggleSortingHandler()}
											>
												<div className="flex cursor-pointer items-center gap-1">
													{typeof header.column.columnDef.header === 'string'
														? header.column.columnDef.header
														: null}
													{header.column.getIsSorted() === 'asc'
														? ' \u2191'
														: header.column.getIsSorted() === 'desc'
															? ' \u2193'
															: ''}
												</div>
											</th>
										))}
									</tr>
								))}
							</thead>
							<tbody>
								{tokenTable.getRowModel().rows.map((row) => (
									<tr
										key={row.id}
										className="border-b border-(--cards-border) last:border-b-0 hover:bg-(--sl-hover-bg)"
									>
										{row.getVisibleCells().map((cell) => (
											<td key={cell.id} className="px-4 py-2.5 text-sm text-(--text-primary)">
												{typeof cell.column.columnDef.cell === 'function'
													? cell.column.columnDef.cell(cell.getContext())
													: (cell.getValue() as string)}
											</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</div>
			)}
		</div>
	)
}
