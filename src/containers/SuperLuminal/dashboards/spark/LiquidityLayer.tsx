import {
	getCoreRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type PaginationState,
	type SortingState,
	useReactTable
} from '@tanstack/react-table'
import type { ColumnDef } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import {
	type SparklendDailyRow,
	useSLLActualRevenue,
	useSLLActualRevenueDaily,
	useSLLAllocatedAssets,
	useSLLRevenueProjection,
	useSLLSparklendDaily
} from './api'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>
const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const PAGE_SIZE = 15

const SCROLL_LEGEND = {
	legend: { type: 'scroll' as const, orient: 'horizontal' as const, top: 0 }
}

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

const sparklendColumns: ColumnDef<SparklendDailyRow>[] = [
	{ accessorKey: 'dt', header: 'Date', cell: ({ getValue }) => getValue<string>() },
	{ accessorKey: 'protocol-token', header: 'Protocol-Token' },
	{
		accessorKey: 'alm_supply_amount',
		header: 'ALM Supply',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true)
	},
	{
		accessorKey: 'utilization',
		header: 'Utilization',
		cell: ({ getValue }) => `${(getValue<number>() * 100).toFixed(2)}%`
	},
	{
		accessorKey: 'borrow_rate_apr',
		header: 'Borrow Rate',
		cell: ({ getValue }) => `${(getValue<number>() * 100).toFixed(2)}%`
	},
	{
		accessorKey: 'gross_yield_usd',
		header: 'Gross Yield',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true)
	},
	{
		accessorKey: 'borrow_cost_usd',
		header: 'Borrow Cost',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true)
	},
	{
		accessorKey: 'saving_V2_borrow_cost_usd',
		header: 'Saving V2 Cost',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true)
	},
	{
		accessorKey: 'revenue_usd',
		header: 'Revenue',
		cell: ({ getValue }) => {
			const v = getValue<number>()
			return <span className={v < 0 ? 'text-red-500' : 'text-green-500'}>{formattedNum(v, true)}</span>
		}
	}
]

function SparklendTable({ data }: { data: SparklendDailyRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'dt', desc: true }])
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: PAGE_SIZE })

	const instance = useReactTable({
		data,
		columns: sparklendColumns,
		state: { sorting, pagination },
		onSortingChange: setSorting,
		onPaginationChange: setPagination,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel()
	})

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-4">
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Sparklend Daily Revenue</h3>
			<VirtualTable instance={instance} skipVirtualization />
			<Pagination table={instance} />
		</div>
	)
}

function makeStacks(tokens: string[]): Record<string, string> {
	const s: Record<string, string> = {}
	for (const t of tokens) s[t] = 'a'
	return s
}

