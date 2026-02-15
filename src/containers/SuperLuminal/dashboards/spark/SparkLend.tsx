import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import {
	useSparklendBorrowedChart,
	useSparklendChainBreakdown,
	useSparklendFeesCharts,
	useSparklendMetrics,
	useSparklendTvlChart,
	useSparklendYieldPools
} from './sparklendApi'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			{children}
		</div>
	)
}

function CardSkeleton({ title }: { title: string }) {
	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">{title}</h3>
			<div className="flex h-[400px] items-center justify-center">
				<div className="h-5 w-5 animate-spin rounded-full border-2 border-(--text-disabled) border-t-transparent" />
			</div>
		</div>
	)
}

function KpiCard({ label, value }: { label: string; value: string | number | null }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<span className="text-2xl font-semibold text-(--text-primary)">{value ?? '—'}</span>
		</div>
	)
}

function KpiSkeleton({ label }: { label: string }) {
	return (
		<div className="flex flex-col gap-1 rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<span className="text-xs font-medium tracking-wide text-(--text-label)">{label}</span>
			<div className="h-8 w-24 animate-pulse rounded bg-(--text-disabled) opacity-20" />
		</div>
	)
}

const formatPct = (v: number | null) => (v != null ? `${v.toFixed(2)}%` : '—')

interface PoolRow {
	symbol: string
	chain: string
	tvlUsd: number
	apy: number | null
	apyBase: number | null
	apyReward: number | null
	poolMeta: string | null
}

const poolColumns: ColumnDef<PoolRow>[] = [
	{
		header: 'Pool',
		accessorKey: 'symbol',
		cell: ({ row }) => {
			const meta = row.original.poolMeta
			return meta ? `${row.original.symbol} (${meta})` : row.original.symbol
		},
		size: 200
	},
	{ header: 'Chain', accessorKey: 'chain', size: 120 },
	{
		header: 'TVL',
		accessorKey: 'tvlUsd',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'APY',
		accessorKey: 'apy',
		cell: ({ getValue }) => formatPct(getValue<number | null>()),
		meta: { align: 'end' as const },
		size: 100
	},
	{
		header: 'Base APY',
		accessorKey: 'apyBase',
		cell: ({ getValue }) => formatPct(getValue<number | null>()),
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Reward APY',
		accessorKey: 'apyReward',
		cell: ({ getValue }) => formatPct(getValue<number | null>()),
		meta: { align: 'end' as const },
		size: 120
	}
]

function YieldPoolsTable({ data }: { data: PoolRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'tvlUsd', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 15 })

	const instance = useReactTable({
		data,
		columns: poolColumns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	if (data.length === 0) return null

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Yield Pools</h3>
			<VirtualTable instance={instance} skipVirtualization />
			{data.length > 15 && <Pagination table={instance} />}
		</div>
	)
}

function Pagination({ table }: { table: ReturnType<typeof useReactTable<PoolRow>> }) {
	const { pageIndex, pageSize } = table.getState().pagination
	const total = table.getFilteredRowModel().rows.length

	return (
		<div className="mt-2 flex items-center justify-between text-xs text-(--text-label)">
			<span>
				{pageIndex * pageSize + 1}–{Math.min((pageIndex + 1) * pageSize, total)} of {total}
			</span>
			<div className="flex gap-2">
				<button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()} className="disabled:opacity-30">
					← Prev
				</button>
				<button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()} className="disabled:opacity-30">
					Next →
				</button>
			</div>
		</div>
	)
}

