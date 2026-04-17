import * as Ariakit from '@ariakit/react'
import { matchSorter } from 'match-sorter'
import { useRouter } from 'next/router'
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useBlockExplorers } from '~/api/client'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { CopyHelper } from '~/components/Copy'
import type {
	IMultiSeriesChart2Props,
	IPieChartProps,
	MultiSeriesChart2Dataset,
	MultiSeriesChart2SeriesConfig
} from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { CHART_COLORS } from '~/constants/colors'
import type { YieldsChartConfig, YieldChartType } from '~/containers/ProDashboard/types'
import {
	useYieldChartData,
	useYieldChartLendBorrow,
	useYieldConfigData,
	useYieldPoolData,
	useVolatility,
	useHolderHistory,
	useHolderStats,
	useYieldTokenPrices
} from '~/containers/Yields/queries/client'
import type { Top10Holder } from '~/containers/Yields/queries/holderTypes'
import {
	computeHolderChanges,
	type BalanceFlowSummary,
	type HolderChangeStatus,
	type HolderFlowSummary,
	type HolderWithChange
} from '~/containers/Yields/queries/holderUtils'
import { StabilityCell } from '~/containers/Yields/Tables/StabilityCell'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { getBlockExplorerNew } from '~/utils/blockExplorers'
import { toDimensionsSlug } from '~/utils/chainNormalizer'
import { pushShallowQuery } from '~/utils/routerQuery'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const EMPTY_CHART_DATA: any[] = []

const BASE_REWARD_BAR_CHARTS: IMultiSeriesChart2Props['charts'] = [
	{ type: 'bar', name: 'Base', encode: { x: 'timestamp', y: 'Base' }, stack: 'a', color: CHART_COLORS[0] },
	{ type: 'bar', name: 'Reward', encode: { x: 'timestamp', y: 'Reward' }, stack: 'a', color: CHART_COLORS[1] }
]

const SINGLE_APY_LINE_CHARTS: IMultiSeriesChart2Props['charts'] = [
	{ type: 'line', name: 'APY', encode: { x: 'timestamp', y: 'APY' }, color: CHART_COLORS[0] }
]

type YieldMetricDef = {
	queryKey: string
	defaultOn: boolean
	needsBorrow: boolean
	chart: MultiSeriesChart2SeriesConfig
}

const YIELD_METRIC_DEFS: Record<string, YieldMetricDef> = {
	APY: {
		queryKey: 'apy',
		defaultOn: true,
		needsBorrow: false,
		chart: {
			type: 'line',
			name: 'APY',
			encode: { x: 'timestamp', y: 'APY' },
			color: '#fd3c99',
			yAxisIndex: 0,
			valueSymbol: '%'
		}
	},
	TVL: {
		queryKey: 'tvl',
		defaultOn: true,
		needsBorrow: false,
		chart: {
			type: 'line',
			name: 'TVL',
			encode: { x: 'timestamp', y: 'TVL' },
			color: '#4f8fea',
			yAxisIndex: 1,
			valueSymbol: '$'
		}
	},
	'TVL Change': {
		queryKey: 'tvlChange',
		defaultOn: false,
		needsBorrow: false,
		chart: {
			type: 'bar',
			name: 'TVL Change',
			encode: { x: 'timestamp', y: 'TVL Change' },
			color: '#14b8a6',
			yAxisIndex: 1,
			valueSymbol: '$'
		}
	},
	'Supply APY Base': {
		queryKey: 'supplyApyBase',
		defaultOn: false,
		needsBorrow: false,
		chart: {
			type: 'bar',
			name: 'Supply APY Base',
			encode: { x: 'timestamp', y: 'Supply APY Base' },
			stack: 'supplyApy',
			color: '#f59e0b',
			yAxisIndex: 0,
			valueSymbol: '%'
		}
	},
	'Supply APY Reward': {
		queryKey: 'supplyApyReward',
		defaultOn: false,
		needsBorrow: false,
		chart: {
			type: 'bar',
			name: 'Supply APY Reward',
			encode: { x: 'timestamp', y: 'Supply APY Reward' },
			stack: 'supplyApy',
			color: '#22c55e',
			yAxisIndex: 0,
			valueSymbol: '%'
		}
	},
	'Net Borrow APY': {
		queryKey: 'netBorrowApy',
		defaultOn: false,
		needsBorrow: true,
		chart: {
			type: 'line',
			name: 'Net Borrow APY',
			encode: { x: 'timestamp', y: 'Net Borrow APY' },
			color: '#eab308',
			yAxisIndex: 0,
			valueSymbol: '%'
		}
	},
	'Utilization Rate': {
		queryKey: 'utilization',
		defaultOn: false,
		needsBorrow: true,
		chart: {
			type: 'line',
			name: 'Utilization Rate',
			encode: { x: 'timestamp', y: 'Utilization Rate' },
			color: '#ef4444',
			yAxisIndex: 0,
			valueSymbol: '%'
		}
	},
	Supplied: {
		queryKey: 'supplied',
		defaultOn: false,
		needsBorrow: true,
		chart: {
			type: 'line',
			name: 'Supplied',
			encode: { x: 'timestamp', y: 'Supplied' },
			color: '#06b6d4',
			yAxisIndex: 1,
			valueSymbol: '$'
		}
	},
	Borrowed: {
		queryKey: 'borrowed',
		defaultOn: false,
		needsBorrow: true,
		chart: {
			type: 'line',
			name: 'Borrowed',
			encode: { x: 'timestamp', y: 'Borrowed' },
			color: '#ec4899',
			yAxisIndex: 1,
			valueSymbol: '$'
		}
	},
	Available: {
		queryKey: 'available',
		defaultOn: false,
		needsBorrow: true,
		chart: {
			type: 'line',
			name: 'Available',
			encode: { x: 'timestamp', y: 'Available' },
			color: '#84cc16',
			yAxisIndex: 1,
			valueSymbol: '$'
		}
	}
}

const PRICE_CHART_COLORS = ['#a855f7', '#f97316', '#06b6d4', '#84cc16']

const HOLDER_DONUT_RADIUS: [string, string] = ['45%', '75%']

// Donut chart + table color palette
const HOLDER_COLORS = [
	'#5470c6',
	'#91cc75',
	'#fac858',
	'#ee6666',
	'#73c0de',
	'#3ba272',
	'#fc8452',
	'#9a60b4',
	'#ea7ccc',
	'#4dc9f6',
	'#a0d911' // "Others" slice
]

