import {
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { TextLoader } from '../../Logo'
import { lazy, Suspense, useMemo, useState } from 'react'
import type { ISingleSeriesChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import {
	type HlpData,
	type HlpFill,
	type HlpOpenOrder,
	type HlpPosition,
	useHyperliquidHlpFunding,
	useHyperliquidHlpOpenOrders,
	useHyperliquidHlpPortfolio,
	useHyperliquidHlpPositions
} from './api'

type VaultFilter = 'All' | 'A' | 'B'
const SingleSeriesChart = lazy(
	() => import('~/components/ECharts/SingleSeriesChart')
) as React.FC<ISingleSeriesChartProps>

function MetricCard({ label, value, helper }: { label: string; value: string | number | null; helper?: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value ?? '—'}</span>
			{helper ? <span className="text-[11px] text-(--text-label)">{helper}</span> : null}
		</div>
	)
}

function Pagination({ table }: { table: ReturnType<typeof useReactTable<any>> }) {
	const { pageIndex, pageSize } = table.getState().pagination
	const total = table.getFilteredRowModel().rows.length
	const from = total === 0 ? 0 : pageIndex * pageSize + 1
	const to = Math.min((pageIndex + 1) * pageSize, total)

	return (
		<div className="flex items-center justify-between pt-3">
			<span className="text-xs text-(--text-label)">
				{from}–{to} of {total}
			</span>
			<div className="flex gap-1">
				<button
					onClick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
					className="rounded px-2.5 py-1 text-xs font-medium text-(--text-label) transition-colors hover:bg-(--sl-hover-bg) disabled:opacity-30 disabled:hover:bg-transparent"
				>
					Prev
				</button>
				<button
					onClick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
					className="rounded px-2.5 py-1 text-xs font-medium text-(--text-label) transition-colors hover:bg-(--sl-hover-bg) disabled:opacity-30 disabled:hover:bg-transparent"
				>
					Next
				</button>
			</div>
		</div>
	)
}

function PnlCell({ value }: { value: number }) {
	const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : ''
	return <span className={color}>{formattedNum(value, true)}</span>
}

function PercentCell({ value }: { value: number }) {
	const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : ''
	return (
		<span className={color}>
			{value >= 0 ? '+' : ''}
			{value.toFixed(2)}%
		</span>
	)
}

function PortfolioTrend({
	points,
	window
}: {
	points: Array<{ time: number; accountValue: number; pnl: number }>
	window: 'day' | 'week' | 'month' | 'allTime'
}) {
	if (points.length < 2) return null
	const chartData = points.map((point) => [Math.floor(point.time / 1000), point.accountValue] as [number, number])

	const first = points[0].accountValue
	const last = points[points.length - 1].accountValue
	const changePct = first ? ((last - first) / first) * 100 : 0

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<div className="mb-3 flex items-center justify-between">
				<h3 className="text-sm font-medium text-(--text-label)">Portfolio Trend ({window})</h3>
				<span className={changePct >= 0 ? 'text-xs text-green-400' : 'text-xs text-red-400'}>
					{changePct >= 0 ? '+' : ''}
					{changePct.toFixed(2)}%
				</span>
			</div>
			<Suspense fallback={<div className="h-[220px]" />}>
				<SingleSeriesChart
					chartType="line"
					chartData={chartData}
					valueSymbol="$"
					color="#2172e5"
					hideDataZoom
					height="220px"
				/>
			</Suspense>
			<div className="mt-2 flex items-center justify-between text-xs text-(--text-label)">
				<span>{new Date(points[0].time).toLocaleDateString()}</span>
				<span>Last: {formattedNum(last, true)}</span>
				<span>{new Date(points[points.length - 1].time).toLocaleDateString()}</span>
			</div>
		</div>
	)
}

