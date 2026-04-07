import { getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { lazy, useMemo, useState } from 'react'
import type { IChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import { useAaveGHOReserve, useAaveMarkets, useAaveAPYHistory, num, pct } from './api'
import type { TimeWindow } from './api'
import {
	InvestorsTable,
	PageLoader,
	CardSkeleton,
	KpiCard,
	MetricStrip,
	SectionHeader,
	WindowToggle,
	formatPct
} from './shared'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const GHO_TOKEN = '0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f'
const ETH_MAIN_MARKET = '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2'

const WINDOW_OPTIONS: { value: TimeWindow; label: string }[] = [
	{ value: 'LAST_WEEK', label: '1W' },
	{ value: 'LAST_MONTH', label: '1M' },
	{ value: 'LAST_SIX_MONTHS', label: '6M' },
	{ value: 'LAST_YEAR', label: '1Y' }
]

interface GHOMarketRow {
	market: string
	chain: string
	sizeUsd: number
	totalBorrowedUsd: number
	availableLiquidityUsd: number
	borrowApy: number
	utilization: number
}

const ghoMarketColumns: ColumnDef<GHOMarketRow>[] = [
	{ header: 'Chain', accessorKey: 'chain', size: 120 },
	{
		header: 'Market Size',
		accessorKey: 'sizeUsd',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'Total Borrowed',
		accessorKey: 'totalBorrowedUsd',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 140
	},
	{
		header: 'Available Liquidity',
		accessorKey: 'availableLiquidityUsd',
		cell: ({ getValue }) => formattedNum(getValue<number>(), true),
		meta: { align: 'end' as const },
		size: 150
	},
	{
		header: 'Borrow APY',
		accessorKey: 'borrowApy',
		cell: ({ getValue }) => formatPct(getValue<number>()),
		meta: { align: 'end' as const },
		size: 110
	},
	{
		header: 'Utilization',
		accessorKey: 'utilization',
		cell: ({ getValue }) => formatPct(getValue<number>()),
		meta: { align: 'end' as const },
		size: 110
	}
]

function GHOMarketsTable({ data }: { data: GHOMarketRow[] }) {
	const [sorting, setSorting] = useState<SortingState>([{ id: 'sizeUsd', desc: true }])

	const instance = useReactTable({
		data,
		columns: ghoMarketColumns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel()
	})

	if (data.length === 0) return null

	return (
		<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5">
			<SectionHeader title="GHO Across Markets" />
			<div className="mt-4">
				<InvestorsTable instance={instance} />
			</div>
		</div>
	)
}

export default function GHO() {
	const { reserve, isLoading: reserveLoading } = useAaveGHOReserve()
	const { reserves, isLoading: marketsLoading } = useAaveMarkets()
	const [selectedWindow, setSelectedWindow] = useState<TimeWindow>('LAST_SIX_MONTHS')

	const { chartData: borrowApyChart, isLoading: apyLoading } = useAaveAPYHistory(
		1,
		ETH_MAIN_MARKET,
		GHO_TOKEN,
		selectedWindow,
		'borrow'
	)

	const borrowAreaData = useMemo(
		() => borrowApyChart.map((d) => ({ date: d.date, 'Borrow APY': d.APY })),
		[borrowApyChart]
	)

	const ghoMarketRows = useMemo<GHOMarketRow[]>(
		() =>
			reserves
				.filter((r) => r.symbol === 'GHO')
				.map((r) => ({
					market: r.market,
					chain: r.chain,
					sizeUsd: r.sizeUsd,
					totalBorrowedUsd: r.totalBorrowedUsd,
					availableLiquidityUsd: r.availableLiquidityUsd,
					borrowApy: r.borrowApy ?? 0,
					utilization: r.utilization ?? 0
				})),
		[reserves]
	)

	const aggregated = useMemo(() => {
		if (ghoMarketRows.length === 0) return null
		return {
			totalSize: ghoMarketRows.reduce((s, r) => s + r.sizeUsd, 0),
			totalBorrowed: ghoMarketRows.reduce((s, r) => s + r.totalBorrowedUsd, 0),
			totalLiquidity: ghoMarketRows.reduce((s, r) => s + r.availableLiquidityUsd, 0),
			marketsCount: ghoMarketRows.length
		}
	}, [ghoMarketRows])

	const kpis = useMemo(() => {
		if (!reserve) return null
		const bi = reserve.borrowInfo
		return {
			totalSize: aggregated ? formattedNum(aggregated.totalSize, true) : formattedNum(num(reserve.size?.usd), true),
			totalBorrowed: aggregated
				? formattedNum(aggregated.totalBorrowed, true)
				: formattedNum(num(bi?.total?.usd), true),
			availableLiquidity: aggregated
				? formattedNum(aggregated.totalLiquidity, true)
				: formattedNum(num(bi?.availableLiquidity?.usd), true),
			borrowApy: formatPct(pct(bi?.apy?.value)),
			utilization: formatPct(pct(bi?.utilizationRate?.value)),
			borrowCap: formattedNum(num(bi?.borrowCap?.usd), true),
			markets: aggregated?.marketsCount ?? 1
		}
	}, [reserve, aggregated])

	if (reserveLoading || marketsLoading) return <PageLoader />

	return (
		<div className="flex flex-col gap-6">
			{kpis && (
				<MetricStrip>
					<KpiCard label="Total GHO Size" value={kpis.totalSize} />
					<KpiCard label="Total Borrowed" value={kpis.totalBorrowed} />
					<KpiCard label="Available Liquidity" value={kpis.availableLiquidity} />
					<KpiCard label="Borrow APY (Main)" value={kpis.borrowApy} />
					<KpiCard label="Utilization (Main)" value={kpis.utilization} />
					<KpiCard label="Borrow Cap (Main)" value={kpis.borrowCap} />
					<KpiCard label="Markets" value={kpis.markets} />
				</MetricStrip>
			)}

			{/* Chart section with inline time window toggle */}
			<div>
				<div className="mb-4 flex items-center justify-between">
					<SectionHeader title="GHO Borrow APY History" />
					<WindowToggle
						options={WINDOW_OPTIONS}
						value={selectedWindow}
						onChange={(v) => setSelectedWindow(v as TimeWindow)}
					/>
				</div>

				{apyLoading ? (
					<CardSkeleton title="" />
				) : borrowAreaData.length > 0 ? (
					<div className="rounded-lg border border-(--cards-border) bg-(--cards-bg) p-5">
						<AreaChart
							chartData={borrowAreaData}
							stacks={['Borrow APY']}
							stackColors={{ 'Borrow APY': '#AB47BC' }}
							valueSymbol="%"
							title=""
							height="400px"
						/>
					</div>
				) : (
					<CardSkeleton title="" />
				)}
			</div>

			<GHOMarketsTable data={ghoMarketRows} />
		</div>
	)
}