export default function SparkLend() {
	const { fees, revenue, supplySideRevenue, isLoading: metricsLoading } = useSparklendMetrics()
	const { tvlChart, inflowsChart, isLoading: tvlLoading } = useSparklendTvlChart()
	const { borrowedChart, currentBorrowed, isLoading: borrowedLoading } = useSparklendBorrowedChart()
	const { feesChart, revenueChart, supplySideRevenueChart, isLoading: feesLoading } = useSparklendFeesCharts()
	const { pools, isLoading: poolsLoading } = useSparklendYieldPools()
	const {
		tvlByChain,
		tvlByChainStacks,
		feesByChain,
		feesByChainStacks,
		isLoading: breakdownLoading
	} = useSparklendChainBreakdown()

	const kpis = useMemo(() => {
		if (metricsLoading || tvlLoading || borrowedLoading) return null

		const prevTvl = tvlChart.length >= 2 ? tvlChart[tvlChart.length - 2].TVL : null

		return {
			tvl: prevTvl != null ? formattedNum(prevTvl, true) : '—',
			borrowed: currentBorrowed != null ? formattedNum(currentBorrowed, true) : '—',
			fees24h: fees?.total48hto24h != null ? formattedNum(fees.total48hto24h, true) : '—',
			revenue24h: revenue?.total48hto24h != null ? formattedNum(revenue.total48hto24h, true) : '—',
			supplySideRevenue24h:
				supplySideRevenue?.total48hto24h != null ? formattedNum(supplySideRevenue.total48hto24h, true) : '—'
		}
	}, [fees, revenue, supplySideRevenue, tvlChart, currentBorrowed, metricsLoading, tvlLoading, borrowedLoading])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
				{kpis ? (
					<>
						<KpiCard label="TVL" value={kpis.tvl} />
						<KpiCard label="Total Borrowed" value={kpis.borrowed} />
						<KpiCard label="Fees (24h)" value={kpis.fees24h} />
						<KpiCard label="Revenue (24h)" value={kpis.revenue24h} />
						<KpiCard label="Supply Side Rev (24h)" value={kpis.supplySideRevenue24h} />
					</>
				) : (
					<>
						<KpiSkeleton label="TVL" />
						<KpiSkeleton label="Total Borrowed" />
						<KpiSkeleton label="Fees (24h)" />
						<KpiSkeleton label="Revenue (24h)" />
						<KpiSkeleton label="Supply Side Rev (24h)" />
					</>
				)}
			</div>

			{tvlLoading ? (
				<CardSkeleton title="TVL" />
			) : (
				<ChartCard title="TVL">
					<AreaChart chartData={tvlChart} stacks={['TVL']} valueSymbol="$" title="" height="400px" />
				</ChartCard>
			)}

			{breakdownLoading ? (
				<CardSkeleton title="TVL by Chain" />
			) : tvlByChainStacks.length > 0 ? (
				<ChartCard title="TVL by Chain">
					<AreaChart
						chartData={tvlByChain}
						stacks={tvlByChainStacks}
						valueSymbol="$"
						title=""
						height="400px"
						isStackedChart
					/>
				</ChartCard>
			) : null}

			{borrowedLoading ? (
				<CardSkeleton title="Total Borrowed" />
			) : (
				<ChartCard title="Total Borrowed">
					<AreaChart
						chartData={borrowedChart}
						stacks={['Borrowed']}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{feesLoading ? (
				<CardSkeleton title="Fees" />
			) : (
				<ChartCard title="Fees">
					<BarChart
						chartData={feesChart}
						stacks={{ Fees: 'a' }}
						stackColors={{ Fees: '#4FC3F7' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{breakdownLoading ? (
				<CardSkeleton title="Fees by Chain" />
			) : feesByChainStacks.length > 0 ? (
				<ChartCard title="Fees by Chain">
					<BarChart
						chartData={feesByChain}
						stacks={Object.fromEntries(feesByChainStacks.map((s) => [s, 'a']))}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			) : null}

			{feesLoading ? (
				<CardSkeleton title="Revenue" />
			) : (
				<ChartCard title="Revenue">
					<BarChart
						chartData={revenueChart}
						stacks={{ Revenue: 'a' }}
						stackColors={{ Revenue: '#66BB6A' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{feesLoading ? (
				<CardSkeleton title="Supply Side Revenue" />
			) : (
				<ChartCard title="Supply Side Revenue">
					<BarChart
						chartData={supplySideRevenueChart}
						stacks={{ 'Supply Side Revenue': 'a' }}
						stackColors={{ 'Supply Side Revenue': '#FFA726' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{tvlLoading ? (
				<CardSkeleton title="USD Inflows" />
			) : (
				<ChartCard title="USD Inflows">
					<BarChart
						chartData={inflowsChart}
						stacks={{ 'USD Inflows': 'a' }}
						stackColors={{ 'USD Inflows': '#AB47BC' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{poolsLoading ? <CardSkeleton title="Yield Pools" /> : <YieldPoolsTable data={pools} />}
		</div>
	)
}