const positionColumns: ColumnDef<HlpPosition>[] = [
	{
		header: 'Coin',
		accessorKey: 'coin',
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
		size: 100
	},
	{ header: 'Vault', accessorKey: 'vault', size: 70 },
	{
		header: 'Side',
		accessorKey: 'side',
		cell: ({ getValue }) => {
			const value = getValue<string>()
			return <span className={value === 'Long' ? 'text-green-400' : 'text-red-400'}>{value}</span>
		},
		size: 80
	},
	{
		header: 'Size',
		accessorKey: 'size',
		cell: ({ getValue }) => formattedNum(getValue<number>()),
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Entry',
		accessorKey: 'entryPx',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Pos Value',
		accessorKey: 'positionValue',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 130
	},
	{
		header: 'Unrealized',
		accessorKey: 'unrealizedPnl',
		cell: ({ getValue }) => <PnlCell value={getValue<number>()} />,
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: 'ROE',
		accessorKey: 'roe',
		cell: ({ getValue }) => <PercentCell value={getValue<number>()} />,
		meta: { align: 'end' as const },
		size: 90
	},
	{
		header: 'Leverage',
		accessorKey: 'leverage',
		cell: ({ getValue }) => `${getValue<number>()}x`,
		meta: { align: 'end' as const },
		size: 90
	},
	{
		header: 'Liq Price',
		accessorKey: 'liquidationPx',
		cell: ({ getValue }) => {
			const value = getValue<number | null>()
			return value != null ? formattedNum(value, true) : '—'
		},
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: 'Funding',
		accessorKey: 'cumFundingSinceOpen',
		cell: ({ getValue }) => <PnlCell value={getValue<number>()} />,
		meta: { align: 'end' as const },
		size: 110
	}
]

const fillColumns: ColumnDef<HlpFill>[] = [
	{
		header: 'Time',
		accessorKey: 'time',
		cell: ({ getValue }) => new Date(getValue<number>()).toLocaleString(),
		size: 165
	},
	{ header: 'Vault', accessorKey: 'vault', size: 70 },
	{
		header: 'Coin',
		accessorKey: 'coin',
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
		size: 80
	},
	{
		header: 'Side',
		accessorKey: 'side',
		cell: ({ getValue }) => {
			const value = getValue<string>()
			return <span className={value === 'Buy' ? 'text-green-400' : 'text-red-400'}>{value}</span>
		},
		size: 80
	},
	{
		header: 'Price',
		accessorKey: 'px',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Size',
		accessorKey: 'sz',
		cell: ({ getValue }) => formattedNum(getValue<number>()),
		meta: { align: 'end' as const },
		size: 90
	},
	{
		header: 'Closed PnL',
		accessorKey: 'closedPnl',
		cell: ({ getValue }) => <PnlCell value={getValue<number>()} />,
		meta: { align: 'end' as const },
		size: 120
	},
	{
		header: 'Fee',
		accessorKey: 'fee',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 100
	},
	{ header: 'Fee Token', accessorKey: 'feeToken', size: 90 },
	{ header: 'Dir', accessorKey: 'dir', size: 120 },
	{
		header: 'Hash',
		accessorKey: 'hash',
		cell: ({ getValue }) => {
			const value = getValue<string | null>()
			if (!value) return '—'
			return `${value.slice(0, 8)}...${value.slice(-6)}`
		},
		size: 150
	}
]

const openOrderColumns: ColumnDef<HlpOpenOrder>[] = [
	{
		header: 'Time',
		accessorKey: 'timestamp',
		cell: ({ getValue }) => new Date(getValue<number>()).toLocaleString(),
		size: 160
	},
	{ header: 'Vault', accessorKey: 'vault', size: 70 },
	{
		header: 'Coin',
		accessorKey: 'coin',
		cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span>,
		size: 90
	},
	{
		header: 'Side',
		accessorKey: 'side',
		cell: ({ getValue }) => {
			const value = getValue<string>()
			return <span className={value === 'Buy' ? 'text-green-400' : 'text-red-400'}>{value}</span>
		},
		size: 80
	},
	{
		header: 'Price',
		accessorKey: 'limitPx',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Size',
		accessorKey: 'sz',
		cell: ({ getValue }) => formattedNum(getValue<number>()),
		meta: { align: 'end' as const },
		size: 100
	},
	{ header: 'Order ID', accessorKey: 'oid', meta: { align: 'end' as const }, size: 120 }
]

