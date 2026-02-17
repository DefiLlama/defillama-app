import { getCoreRowModel, getPaginationRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, PaginationState, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IBarChartProps } from '~/components/ECharts/types'
import { VirtualTable } from '~/components/Table/Table'
import { formattedNum } from '~/utils'
import { useMapleActivePools, parseWad, parseFeeRate } from './api'
import { ChartCard, CardSkeleton, KpiCard, KpiSkeleton, Pagination, formatPct } from './shared'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

interface PoolRow {
	name: string
	asset: string
	tvlUsd: number
	spotApy: number
	numOpenTermLoans: number
	utilization: number
	numPositions: number
	feeRate: number
	openToPublic: boolean
	unrealizedLosses: number
}

const poolColumns: ColumnDef<PoolRow>[] = [
	{ header: 'Pool', accessorKey: 'name', size: 220 },
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
	{
		header: 'Utilization',
		accessorKey: 'utilization',
		cell: ({ getValue }) => formatPct(getValue<number>()),
		meta: { align: 'end' as const },
		size: 100
	},
	{
		header: 'Depositors',
		accessorKey: 'numPositions',
		cell: ({ getValue }) => formattedNum(getValue<number>(), false),
		meta: { align: 'end' as const },
		size: 100
	},
	{ header: 'Open Loans', accessorKey: 'numOpenTermLoans', meta: { align: 'end' as const }, size: 100 },
	{
		header: 'Fees',
		accessorKey: 'feeRate',
		cell: ({ getValue }) => formatPct(getValue<number>()),
		meta: { align: 'end' as const },
		size: 80
	},
	{
		header: 'Access',
		accessorKey: 'openToPublic',
		cell: ({ getValue }) => (getValue<boolean>() ? 'Public' : 'Permissioned'),
		size: 110
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

export default function PoolsOverview() {
	const { pools, isLoading } = useMapleActivePools()

	const poolRows = useMemo<PoolRow[]>(() => {
		return pools
			.map((p) => {
				const totalAssets = parseFloat(p.totalAssets)
				const principalOut = parseFloat(p.principalOut)
				const utilization = totalAssets > 0 ? (principalOut / totalAssets) * 100 : 0
				const delegateFee = parseFeeRate(p.delegateManagementFeeRate)
				const platformFee = parseFeeRate(p.platformManagementFeeRate)
				return {
					name: p.name,
					asset: p.asset.symbol,
					tvlUsd: parseFloat(p.tvlUsd),
					spotApy: parseWad(p.spotApy, 28),
					numOpenTermLoans: parseInt(p.numOpenTermLoans),
					utilization,
					numPositions: parseInt(p.numPositions),
					feeRate: delegateFee + platformFee,
					openToPublic: p.openToPublic,
					unrealizedLosses: parseFloat(p.unrealizedLosses)
				}
			})
			.sort((a, b) => b.tvlUsd - a.tvlUsd)
	}, [pools])

	const kpis = useMemo(() => {
		if (isLoading || pools.length === 0) return null

		const totalTvl = poolRows.reduce((s, p) => s + p.tvlUsd, 0)
		const totalDepositors = poolRows.reduce((s, p) => s + p.numPositions, 0)
		const weightedApySum = poolRows.reduce((s, p) => s + p.spotApy * p.tvlUsd, 0)
		const avgApy = totalTvl > 0 ? weightedApySum / totalTvl : 0
		const weightedUtilSum = poolRows.reduce((s, p) => s + p.utilization * p.tvlUsd, 0)
		const avgUtil = totalTvl > 0 ? weightedUtilSum / totalTvl : 0

		return {
			totalTvl: formattedNum(totalTvl, true),
			activePools: pools.length,
			totalDepositors: formattedNum(totalDepositors, false),
			avgApy: `${avgApy.toFixed(2)}%`,
			avgUtil: `${avgUtil.toFixed(1)}%`
		}
	}, [pools, poolRows, isLoading])

	const tvlChartData = useMemo(() => {
		return poolRows
			.filter((p) => p.tvlUsd >= 10000)
			.map((p) => ({ name: p.name, TVL: p.tvlUsd }))
	}, [poolRows])

	const utilizationChartData = useMemo(() => {
		return poolRows
			.filter((p) => p.tvlUsd >= 10000 && p.utilization > 0)
			.sort((a, b) => b.utilization - a.utilization)
			.map((p) => ({ name: p.name, Utilization: p.utilization }))
	}, [poolRows])

	const apyChartData = useMemo(() => {
		return poolRows
			.filter((p) => p.spotApy > 0)
			.sort((a, b) => b.spotApy - a.spotApy)
			.map((p) => ({ name: p.name, 'Spot APY': p.spotApy }))
	}, [poolRows])

	return (
		<div className="flex flex-col gap-4">
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
				{kpis ? (
					<>
						<KpiCard label="Total TVL" value={kpis.totalTvl} />
						<KpiCard label="Active Pools" value={kpis.activePools} />
						<KpiCard label="Total Depositors" value={kpis.totalDepositors} />
						<KpiCard label="Avg Pool APY" value={kpis.avgApy} />
						<KpiCard label="Avg Utilization" value={kpis.avgUtil} />
					</>
				) : (
					<>
						<KpiSkeleton label="Total TVL" />
						<KpiSkeleton label="Active Pools" />
						<KpiSkeleton label="Total Depositors" />
						<KpiSkeleton label="Avg Pool APY" />
						<KpiSkeleton label="Avg Utilization" />
					</>
				)}
			</div>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
							xAxisType="category"
						/>
					</ChartCard>
				)}

				{isLoading ? (
					<CardSkeleton title="Pool Utilization" />
				) : utilizationChartData.length > 0 ? (
					<ChartCard title="Pool Utilization">
						<BarChart
							chartData={utilizationChartData}
							stacks={{ Utilization: 'a' }}
							stackColors={{ Utilization: '#AB47BC' }}
							valueSymbol="%"
							title=""
							height="400px"
							xAxisType="category"
						/>
					</ChartCard>
				) : null}
			</div>

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
						xAxisType="category"
					/>
				</ChartCard>
			) : null}

			{isLoading ? <CardSkeleton title="Active Pools" /> : <PoolsTable data={poolRows} />}
		</div>
	)
}
