import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import { useMapleActivePools, parseWad } from './api'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

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
	name: string
	asset: string
	tvlUsd: number
	spotApy: number
	numOpenTermLoans: number
	principalOut: number
	unrealizedLosses: number
}

const poolColumns: ColumnDef<PoolRow>[] = [
	{ header: 'Pool', accessorKey: 'name', size: 260 },
	{ header: 'Asset', accessorKey: 'asset', size: 80 },
	{
		header: 'TVL',
		accessorKey: 'tvlUsd',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'Spot APY',
		accessorKey: 'spotApy',
		cell: ({ getValue }) => formatPct(getValue<number>()),
		meta: { align: 'end' as const },
		size: 100
	},
	{ header: 'Open Loans', accessorKey: 'numOpenTermLoans', meta: { align: 'end' as const }, size: 100 },
	{
		header: 'Unrealized Losses',
		accessorKey: 'unrealizedLosses',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 150
	}
]

function PoolsTable({ data }: { data: PoolRow[] }) {
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
			<h3 className="mb-3 text-sm font-medium text-(--text-label)">Active Pools</h3>
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

export default function PoolsOverview() {
	const { pools, isLoading } = useMapleActivePools()

	const poolRows = useMemo<PoolRow[]>(() => {
		return pools
			.map((p) => ({
				name: p.name,
				asset: p.asset.symbol,
				tvlUsd: parseFloat(p.tvlUsd),
				spotApy: parseWad(p.spotApy),
				numOpenTermLoans: parseInt(p.numOpenTermLoans),
				principalOut: parseFloat(p.loanManager.principalOut),
				unrealizedLosses: parseFloat(p.unrealizedLosses)
			}))
			.sort((a, b) => b.tvlUsd - a.tvlUsd)
	}, [pools])

	const kpis = useMemo(() => {
		if (isLoading || pools.length === 0) return null

		const totalTvl = poolRows.reduce((s, p) => s + p.tvlUsd, 0)
		const totalLoans = poolRows.reduce((s, p) => s + p.numOpenTermLoans, 0)
		const weightedApySum = poolRows.reduce((s, p) => s + p.spotApy * p.tvlUsd, 0)
		const avgApy = totalTvl > 0 ? weightedApySum / totalTvl : 0

		return {
			totalTvl: formattedNum(totalTvl, true),
			activePools: pools.length,
			totalLoans,
			avgApy: `${avgApy.toFixed(2)}%`
		}
	}, [pools, poolRows, isLoading])

	const tvlChartData = useMemo(() => {
		return poolRows
			.filter((p) => p.tvlUsd >= 10000)
			.map((p) => ({ name: p.name, TVL: p.tvlUsd }))
	}, [poolRows])

	const apyChartData = useMemo(() => {
		return poolRows
			.filter((p) => p.spotApy > 0)
			.sort((a, b) => b.spotApy - a.spotApy)
			.map((p) => ({ name: p.name, 'Spot APY': p.spotApy }))
	}, [poolRows])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
				{kpis ? (
					<>
						<KpiCard label="Total TVL" value={kpis.totalTvl} />
						<KpiCard label="Active Pools" value={kpis.activePools} />
						<KpiCard label="Total Active Loans" value={kpis.totalLoans} />
						<KpiCard label="Avg Pool APY" value={kpis.avgApy} />
					</>
				) : (
					<>
						<KpiSkeleton label="Total TVL" />
						<KpiSkeleton label="Active Pools" />
						<KpiSkeleton label="Total Active Loans" />
						<KpiSkeleton label="Avg Pool APY" />
					</>
				)}
			</div>

			{isLoading ? (
				<CardSkeleton title="TVL by Pool" />
			) : (
				<ChartCard title="TVL by Pool">
					<BarChart
						chartData={tvlChartData}
						stacks={{ TVL: 'a' }}
						stackColors={{ TVL: '#4FC3F7' }}
						valueSymbol="$"
						title=""
						height="400px"
					/>
				</ChartCard>
			)}

			{isLoading ? (
				<CardSkeleton title="Spot APY by Pool" />
			) : apyChartData.length > 0 ? (
				<ChartCard title="Spot APY by Pool">
					<BarChart
						chartData={apyChartData}
						stacks={{ 'Spot APY': 'a' }}
						stackColors={{ 'Spot APY': '#66BB6A' }}
						valueSymbol="%"
						title=""
						height="400px"
					/>
				</ChartCard>
			) : null}

			{isLoading ? <CardSkeleton title="Active Pools" /> : <PoolsTable data={poolRows} />}
		</div>
	)
}