function DataTable<T>({
	title,
	data,
	columns,
	defaultSort,
	pageSize
}: {
	title: string
	data: T[]
	columns: ColumnDef<T>[]
	defaultSort: SortingState
	pageSize: number
}) {
	const [sorting, setSorting] = useState<SortingState>(defaultSort)
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize })

	const instance = useReactTable({
		data,
		columns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			<VirtualTable instance={instance} skipVirtualization />
			{data.length > pageSize ? <Pagination table={instance} /> : null}
		</div>
	)
}

export default function Positions() {
	const [vaultFilter, setVaultFilter] = useState<VaultFilter>('All')
	const [fundingWindow, setFundingWindow] = useState<'24h' | '7d' | '30d'>('24h')
	const [portfolioWindow, setPortfolioWindow] = useState<'day' | 'week' | 'month' | 'allTime'>('week')

	const { hlpData, isLoading } = useHyperliquidHlpPositions()
	const { openOrders } = useHyperliquidHlpOpenOrders()
	const { funding: funding24h } = useHyperliquidHlpFunding('24h')
	const { funding: funding7d } = useHyperliquidHlpFunding('7d')
	const { funding } = useHyperliquidHlpFunding(fundingWindow)
	const { portfolio } = useHyperliquidHlpPortfolio(portfolioWindow)

	const data = hlpData as HlpData

	const filteredPositions = useMemo(
		() =>
			vaultFilter === 'All' ? data.positions : data.positions.filter((position) => position.vault === vaultFilter),
		[data.positions, vaultFilter]
	)
	const filteredFills = useMemo(
		() => (vaultFilter === 'All' ? data.recentFills : data.recentFills.filter((fill) => fill.vault === vaultFilter)),
		[data.recentFills, vaultFilter]
	)
	const filteredOpenOrders = useMemo(
		() => (vaultFilter === 'All' ? openOrders : openOrders.filter((order) => order.vault === vaultFilter)),
		[openOrders, vaultFilter]
	)
	const filteredFundingEvents = useMemo(
		() => (vaultFilter === 'All' ? funding.events : funding.events.filter((event) => event.vault === vaultFilter)),
		[funding.events, vaultFilter]
	)

	const kpis = useMemo(() => {
		const summary = data.summary
		return {
			accountValue: summary.accountValue > 0 ? formattedNum(summary.accountValue, true) : '—',
			totalNtlPos: summary.totalNtlPos > 0 ? formattedNum(summary.totalNtlPos, true) : '—',
			totalMarginUsed: summary.totalMarginUsed > 0 ? formattedNum(summary.totalMarginUsed, true) : '—',
			withdrawable: summary.withdrawable > 0 ? formattedNum(summary.withdrawable, true) : '—',
			positionCount: filteredPositions.length,
			fundingPnl24h: formattedNum(funding24h.totalUsdc, true),
			fundingPnl7d: formattedNum(funding7d.totalUsdc, true),
			snapshotTime: summary.snapshotTime ? new Date(summary.snapshotTime).toLocaleString() : '—',
			portfolioVolume: formattedNum(portfolio.volume, true)
		}
	}, [data.summary, filteredPositions.length, funding24h.totalUsdc, funding7d.totalUsdc, portfolio.volume])

	if (isLoading) {
		return (
			<div className="flex flex-1 items-center justify-center py-20">
				<TextLoader />
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-2">
				<div className="text-xs font-medium tracking-wide text-(--text-label)">Vault:</div>
				{(['All', 'A', 'B'] as VaultFilter[]).map((value) => (
					<button
						key={value}
						onClick={() => setVaultFilter(value)}
						className={`rounded px-3 py-1.5 text-xs ${vaultFilter === value ? 'bg-[#2172e5] text-white' : 'bg-(--sl-btn-inactive-bg) text-(--text-label)'}`}
					>
						{value}
					</button>
				))}

				<div className="ml-auto text-xs text-(--text-label)">Snapshot: {kpis.snapshotTime}</div>
			</div>

			<div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
				<MetricCard label="Account Value" value={kpis.accountValue} />
				<MetricCard label="Total Notional" value={kpis.totalNtlPos} />
				<MetricCard label="Margin Used" value={kpis.totalMarginUsed} />
				<MetricCard label="Withdrawable" value={kpis.withdrawable} />
				<MetricCard label="Active Positions" value={kpis.positionCount} />
				<MetricCard label="Funding PnL 24h" value={kpis.fundingPnl24h} />
				<MetricCard label="Funding PnL 7d" value={kpis.fundingPnl7d} />
				<MetricCard label="Portfolio Volume" value={kpis.portfolioVolume} helper={portfolio.window} />
			</div>

			<div className="flex flex-wrap items-center gap-2">
				<div className="text-xs font-medium tracking-wide text-(--text-label)">Portfolio Window:</div>
				{(['day', 'week', 'month', 'allTime'] as const).map((value) => (
					<button
						key={value}
						onClick={() => setPortfolioWindow(value)}
						className={`rounded px-3 py-1.5 text-xs ${portfolioWindow === value ? 'bg-[#2172e5] text-white' : 'bg-(--sl-btn-inactive-bg) text-(--text-label)'}`}
					>
						{value}
					</button>
				))}
			</div>

			<PortfolioTrend points={portfolio.points} window={portfolioWindow} />

			<div className="flex flex-wrap items-center gap-2">
				<div className="text-xs font-medium tracking-wide text-(--text-label)">Funding Window:</div>
				{(['24h', '7d', '30d'] as const).map((value) => (
					<button
						key={value}
						onClick={() => setFundingWindow(value)}
						className={`rounded px-3 py-1.5 text-xs ${fundingWindow === value ? 'bg-[#2172e5] text-white' : 'bg-(--sl-btn-inactive-bg) text-(--text-label)'}`}
					>
						{value}
					</button>
				))}
			</div>

			<DataTable
				title="HLP Positions"
				data={filteredPositions}
				columns={positionColumns}
				defaultSort={[{ id: 'positionValue', desc: true }]}
				pageSize={15}
			/>

			{filteredOpenOrders.length > 0 ? (
				<DataTable
					title="Open Orders"
					data={filteredOpenOrders}
					columns={openOrderColumns}
					defaultSort={[{ id: 'timestamp', desc: true }]}
					pageSize={10}
				/>
			) : null}

			{filteredFundingEvents.length > 0 ? (
				<DataTable
					title={`Funding Events (${fundingWindow})`}
					data={filteredFundingEvents}
					columns={[
						{
							header: 'Time',
							accessorKey: 'time',
							cell: ({ getValue }) => new Date(getValue<number>()).toLocaleString(),
							size: 160
						},
						{ header: 'Vault', accessorKey: 'vault', size: 70 },
						{ header: 'Coin', accessorKey: 'coin', size: 80 },
						{
							header: 'Rate',
							accessorKey: 'fundingRate',
							cell: ({ getValue }) => `${(getValue<number>() * 100).toFixed(4)}%`,
							meta: { align: 'end' as const },
							size: 90
						},
						{
							header: 'Szi',
							accessorKey: 'szi',
							cell: ({ getValue }) => formattedNum(getValue<number>()),
							meta: { align: 'end' as const },
							size: 90
						},
						{
							header: 'USDC',
							accessorKey: 'usdc',
							cell: ({ getValue }) => <PnlCell value={getValue<number>()} />,
							meta: { align: 'end' as const },
							size: 110
						},
						{
							header: 'Hash',
							accessorKey: 'hash',
							cell: ({ getValue }) => {
								const value = getValue<string>()
								return `${value.slice(0, 8)}...${value.slice(-6)}`
							},
							size: 150
						}
					]}
					defaultSort={[{ id: 'time', desc: true }]}
					pageSize={10}
				/>
			) : null}

			{filteredFills.length > 0 ? (
				<DataTable
					title="Recent HLP Fills"
					data={filteredFills}
					columns={fillColumns}
					defaultSort={[{ id: 'time', desc: true }]}
					pageSize={12}
				/>
			) : null}
		</div>
	)
}