function truncateAddress(addr: string): string {
	if (!addr || addr.length < 12) return addr
	return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

function ShareBadge({ status, change }: { status: HolderChangeStatus; change: number | null }) {
	switch (status) {
		case 'accumulating':
			return (
				<span className="inline-flex items-center gap-1 text-xs text-(--success)">
					<span>▲</span>
					<span className="tabular-nums">+{change!.toFixed(1)}%</span>
				</span>
			)
		case 'reducing':
			return (
				<span className="inline-flex items-center gap-1 text-xs text-(--error)">
					<span>▼</span>
					<span className="tabular-nums">{change!.toFixed(1)}%</span>
				</span>
			)
		case 'new':
			return (
				<span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">
					Entered Top 10
				</span>
			)
		case 'steady':
			return <span className="text-xs text-(--text-disabled)">Steady</span>
		case 'unknown':
		default:
			return <span className="text-xs text-(--text-disabled)">{'\u2014'}</span>
	}
}

function BalanceBadge({ status, change }: { status: HolderChangeStatus; change: number | null }) {
	switch (status) {
		case 'accumulating':
			return (
				<span className="inline-flex items-center gap-1 text-xs text-(--success)">
					<span>▲</span>
					<span className="tabular-nums">+{change!.toFixed(1)}%</span>
				</span>
			)
		case 'reducing':
			return (
				<span className="inline-flex items-center gap-1 text-xs text-(--error)">
					<span>▼</span>
					<span className="tabular-nums">{change!.toFixed(1)}%</span>
				</span>
			)
		case 'new':
			return (
				<span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-blue-600 uppercase dark:text-blue-400">
					Entered Top 10
				</span>
			)
		case 'steady':
			return <span className="text-xs text-(--text-disabled)">Steady</span>
		case 'unknown':
		default:
			return <span className="text-xs text-(--text-disabled)">{'\u2014'}</span>
	}
}

function HolderFlowSummaryBar({
	summary,
	mode
}: {
	summary: HolderFlowSummary | BalanceFlowSummary
	mode: ChangeMode
}) {
	const total = summary.accumulating + summary.reducing + summary.newCount + summary.steady + summary.unknown
	if (total === 0 || summary.unknown === total) return null

	const isBalance = mode === 'balance'
	const segments = [
		{
			count: summary.accumulating,
			label: isBalance ? 'Accumulating' : 'Share Up',
			dotClass: 'bg-emerald-500',
			pillClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
		},
		{
			count: summary.newCount,
			label: 'Entered Top 10',
			dotClass: 'bg-blue-500',
			pillClass: 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
		},
		{
			count: summary.reducing,
			label: isBalance ? 'Reducing' : 'Share Down',
			dotClass: 'bg-red-500',
			pillClass: 'bg-red-500/10 text-red-600 dark:text-red-400'
		}
	].filter((s) => s.count > 0)

	return (
		<div className="flex flex-wrap items-center gap-1.5">
			{segments.map((seg) => (
				<span
					key={seg.label}
					className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${seg.pillClass}`}
				>
					<span className={`h-1.5 w-1.5 rounded-full ${seg.dotClass}`} />
					{seg.count} {seg.label}
				</span>
			))}
		</div>
	)
}

function ConcentrationRiskPanel({
	holders,
	holderCount,
	holderChange7d,
	holderChange30d,
	avgPositionUsd,
	tvlUsd
}: {
	holders: Top10Holder[] | null
	holderCount: number | null
	holderChange7d: number | null
	holderChange30d: number | null
	avgPositionUsd: number | null
	tvlUsd: number | null
}) {
	if (!holders?.length) return null

	const top1 = holders[0]?.balancePct ?? 0
	const top5 = holders.slice(0, 5).reduce((s, h) => s + h.balancePct, 0)
	const top10 = holders.reduce((s, h) => s + h.balancePct, 0)

	const exposureTiers = [
		{ label: 'Top 1', pct: top1 },
		{ label: 'Top 5', pct: top5 },
		{ label: 'Top 10', pct: top10 }
	]

	return (
		<div className="flex flex-col gap-4 p-3">
			<h4 className="text-sm font-semibold">Holder Insights</h4>

			{/* Dollar Exposure */}
			{tvlUsd != null ? (
				<div className="flex flex-col gap-2">
					<span className="text-xs text-(--text-disabled)">TVL Exposure</span>
					{exposureTiers.map((tier) => (
						<div key={tier.label} className="flex items-center justify-between text-xs">
							<span className="text-(--text-disabled)">{tier.label}</span>
							<span className="font-medium tabular-nums">{formattedNum((tier.pct / 100) * tvlUsd, true)}</span>
						</div>
					))}
				</div>
			) : null}

			{/* Holder Trend */}
			{holderCount != null ? (
				<div className="flex flex-col gap-2 rounded-md bg-(--cards-border)/30 p-2.5">
					<div className="flex items-center justify-between">
						<span className="text-xs text-(--text-disabled)">Total Holders</span>
						<span className="text-sm font-semibold tabular-nums">{holderCount.toLocaleString()}</span>
					</div>
					{holderChange7d != null ? (
						<div className="flex items-center justify-between text-xs">
							<span className="text-(--text-disabled)">7d change</span>
							<span
								className={`font-medium tabular-nums ${holderChange7d > 0 ? 'text-(--success)' : holderChange7d < 0 ? 'text-(--error)' : ''}`}
							>
								{holderChange7d > 0 ? '+' : ''}
								{holderChange7d.toLocaleString()}
							</span>
						</div>
					) : null}
					{holderChange30d != null ? (
						<div className="flex items-center justify-between text-xs">
							<span className="text-(--text-disabled)">30d change</span>
							<span
								className={`font-medium tabular-nums ${holderChange30d > 0 ? 'text-(--success)' : holderChange30d < 0 ? 'text-(--error)' : ''}`}
							>
								{holderChange30d > 0 ? '+' : ''}
								{holderChange30d.toLocaleString()}
							</span>
						</div>
					) : null}
				</div>
			) : null}

			{/* Avg Position */}
			{avgPositionUsd != null ? (
				<div className="flex flex-col gap-1 rounded-md bg-(--cards-border)/30 p-2.5">
					<span className="text-[11px] text-(--text-disabled)">Avg Position Size</span>
					<span className="text-lg font-semibold tabular-nums">{formattedNum(avgPositionUsd, true)}</span>
				</div>
			) : null}
		</div>
	)
}

type ChangeMode = 'balance' | 'share'

function formatTokenBalance(rawBalance: string, decimals: number | null): string {
	const num = parseFloat(rawBalance)
	if (!Number.isFinite(num)) return rawBalance
	const adjusted = decimals != null ? num / 10 ** decimals : num
	if (adjusted >= 1_000_000) return `${(adjusted / 1_000_000).toFixed(2)}M`
	if (adjusted >= 1_000) return `${(adjusted / 1_000).toFixed(2)}K`
	if (adjusted >= 1) return adjusted.toFixed(2)
	if (adjusted >= 0.0001) return adjusted.toFixed(4)
	return adjusted.toExponential(2)
}

function TopHoldersTable({
	holders,
	holders30d,
	summary,
	balanceSummary,
	tokenDecimals,
	chain,
	blockExplorersData,
	colors,
	hoveredIndex
}: {
	holders: HolderWithChange[]
	holders30d: HolderWithChange[]
	summary: HolderFlowSummary
	balanceSummary: BalanceFlowSummary
	tokenDecimals: number | null
	chain?: string
	blockExplorersData?: any
	colors: string[]
	hoveredIndex: number | null
}) {
	const [mode, setMode] = useState<ChangeMode>('share')
	const changes30dMap = useMemo(() => {
		const map = new Map<string, HolderWithChange>()
		for (const h of holders30d) {
			map.set(h.address.toLowerCase(), h)
		}
		return map
	}, [holders30d])
	if (!holders.length) return null

	const activeSummary = mode === 'balance' ? balanceSummary : summary

	return (
		<div>
			<div className="flex items-center justify-between border-b border-(--cards-border) px-2 py-1.5">
				<div className="flex rounded-md bg-(--cards-border)/40 p-0.5 text-[11px]">
					<button
						onClick={() => setMode('share')}
						className={`rounded px-2 py-0.5 font-medium transition-colors ${mode === 'share' ? 'bg-(--cards-bg) text-(--text-primary) shadow-sm' : 'text-(--text-disabled) hover:text-(--text-secondary)'}`}
					>
						Share
					</button>
					<button
						onClick={() => setMode('balance')}
						className={`rounded px-2 py-0.5 font-medium transition-colors ${mode === 'balance' ? 'bg-(--cards-bg) text-(--text-primary) shadow-sm' : 'text-(--text-disabled) hover:text-(--text-secondary)'}`}
					>
						Balance
					</button>
				</div>
				<HolderFlowSummaryBar summary={activeSummary} mode={mode} />
			</div>
			<table className="w-full text-sm">
				<colgroup>
					<col style={{ width: '40%' }} />
					<col style={{ width: '30%' }} />
					<col style={{ width: '15%' }} />
					<col style={{ width: '15%' }} />
				</colgroup>
				<thead>
					<tr className="border-b border-(--cards-border) text-left text-xs text-(--text-disabled)">
						<th className="py-2 pl-2 font-medium">Holder</th>
						<th className="py-2 text-right font-medium">{mode === 'balance' ? 'Balance' : 'Share'}</th>
						<th className="py-2 text-right font-medium">7d</th>
						<th className="py-2 pr-2 text-right font-medium">30d</th>
					</tr>
				</thead>
				<tbody>
					{holders.map((h, i) => {
						const explorer =
							blockExplorersData && chain
								? getBlockExplorerNew({
										apiResponse: blockExplorersData,
										address: h.address,
										chainName: chain,
										urlType: 'address'
									})
								: null
						const barColor = colors[i] ?? colors[colors.length - 1]
						const h30 = changes30dMap.get(h.address.toLowerCase())

						return (
							<tr key={h.address} className="border-b border-(--cards-border) last:border-b-0">
								<td className="py-1.5 pl-2">
									<div className="flex items-center gap-2">
										<span
											className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform duration-200"
											style={{
												backgroundColor: barColor,
												transform: hoveredIndex === i ? 'scale(1.5)' : 'scale(1)'
											}}
										/>
										<span className="w-4 shrink-0 text-(--text-disabled) tabular-nums">{i + 1}</span>
										{explorer?.url ? (
											<a
												href={explorer.url}
												target="_blank"
												rel="noopener noreferrer"
												className="font-mono text-xs text-(--link-text) hover:underline"
											>
												{truncateAddress(h.address)}
											</a>
										) : (
											<span className="font-mono text-xs">{truncateAddress(h.address)}</span>
										)}
										<CopyHelper toCopy={h.address} />
									</div>
								</td>
								<td className="py-1.5 text-right">
									{mode === 'share' ? (
										<div className="flex items-center justify-end gap-2">
											<span className="tabular-nums">{h.balancePct.toFixed(2)}%</span>
											<div className="h-1.5 w-16 overflow-hidden rounded-full bg-(--cards-border)">
												<div
													className="h-full rounded-full"
													style={{
														width: `${Math.min(h.balancePct, 100)}%`,
														backgroundColor: barColor
													}}
												/>
											</div>
										</div>
									) : (
										<span className="tabular-nums">{formatTokenBalance(h.balance, tokenDecimals)}</span>
									)}
								</td>
								<td className="py-1.5 text-right">
									{mode === 'balance' ? (
										<BalanceBadge status={h.balanceStatus} change={h.balanceChangePct} />
									) : (
										<ShareBadge status={h.status} change={h.balancePctChange} />
									)}
								</td>
								<td className="py-1.5 pr-2 text-right">
									{h30 ? (
										mode === 'balance' ? (
											<BalanceBadge status={h30.balanceStatus} change={h30.balanceChangePct} />
										) : (
											<ShareBadge status={h30.status} change={h30.balancePctChange} />
										)
									) : (
										<span className="text-xs text-(--text-disabled)">{'\u2014'}</span>
									)}
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}

const EMPTY_BASE_REWARD_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp', 'Base', 'Reward'] }
const EMPTY_APY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp', 'APY'] }
const EMPTY_LIQUIDITY_DATASET: MultiSeriesChart2Dataset = {
	source: [],
	dimensions: ['timestamp', 'Supplied', 'Borrowed', 'Available']
}

const PageView = (_props) => {
	const router = useRouter()
	const { query, isReady } = router
	const searchParams = useMemo(() => {
		const qs = router.asPath.split('?')[1]?.split('#')[0] ?? ''
		return new URLSearchParams(qs)
	}, [router.asPath])

	const { data: pool, isLoading: fetchingPoolData } = useYieldPoolData(query.pool)
	const poolData = pool?.data?.[0] ?? {}
	const poolName = poolData.poolMeta ? `${poolData.symbol} (${poolData.poolMeta})` : (poolData.symbol ?? '')

	const { chartInstance: tvlApyChartInstance, handleChartReady: handleTvlApyReady } = useGetChartInstance()

	const { chartInstance: supplyApyChartInstance, handleChartReady: handleSupplyApyReady } = useGetChartInstance()

	const { chartInstance: supplyApy7dChartInstance, handleChartReady: handleSupplyApy7dReady } = useGetChartInstance()

	const { chartInstance: borrowApyChartInstance, handleChartReady: handleBorrowApyReady } = useGetChartInstance()

	const { chartInstance: netBorrowApyChartInstance, handleChartReady: handleNetBorrowApyReady } = useGetChartInstance()

	const { chartInstance: poolLiquidityChartInstance, handleChartReady: handlePoolLiquidityReady } =
		useGetChartInstance()

	const [holderDonutHoveredIndex, setHolderDonutHoveredIndex] = useState<number | null>(null)
	const [holderDonutInstance, setHolderDonutInstance] = useState<import('echarts/core').ECharts | null>(null)

	useEffect(() => {
		if (!holderDonutInstance) return

		const onMouseover = (params: any) => {
			setHolderDonutHoveredIndex(params.dataIndex ?? null)
		}
		const onMouseout = () => {
			setHolderDonutHoveredIndex(null)
		}

		holderDonutInstance.on('mouseover', 'series.pie', onMouseover)
		holderDonutInstance.on('mouseout', 'series.pie', onMouseout)

		return () => {
			holderDonutInstance.off('mouseover', onMouseover)
			holderDonutInstance.off('mouseout', onMouseout)
		}
	}, [holderDonutInstance])

	const poolId = typeof query.pool === 'string' ? query.pool : null

	const { data: chart, isLoading: fetchingChartData } = useYieldChartData(poolId)

	const { data: chartBorrow, isLoading: fetchingChartDataBorrow } = useYieldChartLendBorrow(poolId)

	const { data: config, isLoading: fetchingConfigData } = useYieldConfigData(poolData.project ?? '')

	const { data: volatility } = useVolatility()
	const { data: holderHistory } = useHolderHistory(poolId)
	const { data: holderStatsMap } = useHolderStats(poolData.pool ? [poolData.pool] : undefined)
	const holderStats = poolData.pool ? holderStatsMap?.[poolData.pool] : null
	const { data: blockExplorersData } = useBlockExplorers()
	const holderChanges = useMemo(() => {
		return computeHolderChanges(holderStats?.top10Holders ?? null, holderHistory ?? null, 7)
	}, [holderStats?.top10Holders, holderHistory])
	const holderChanges30d = useMemo(() => {
		return computeHolderChanges(holderStats?.top10Holders ?? null, holderHistory ?? null, 30)
	}, [holderStats?.top10Holders, holderHistory])
	const poolConfigId = poolData.pool

	const priceMetrics = useMemo(() => {
		const tokens = poolData.underlyingTokens as string[] | undefined
		const symbols = (poolData.symbol as string)?.split('-') ?? []
		const chain = toDimensionsSlug(poolData.chain as string)
		if (!tokens?.length || !chain) return []

		return tokens
			.map((addr, i) => {
				if (!addr) return null
				const symbol = symbols[i] ?? `Token ${i + 1}`
				const coinId = `${chain}:${addr.toLowerCase().replaceAll('/', ':')}`
				const metricId = `${symbol} Price`
				return { metricId, symbol, coinId, color: PRICE_CHART_COLORS[i % PRICE_CHART_COLORS.length] }
			})
			.filter(Boolean) as Array<{ metricId: string; symbol: string; coinId: string; color: string }>
	}, [poolData.underlyingTokens, poolData.symbol, poolData.chain])

	const priceMetricDefs = useMemo(() => {
		const defs: Record<string, YieldMetricDef> = {}
		for (let i = 0; i < priceMetrics.length; i++) {
			const pm = priceMetrics[i]
			defs[pm.metricId] = {
				queryKey: `price_${pm.symbol.toLowerCase()}`,
				defaultOn: false,
				needsBorrow: false,
				chart: {
					type: 'line',
					name: pm.metricId,
					encode: { x: 'timestamp', y: pm.metricId },
					color: pm.color,
					yAxisIndex: 2 + i,
					valueSymbol: '$',
					hideAreaStyle: true
				}
			}
		}
		return defs
	}, [priceMetrics])

	const allMetricDefs = useMemo(() => ({ ...YIELD_METRIC_DEFS, ...priceMetricDefs }), [priceMetricDefs])
	const allMetricIds = useMemo(() => Object.keys(allMetricDefs), [allMetricDefs])

	const { toggledMetricIds, availableMetricIds } = useMemo(() => {
		const hasBorrowData = (chartBorrow?.data?.length ?? 0) > 0
		const hasSupplyBreakdown = chart?.data?.some((el) => el.apyBase != null || el.apyReward != null) ?? false

		const available: string[] = []
		const toggled: string[] = []

		for (const id of allMetricIds) {
			const def = allMetricDefs[id]
			if (def.needsBorrow && !hasBorrowData) continue
			if ((id === 'Supply APY Base' || id === 'Supply APY Reward') && !hasSupplyBreakdown) continue
			if (id === 'TVL Change' && !chart?.data?.length) continue
			available.push(id)

			const paramValue = searchParams.get(def.queryKey)
			if (paramValue === 'true') {
				toggled.push(id)
			} else if (paramValue === 'false') {
				// off
			} else if (def.defaultOn) {
				toggled.push(id)
			}
		}

		return { toggledMetricIds: toggled, availableMetricIds: available }
	}, [searchParams, chart, chartBorrow, allMetricIds, allMetricDefs])

	const toggledPriceMetrics = useMemo(
		() => priceMetrics.filter((pm) => toggledMetricIds.includes(pm.metricId)),
		[priceMetrics, toggledMetricIds]
	)

	const priceData = useYieldTokenPrices(toggledPriceMetrics)

	const cv30d = poolConfigId ? (volatility?.[poolConfigId]?.[3] ?? null) : null
	const apyMedian30d = poolConfigId ? (volatility?.[poolConfigId]?.[1] ?? null) : null
	const apyStd30d = poolConfigId ? (volatility?.[poolConfigId]?.[2] ?? null) : null

	// prepare csv data
	const prepareCsv = () => {
		if (!chart?.data || !query?.pool) return { filename: `yields`, rows: [] }
		const rows = [['APY', 'APY_BASE', 'APY_REWARD', 'TVL', 'DATE']]

		for (const item of chart?.data ?? EMPTY_CHART_DATA) {
			rows.push([item.apy, item.apyBase, item.apyReward, item.tvlUsd, item.timestamp])
		}

		return { filename: `${query.pool}`, rows: rows as (string | number | boolean)[][] }
	}

	const apy = poolData.apy?.toFixed(2) ?? 0
	const apyMean30d = poolData.apyMean30d?.toFixed(2) ?? 0
	const apyDelta20pct = (apy * 0.8).toFixed(2)

	let confidence = poolData.predictions?.binnedConfidence ?? null

	if (confidence) {
		confidence = confidence === 1 ? 'Low' : confidence === 2 ? 'Medium' : 'High'
		// on the frontend we round numerical values; eg values < 0.005 are displayed as 0.00;
		// in the context of apy and predictions this sometimes can lead to the following:
		// an apy is displayed as 0.00% and the outlook on /pool would read:
		// "The algorithm predicts the current APY of 0.00% to not fall below 0.00% within the next 4 weeks. Confidence: High`"
		// which is useless.
		// solution: suppress the outlook and confidence values if apy < 0.005
		confidence = apy >= 0.005 ? confidence : null
	}

	const predictedDirection = poolData.predictions?.predictedClass === 'Down' ? '' : 'not'

	const projectName = config?.name ?? ''
	const url = poolData.url ?? ''
	const category = config?.category ?? ''

	const isLoading = fetchingPoolData || fetchingChartData || fetchingConfigData || fetchingChartDataBorrow

	const getYieldsChartConfig = (chartType?: YieldChartType): YieldsChartConfig | null => {
		if (!query.pool) return null
		return {
			id: chartType ? `yields-${query.pool}-${chartType}` : `yields-${query.pool}`,
			kind: 'yields',
			poolConfigId: query.pool as string,
			poolName,
			project: config?.name ?? poolData.project ?? '',
			chain: poolData.chain ?? '',
			chartType
		}
	}

	const fullSortedSource = useMemo(() => {
		if (!chart?.data?.length) return [] as Array<Record<string, number | null | undefined>>

		const windowSize = 7
		const apyValues = chart.data.map((m) => m.apy)
		const avg7Days: (number | null)[] = []
		for (let i = 0; i < apyValues.length; i++) {
			avg7Days[i] =
				i + 1 < windowSize ? null : apyValues.slice(i + 1 - windowSize, i + 1).reduce((a, b) => a + b, 0) / windowSize
		}

		const dayMap = new Map<number, Record<string, number | null | undefined>>()

		let prevTvl: number | null = null
		chart.data.forEach((el, i) => {
			const ts = Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000) * 1000
			const tvl = el.tvlUsd ?? null
			const tvlChange = tvl != null && prevTvl != null ? tvl - prevTvl : null
			prevTvl = tvl
			dayMap.set(ts, {
				timestamp: ts,
				APY: el.apy != null ? Number(Number(el.apy).toFixed(2)) : null,
				TVL: tvl,
				'TVL Change': tvlChange != null ? Math.round(tvlChange) : null,
				'Supply APY Base': el.apyBase != null ? Number(Number(el.apyBase).toFixed(2)) : null,
				'Supply APY Reward': el.apyReward != null ? Number(Number(el.apyReward).toFixed(2)) : null,
				_apy7d: avg7Days[i] != null ? Number(avg7Days[i]!.toFixed(2)) : null
			})
		})

		if (chartBorrow?.data?.length) {
			for (const el of chartBorrow.data) {
				const ts = Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000) * 1000
				const existing = dayMap.get(ts) ?? { timestamp: ts }
				existing['Net Borrow APY'] =
					el.apyBaseBorrow == null && el.apyRewardBorrow == null
						? null
						: Number(((el.apyRewardBorrow ?? 0) - (el.apyBaseBorrow ?? 0)).toFixed(2))
				existing['Supplied'] = el.totalSupplyUsd ?? null
				existing['Borrowed'] = el.totalBorrowUsd ?? null
				existing['Utilization Rate'] =
					el.totalSupplyUsd != null && el.totalSupplyUsd > 0 && el.totalBorrowUsd != null
						? Number(((el.totalBorrowUsd / el.totalSupplyUsd) * 100).toFixed(2))
						: null
				existing['Available'] =
					category === 'CDP'
						? el.debtCeilingUsd != null && el.totalBorrowUsd != null
							? el.debtCeilingUsd - el.totalBorrowUsd
							: null
						: el.totalSupplyUsd != null && el.totalBorrowUsd != null
							? el.totalSupplyUsd - el.totalBorrowUsd
							: null
				existing['_borrowBase'] = el.apyBaseBorrow == null ? null : -Number(Number(el.apyBaseBorrow).toFixed(2))
				existing['_borrowReward'] = el.apyRewardBorrow != null ? Number(Number(el.apyRewardBorrow).toFixed(2)) : null
				dayMap.set(ts, existing)
			}
		}

		return Array.from(dayMap.values()).sort((a, b) => (a.timestamp as number) - (b.timestamp as number))
	}, [chart, chartBorrow, category])

	const {
		supplyApyBarDataset = EMPTY_BASE_REWARD_DATASET,
		supplyApy7dDataset = EMPTY_APY_DATASET,
		borrowApyBarDataset = EMPTY_BASE_REWARD_DATASET,
		netBorrowApyDataset = EMPTY_APY_DATASET,
		poolLiquidityDataset = EMPTY_LIQUIDITY_DATASET
	} = useMemo(() => {
		if (!fullSortedSource.length) return {}

		const supplyApyBarDataset: MultiSeriesChart2Dataset = {
			source: fullSortedSource
				.filter((r) => r['Supply APY Base'] != null || r['Supply APY Reward'] != null)
				.map((r) => ({ timestamp: r.timestamp, Base: r['Supply APY Base'], Reward: r['Supply APY Reward'] })),
			dimensions: ['timestamp', 'Base', 'Reward']
		}

		const supplyApy7dDataset: MultiSeriesChart2Dataset = {
			source: fullSortedSource
				.filter((r) => r['_apy7d'] != null)
				.map((r) => ({ timestamp: r.timestamp, APY: r['_apy7d'] })),
			dimensions: ['timestamp', 'APY']
		}

		const borrowApyBarDataset: MultiSeriesChart2Dataset = {
			source: fullSortedSource
				.filter((r) => Number.isFinite(r['_borrowBase']) || r['_borrowReward'] != null)
				.map((r) => ({ timestamp: r.timestamp, Base: r['_borrowBase'], Reward: r['_borrowReward'] })),
			dimensions: ['timestamp', 'Base', 'Reward']
		}

		const netBorrowApyDataset: MultiSeriesChart2Dataset = {
			source: fullSortedSource
				.filter((r) => r['Net Borrow APY'] != null)
				.map((r) => ({ timestamp: r.timestamp, APY: r['Net Borrow APY'] })),
			dimensions: ['timestamp', 'APY']
		}

		const poolLiquidityDataset: MultiSeriesChart2Dataset = {
			source: fullSortedSource
				.filter((r) => r['Supplied'] != null && r['Borrowed'] != null && r['Available'] != null)
				.map((r) => ({
					timestamp: r.timestamp,
					Supplied: r['Supplied'],
					Borrowed: r['Borrowed'],
					Available: r['Available']
				})),
			dimensions: ['timestamp', 'Supplied', 'Borrowed', 'Available']
		}

		return { supplyApyBarDataset, supplyApy7dDataset, borrowApyBarDataset, netBorrowApyDataset, poolLiquidityDataset }
	}, [fullSortedSource])
	const deferredSupplyApyBarDataset = useDeferredValue(supplyApyBarDataset)
	const deferredSupplyApy7dDataset = useDeferredValue(supplyApy7dDataset)
	const deferredBorrowApyBarDataset = useDeferredValue(borrowApyBarDataset)
	const deferredNetBorrowApyDataset = useDeferredValue(netBorrowApyDataset)
	const deferredPoolLiquidityDataset = useDeferredValue(poolLiquidityDataset)

	const { combinedDataset, combinedCharts } = useMemo(() => {
		if (!fullSortedSource.length || !toggledMetricIds.length) {
			return {
				combinedDataset: { source: [], dimensions: ['timestamp'] } as MultiSeriesChart2Dataset,
				combinedCharts: [] as MultiSeriesChart2SeriesConfig[]
			}
		}

		const hasPriceData = Object.keys(priceData).length > 0

		// Build price lookup maps (timestamp -> price) for each toggled price metric
		const priceMaps = new Map<string, Map<number, number>>()
		if (hasPriceData) {
			for (const metricId of toggledMetricIds) {
				const prices = priceData[metricId]
				if (!prices) continue
				const map = new Map<number, number>()
				for (const p of prices) {
					// Round to day to match yield data granularity
					const dayTs = Math.floor(p.timestamp / 86400000) * 86400000
					map.set(dayTs, p.price)
				}
				priceMaps.set(metricId, map)
			}
		}

		const dimensions = ['timestamp', ...toggledMetricIds]
		const source = fullSortedSource.map((row) => {
			const out: Record<string, number | null | undefined> = { timestamp: row.timestamp }
			const dayTs = Math.floor((row.timestamp as number) / 86400000) * 86400000
			for (const id of toggledMetricIds) {
				const priceMap = priceMaps.get(id)
				if (priceMap) {
					out[id] = priceMap.get(dayTs) ?? null
				} else {
					out[id] = row[id]
				}
			}
			return out
		})

		return {
			combinedDataset: { source, dimensions } as MultiSeriesChart2Dataset,
			combinedCharts: toggledMetricIds.map((id) => allMetricDefs[id].chart)
		}
	}, [fullSortedSource, toggledMetricIds, priceData, allMetricDefs])

	const deferredCombinedDataset = useDeferredValue(combinedDataset)
	const deferredCombinedCharts = useDeferredValue(combinedCharts)

	const metricsDialogStore = Ariakit.useDialogStore({
		setOpen(open) {
			if (!open) setMetricsSearchValue('')
		}
	})
	const [metricsSearchValue, setMetricsSearchValue] = useState('')
	const deferredMetricsSearchValue = useDeferredValue(metricsSearchValue)

	const filteredMetricOptions = useMemo(() => {
		const options = availableMetricIds.map((id) => ({
			id,
			label: id,
			active: toggledMetricIds.includes(id),
			queryKey: allMetricDefs[id].queryKey,
			defaultOn: allMetricDefs[id].defaultOn,
			color: allMetricDefs[id].chart.color
		}))
		if (!deferredMetricsSearchValue) return options
		return matchSorter(options, deferredMetricsSearchValue, {
			keys: ['label', 'id'],
			threshold: matchSorter.rankings.CONTAINS
		})
	}, [availableMetricIds, toggledMetricIds, deferredMetricsSearchValue, allMetricDefs])

	const { holderDonutData, holderDonutColors } = useMemo(() => {
		const holders = holderStats?.top10Holders
		if (!holders?.length) return { holderDonutData: null, holderDonutColors: {} }
		const top10Sum = holders.reduce((sum, h) => sum + h.balancePct, 0)
		const othersSlice = 100 - top10Sum
		const data = holders.map((h) => ({
			name: truncateAddress(h.address),
			value: h.balancePct
		}))
		if (othersSlice > 0.01) {
			data.push({ name: 'Others', value: Math.round(othersSlice * 100) / 100 })
		}
		const colors: Record<string, string> = {}
		data.forEach((d, i) => {
			colors[d.name] = HOLDER_COLORS[i] ?? HOLDER_COLORS[HOLDER_COLORS.length - 1]
		})
		return { holderDonutData: data, holderDonutColors: colors }
	}, [holderStats?.top10Holders])
	const deferredHolderDonutData = useDeferredValue(holderDonutData)

	const liquidityCharts = useMemo(() => {
		return LIQUIDITY_LEGEND_OPTIONS.map((name) => ({
			type: 'line' as const,
			name,
			encode: { x: 'timestamp', y: name },
			color: liquidityChartColors[name]
		}))
	}, [])

	const [selectedLiquiditySeries, setSelectedLiquiditySeries] = useState<string[]>(() => [...LIQUIDITY_LEGEND_OPTIONS])

	const hasBorrowCharts =
		borrowApyBarDataset.source.length > 0 ||
		netBorrowApyDataset.source.length > 0 ||
		poolLiquidityDataset.source.length > 0

	if (!isReady || isLoading) {
		return (
			<div className="flex h-full items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
					<h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
						{poolName}

						<span className="mr-auto font-normal">
							({projectName} - {poolData.chain})
						</span>
					</h1>

					<div className="flex flex-col gap-2 text-base">
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">APY</span>
							<span className="ml-auto font-jetbrains text-(--apy-pink)">{isLoading ? null : `${apy}%`}</span>
						</p>
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">30d Avg APY</span>
							<span className="ml-auto font-jetbrains text-(--apy-pink)">{isLoading ? null : `${apyMean30d}%`}</span>
						</p>
						{poolConfigId ? (
							<p className="flex items-center justify-between gap-1">
								<span className="font-semibold">Yield Score</span>
								<StabilityCell cv30d={cv30d} apyMedian30d={apyMedian30d} apyStd30d={apyStd30d} />
							</p>
						) : null}
						{holderStats?.holderCount != null ? (
							<>
								<p className="flex items-center justify-between gap-1">
									<span className="font-semibold">Holders</span>
									<span className="ml-auto font-jetbrains">{formattedNum(holderStats.holderCount)}</span>
								</p>
								{holderStats.top10Pct != null ? (
									<p className="flex items-center justify-between gap-1">
										<span className="font-semibold">Top 10 %</span>
										<span className="ml-auto flex items-center gap-1.5 font-jetbrains">
											<span
												className="h-2 w-2 rounded-full"
												style={{
													backgroundColor:
														holderStats.top10Pct >= 80 ? '#ef4444' : holderStats.top10Pct >= 50 ? '#eab308' : '#22c55e'
												}}
											/>
											{holderStats.top10Pct}%
										</span>
									</p>
								) : null}
							</>
						) : null}
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">Total Value Locked</span>
							<span className="ml-auto font-jetbrains text-(--apy-blue)">
								{isLoading ? null : formattedNum(poolData.tvlUsd ?? 0, true)}
							</span>
						</p>
					</div>

					<p className="flex flex-col gap-1">
						<span className="font-semibold">Outlook</span>
						<span className="leading-normal">
							{confidence !== null
								? `The algorithm predicts the current APY of ${apy}% to ${predictedDirection} fall below ${apyDelta20pct}% within the next 4 weeks. Confidence: ${confidence}`
								: 'No outlook available'}
						</span>
					</p>

					<CSVDownloadButton prepareCsv={prepareCsv} smol className="mt-auto mr-auto" />
				</div>

				<div className="col-span-2 flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					<div className="flex flex-wrap items-center justify-start gap-2">
						{availableMetricIds.length > 2 ? (
							<Ariakit.DialogProvider store={metricsDialogStore}>
								<Ariakit.DialogDisclosure className="flex shrink-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-(--cards-border) bg-white px-2 py-1 font-normal hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) dark:bg-[#181A1C]">
									<span>Add Metrics</span>
									<Icon name="plus" className="h-3.5 w-3.5" />
								</Ariakit.DialogDisclosure>
								<Ariakit.Dialog className="dialog gap-3 max-sm:drawer sm:w-full" unmountOnHide>
									<span className="flex items-center justify-between gap-1">
										<Ariakit.DialogHeading className="text-2xl font-bold">Add metrics to chart</Ariakit.DialogHeading>
										<Ariakit.DialogDismiss className="ml-auto p-2 opacity-50">
											<Icon name="x" className="h-5 w-5" />
										</Ariakit.DialogDismiss>
									</span>

									<label className="relative">
										<span className="sr-only">Search metrics</span>
										<Icon
											name="search"
											height={16}
											width={16}
											className="absolute top-0 bottom-0 left-2 my-auto text-(--text-tertiary)"
										/>
										<input
											type="text"
											name="search"
											inputMode="search"
											placeholder="Search..."
											autoFocus
											value={metricsSearchValue}
											className="min-h-8 w-full rounded-md border-(--bg-input) bg-(--bg-input) p-1.5 pl-7 text-base text-black placeholder:text-[#666] dark:text-white dark:placeholder-[#919296]"
											onInput={(e) => setMetricsSearchValue(e.currentTarget.value)}
										/>
									</label>

									<div className="flex flex-wrap gap-2">
										{filteredMetricOptions.map((option) => (
											<button
												key={`add-metric-${option.id}`}
												onClick={() => {
													void pushShallowQuery(router, {
														[option.queryKey]: option.active ? (option.defaultOn ? 'false' : undefined) : 'true'
													})
												}}
												data-active={option.active}
												className="flex items-center gap-1 rounded-full border border-(--old-blue) px-2 py-1 hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
											>
												<span>{option.label}</span>
												{option.active ? (
													<Icon name="x" className="h-3.5 w-3.5" />
												) : (
													<Icon name="plus" className="h-3.5 w-3.5" />
												)}
											</button>
										))}
										{filteredMetricOptions.length === 0 ? (
											<p className="py-2 text-sm text-(--text-tertiary)">No metrics found.</p>
										) : null}
									</div>
								</Ariakit.Dialog>
							</Ariakit.DialogProvider>
						) : null}
						{toggledMetricIds.map((metricId) => (
							<label
								className="relative flex cursor-pointer flex-nowrap items-center gap-1 text-sm last-of-type:mr-auto"
								key={`active-metric-${metricId}`}
							>
								<input
									type="checkbox"
									value={metricId}
									checked={true}
									onChange={() => {
										const def = allMetricDefs[metricId]
										void pushShallowQuery(router, {
											[def.queryKey]: def.defaultOn ? 'false' : undefined
										})
									}}
									className="peer absolute h-[1em] w-[1em] opacity-[0.00001]"
								/>
								<span
									className="flex items-center gap-1 rounded-full border-2 px-2 py-1 text-xs"
									style={{ borderColor: allMetricDefs[metricId]?.chart.color }}
								>
									<span>{metricId}</span>
									<Icon name="x" className="h-3.5 w-3.5" />
								</span>
							</label>
						))}
						<div className="ml-auto flex flex-wrap justify-end gap-1">
							<AddToDashboardButton chartConfig={getYieldsChartConfig()} smol />
							<ChartExportButtons
								chartInstance={tvlApyChartInstance}
								filename={`${query.pool}-tvl-apy`}
								title={`${poolName} - ${projectName} (${poolData.chain})`}
							/>
						</div>
					</div>
					{deferredCombinedCharts.length > 0 ? (
						<Suspense fallback={<div className="min-h-[360px]" />}>
							<MultiSeriesChart2
								dataset={deferredCombinedDataset}
								charts={deferredCombinedCharts}
								valueSymbol=""
								alwaysShowTooltip
								onReady={handleTvlApyReady}
							/>
						</Suspense>
					) : (
						<div className="flex min-h-[360px] items-center justify-center text-sm text-(--text-disabled)">
							Select metrics to display
						</div>
					)}
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				{isLoading ? (
					<div className="col-span-full flex h-[400px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<LocalLoader />
					</div>
				) : (
					<>
						{supplyApyBarDataset.source.length ? (
							<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
									<h2 className="mr-auto text-base font-semibold">Supply APY</h2>
									<AddToDashboardButton chartConfig={getYieldsChartConfig('supply-apy')} smol />
									<ChartExportButtons
										chartInstance={supplyApyChartInstance}
										filename={`${query.pool}-supply-apy`}
										title="Supply APY"
									/>
								</div>
								<Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={deferredSupplyApyBarDataset}
										charts={BASE_REWARD_BAR_CHARTS}
										valueSymbol="%"
										hideDefaultLegend={false}
										onReady={handleSupplyApyReady}
									/>
								</Suspense>
							</div>
						) : null}
						{supplyApy7dDataset.source.length ? (
							<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
									<h2 className="mr-auto text-base font-semibold">7 day moving average of Supply APY</h2>
									<AddToDashboardButton chartConfig={getYieldsChartConfig('supply-apy-7d')} smol />
									<ChartExportButtons
										chartInstance={supplyApy7dChartInstance}
										filename={`${query.pool}-supply-apy-7d-avg`}
										title="7 day moving average of Supply APY"
									/>
								</div>
								<Suspense fallback={<div className="min-h-[360px]" />}>
									<MultiSeriesChart2
										dataset={deferredSupplyApy7dDataset}
										charts={SINGLE_APY_LINE_CHARTS}
										valueSymbol="%"
										onReady={handleSupplyApy7dReady}
									/>
								</Suspense>
							</div>
						) : null}
					</>
				)}
			</div>

			{fetchingChartDataBorrow ? (
				<div className="col-span-full flex h-[400px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : hasBorrowCharts ? (
				<div className="grid grid-cols-2 gap-2 rounded-md">
					{borrowApyBarDataset.source.length ? (
						<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
								<h2 className="mr-auto text-base font-semibold">Borrow APY</h2>
								<AddToDashboardButton chartConfig={getYieldsChartConfig('borrow-apy')} smol />
								<ChartExportButtons
									chartInstance={borrowApyChartInstance}
									filename={`${query.pool}-borrow-apy`}
									title="Borrow APY"
								/>
							</div>
							<Suspense fallback={<div className="min-h-[360px]" />}>
								<MultiSeriesChart2
									dataset={deferredBorrowApyBarDataset}
									charts={BASE_REWARD_BAR_CHARTS}
									valueSymbol="%"
									hideDefaultLegend={false}
									onReady={handleBorrowApyReady}
								/>
							</Suspense>
						</div>
					) : null}
					{netBorrowApyDataset.source.length ? (
						<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
								<h2 className="mr-auto text-base font-semibold">Net Borrow APY</h2>
								<AddToDashboardButton chartConfig={getYieldsChartConfig('net-borrow-apy')} smol />
								<ChartExportButtons
									chartInstance={netBorrowApyChartInstance}
									filename={`${query.pool}-net-borrow-apy`}
									title="Net Borrow APY"
								/>
							</div>
							<Suspense fallback={<div className="min-h-[360px]" />}>
								<MultiSeriesChart2
									dataset={deferredNetBorrowApyDataset}
									charts={SINGLE_APY_LINE_CHARTS}
									valueSymbol="%"
									onReady={handleNetBorrowApyReady}
								/>
							</Suspense>
						</div>
					) : null}

					{poolLiquidityDataset.source.length ? (
						<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<div className="flex flex-wrap items-center justify-end gap-2 p-2 pb-0">
								<h2 className="mr-auto text-base font-semibold">Pool Liquidity</h2>
								<SelectWithCombobox
									allValues={LIQUIDITY_LEGEND_OPTIONS}
									selectedValues={selectedLiquiditySeries}
									setSelectedValues={setSelectedLiquiditySeries}
									label="Filter"
									labelType="smol"
									variant="filter"
									portal
								/>
								<AddToDashboardButton chartConfig={getYieldsChartConfig('pool-liquidity')} smol />
								<ChartExportButtons
									chartInstance={poolLiquidityChartInstance}
									filename={`${query.pool}-pool-liquidity`}
									title="Pool Liquidity"
								/>
							</div>
							<Suspense fallback={<div className="min-h-[360px]" />}>
								<MultiSeriesChart2
									dataset={deferredPoolLiquidityDataset}
									charts={liquidityCharts}
									valueSymbol="$"
									selectedCharts={new Set(selectedLiquiditySeries)}
									onReady={handlePoolLiquidityReady}
								/>
							</Suspense>
						</div>
					) : null}
				</div>
			) : null}

			{deferredHolderDonutData?.length || holderChanges.holders.length ? (
				<div className="grid grid-cols-1 rounded-md border border-(--cards-border) bg-(--cards-bg) lg:grid-cols-2 xl:grid-cols-[1fr_2fr_1fr]">
					{deferredHolderDonutData?.length ? (
						<div className="relative flex flex-col">
							<Suspense fallback={<div className="min-h-[398px]" />}>
								<PieChart
									title="Top 10 Holder Distribution"
									chartData={deferredHolderDonutData}
									stackColors={holderDonutColors}
									radius={HOLDER_DONUT_RADIUS}
									valueSymbol="%"
									showLegend={false}
									customLabel={{ show: false }}
									formatTooltip={(p) => {
										const val = typeof p?.value === 'number' ? p.value : Number(p?.value ?? 0)
										return `${p?.marker ?? ''}${p?.name ?? ''}: <b>${val.toFixed(2)}%</b>`
									}}
									exportButtons="auto"
									onReady={setHolderDonutInstance}
								/>
							</Suspense>
						</div>
					) : null}
					{holderChanges.holders.length ? (
						<div className="border-t border-(--cards-border) p-2 lg:border-t-0 lg:border-l">
							<TopHoldersTable
								holders={holderChanges.holders}
								holders30d={holderChanges30d.holders}
								summary={holderChanges.summary}
								balanceSummary={holderChanges.balanceSummary}
								tokenDecimals={holderStats?.tokenDecimals ?? null}
								chain={poolData.chain}
								blockExplorersData={blockExplorersData}
								colors={HOLDER_COLORS}
								hoveredIndex={holderDonutHoveredIndex}
							/>
						</div>
					) : null}
					{holderStats?.top10Holders?.length ? (
						<div className="border-t border-(--cards-border) lg:col-span-full xl:col-span-1 xl:border-t-0 xl:border-l">
							<ConcentrationRiskPanel
								holders={holderStats.top10Holders}
								holderCount={holderStats.holderCount}
								holderChange7d={holderStats.holderChange7d}
								holderChange30d={holderStats.holderChange30d}
								avgPositionUsd={holderStats.avgPositionUsd}
								tvlUsd={poolData.tvlUsd ?? null}
							/>
						</div>
					) : null}
				</div>
			) : null}

			<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:p-4">
				<h3 className="text-base font-semibold">Protocol Information</h3>
				<p className="flex items-center gap-1">
					<span>Category:</span>
					<BasicLink href={`/protocols/${slug(category)}`} className="hover:underline">
						{category}
					</BasicLink>
				</p>

				{config?.audits ? (
					<>
						<p className="flex items-center gap-1">
							<span className="flex flex-nowrap items-center gap-1">
								<span>Audits</span>
								<QuestionHelper text="Audits are not a security guarantee" />
								<span>:</span>
							</span>
							{config.audit_links?.length > 0 ? (
								<Menu
									name="Yes"
									options={config.audit_links}
									isExternal
									className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
								/>
							) : (
								<span>No</span>
							)}
						</p>
						{config.audit_note ? <p>Audit Note: {config.audit_note}</p> : null}
					</>
				) : null}
				<div className="flex flex-wrap gap-2">
					{url ? (
						<a
							href={url}
							className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Icon name="earth" className="h-3 w-3" />
							<span>Website</span>
						</a>
					) : null}
					{config?.github?.length
						? config.github.map((github) => (
								<a
									href={`https://github.com/${github}`}
									className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
									target="_blank"
									rel="noopener noreferrer"
									key={`${config.name}-github-${github}`}
								>
									<Icon name="github" className="h-3 w-3" />
									<span>{config.github.length === 1 ? 'GitHub' : github}</span>
								</a>
							))
						: null}
					{config?.twitter ? (
						<a
							href={`https://x.com/${config.twitter}`}
							className="flex items-center gap-1 rounded-full border border-(--primary) px-2 py-1 text-xs font-medium whitespace-nowrap hover:bg-(--btn2-hover-bg) focus-visible:bg-(--btn2-hover-bg)"
							target="_blank"
							rel="noopener noreferrer"
						>
							<Icon name="twitter" className="h-3 w-3" />
							<span>Twitter</span>
						</a>
					) : null}
				</div>
			</div>
		</>
	)
}

const liquidityChartColors: Record<string, string> = {
	Supplied: CHART_COLORS[0],
	Borrowed: CHART_COLORS[1],
	Available: CHART_COLORS[2]
}

const LIQUIDITY_LEGEND_OPTIONS: string[] = ['Supplied', 'Borrowed', 'Available']

export default function YieldPoolPage(props) {
	const { query } = useRouter()
	const pool = typeof query.pool === 'string' ? query.pool : Array.isArray(query.pool) ? query.pool[0] : undefined

	return (
		<Layout
			title={pool ? `Yields ${pool} - DefiLlama` : ''}
			description={pool ? `Compare APY rates, TVL, and pool metrics for ${pool} on DefiLlama.` : ''}
			canonicalUrl={pool ? `/yields/pool/${pool}` : null}
		>
			<PageView {...props} />
		</Layout>
	)
}