export default function LiquidityLayer() {
	const {
		revenueByProtocol,
		yieldVsCost,
		protocolTokens: revTokens,
		colors: revColors,
		isLoading: revLoading
	} = useSLLActualRevenue()
	const {
		projectionByProtocol,
		protocolTokens: projTokens,
		colors: projColors,
		isLoading: projLoading
	} = useSLLRevenueProjection()
	const {
		balanceByProtocol,
		protocolTokens: balTokens,
		colors: balColors,
		isLoading: balLoading
	} = useSLLAllocatedAssets()
	const {
		revenueByProtocol: dailyRevenueByProtocol,
		protocolTokens: dailyRevTokens,
		colors: dailyRevColors,
		isLoading: dailyRevLoading
	} = useSLLActualRevenueDaily()
	const { rows: sparklendRows, isLoading: sparklendLoading } = useSLLSparklendDaily()

	const revStacks = useMemo(() => makeStacks(revTokens), [revTokens])
	const projStacks = useMemo(() => makeStacks(projTokens), [projTokens])
	const dailyRevStacks = useMemo(() => makeStacks(dailyRevTokens), [dailyRevTokens])

	const yieldCostStacks: Record<string, string> = {
		'Gross Yield': 'a',
		'Sky Borrow Cost': 'b',
		'Saving V2 Borrow Cost': 'b'
	}

	const yieldCostColors: Record<string, string> = {
		'Gross Yield': '#4CAF50',
		'Sky Borrow Cost': '#E91E63',
		'Saving V2 Borrow Cost': '#FF9800'
	}

	const kpis = useMemo(() => {
		if (!revenueByProtocol.length) return null
		const latest = revenueByProtocol[revenueByProtocol.length - 1]
		const totalRev = Object.entries(latest).reduce((sum, [k, v]) => (k !== 'date' ? sum + v : sum), 0)

		const latestYield = yieldVsCost.length ? yieldVsCost[yieldVsCost.length - 1] : null
		const totalBalance = balanceByProtocol.length
			? Object.entries(balanceByProtocol[balanceByProtocol.length - 1]).reduce(
					(sum, [k, v]) => (k !== 'date' ? sum + v : sum),
					0
				)
			: 0

		return {
			latestNetRevenue: formattedNum(totalRev, true),
			latestGrossYield: latestYield ? formattedNum(latestYield['Gross Yield'], true) : '—',
			totalAllocated: formattedNum(totalBalance, true)
		}
	}, [revenueByProtocol, yieldVsCost, balanceByProtocol])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
				{kpis ? (
					<>
						<KpiCard label="Latest Month Net Revenue" value={kpis.latestNetRevenue} />
						<KpiCard label="Latest Month Gross Yield" value={kpis.latestGrossYield} />
						<KpiCard label="Total Allocated Assets" value={kpis.totalAllocated} />
					</>
				) : (
					<>
						<KpiSkeleton label="Latest Month Net Revenue" />
						<KpiSkeleton label="Latest Month Gross Yield" />
						<KpiSkeleton label="Total Allocated Assets" />
					</>
				)}
			</div>

			{revLoading ? (
				<CardSkeleton title="SLL Net Revenue by Protocol (Monthly)" />
			) : (
				<ChartCard title="SLL Net Revenue by Protocol (Monthly)">
					<BarChart
						chartData={revenueByProtocol}
						stacks={revStacks}
						stackColors={revColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{dailyRevLoading ? (
				<CardSkeleton title="SLL Net Revenue by Protocol (Daily)" />
			) : (
				<ChartCard title="SLL Net Revenue by Protocol (Daily)">
					<BarChart
						chartData={dailyRevenueByProtocol}
						stacks={dailyRevStacks}
						stackColors={dailyRevColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{revLoading ? (
				<CardSkeleton title="Gross Yield vs Borrow Costs (Monthly)" />
			) : (
				<ChartCard title="Gross Yield vs Borrow Costs (Monthly)">
					<BarChart
						chartData={yieldVsCost}
						stacks={yieldCostStacks}
						stackColors={yieldCostColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{projLoading ? (
				<CardSkeleton title="SLL Revenue Projection by Protocol (Monthly)" />
			) : (
				<ChartCard title="SLL Revenue Projection by Protocol (Monthly)">
					<BarChart
						chartData={projectionByProtocol}
						stacks={projStacks}
						stackColors={projColors}
						valueSymbol="$"
						title=""
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{balLoading ? (
				<CardSkeleton title="SLL Allocated Assets Balance (Daily)" />
			) : (
				<ChartCard title="SLL Allocated Assets Balance (Daily)">
					<AreaChart
						chartData={balanceByProtocol}
						stacks={balTokens}
						stackColors={balColors}
						valueSymbol="$"
						title=""
						isStackedChart={true}
						hideGradient={true}
						height="400px"
						chartOptions={SCROLL_LEGEND}
					/>
				</ChartCard>
			)}

			{sparklendLoading ? (
				<CardSkeleton title="Sparklend Daily Revenue" />
			) : (
				<SparklendTable data={sparklendRows} />
			)}
		</div>
	)
}
