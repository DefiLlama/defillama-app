import type { GetServerSideProps } from 'next'
import { lazy, Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useBlockExplorers } from '~/api/client'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { CopyHelper } from '~/components/Copy'
import { formatTvlApyTooltip } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { YIELD_CONFIG_API, YIELD_POOLS_LAMBDA_API } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import type { YieldsChartConfig, YieldChartType } from '~/containers/ProDashboard/types'
import { useAuthContext } from '~/containers/Subscription/auth'
import { ProtocolInformationCard } from '~/containers/Yields/ProtocolInformationCard'
import {
	useYieldChartData,
	useYieldChartLendBorrow,
	useVolatility,
	useHolderHistory,
	useHolderStats
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
import type { IYieldTableRow } from '~/containers/Yields/Tables/types'
import { useYieldsUpgradePrompt } from '~/containers/Yields/Tables/useYieldsUpgradePrompt'
import { extractPoolTokens } from '~/containers/Yields/utils'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { useIsClient } from '~/hooks/useIsClient'
import Layout from '~/layout'
import { isDatasetCacheEnabled } from '~/server/datasetCache/config'
import { formattedNum } from '~/utils'
import { fetchJson } from '~/utils/async'
import { getBlockExplorerNew } from '~/utils/blockExplorers'
import { maxAgeForNext } from '~/utils/maxAgeForNext'
import { recordRuntimeError, withServerSidePropsTelemetry } from '~/utils/telemetry'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>
const EMPTY_CHART_DATA: any[] = []
const EMPTY_TVL_APY_DATASET = { source: [] as any[], dimensions: ['timestamp', 'APY', 'TVL'] }
const YIELD_POOL_CONFIG_ID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type YieldPoolPageProps = {
	pool: IYieldTableRow
	config: any | null
	poolId: string
}

async function getYieldPoolPagePropsFromNetwork(poolId: string): Promise<YieldPoolPageProps | null> {
	const { mapPoolToYieldTableRow } = await import('~/containers/Yields/poolsPipeline')
	const poolResponse = await fetchJson<{ data?: any[] }>(`${YIELD_POOLS_LAMBDA_API}?pool=${encodeURIComponent(poolId)}`)
	const rawPool = poolResponse?.data?.[0]
	if (!rawPool) return null

	const yieldConfig = await fetchJson<{ protocols?: Record<string, any> }>(YIELD_CONFIG_API).catch(() => null)
	const config = rawPool.project ? (yieldConfig?.protocols?.[rawPool.project] ?? null) : null

	return {
		pool: mapPoolToYieldTableRow(rawPool),
		config,
		poolId
	}
}

const getServerSidePropsHandler: GetServerSideProps<YieldPoolPageProps> = async ({ params, res }) => {
	const poolParam = params?.pool
	const poolId = typeof poolParam === 'string' ? poolParam : Array.isArray(poolParam) ? poolParam[0] : null

	if (!poolId) {
		return { notFound: true }
	}

	if (isDatasetCacheEnabled()) {
		try {
			const { getYieldPoolRowFromCache, getYieldProtocolConfigFromCache } = await import('~/server/datasetCache/yields')
			const row = await getYieldPoolRowFromCache(poolId)
			if (row) {
				res.setHeader('Cache-Control', `public, s-maxage=${maxAgeForNext([22])}, stale-while-revalidate=3600`)
				return {
					props: {
						pool: row,
						config: await getYieldProtocolConfigFromCache(row.projectslug),
						poolId
					}
				}
			}

			return { notFound: true }
		} catch (error) {
			recordRuntimeError(error, 'pageBuild')
		}
	}

	if (!YIELD_POOL_CONFIG_ID_REGEX.test(poolId)) {
		return { notFound: true }
	}

	res.setHeader('Cache-Control', `public, s-maxage=${maxAgeForNext([22])}, stale-while-revalidate=3600`)

	const props = await getYieldPoolPagePropsFromNetwork(poolId)
	return props ? { props } : { notFound: true }
}

const tvlApyCharts = [
	{
		type: 'line' as const,
		name: 'APY',
		encode: { x: 'timestamp', y: 'APY' },
		color: '#fd3c99',
		yAxisIndex: 0,
		valueSymbol: '%'
	},
	{
		type: 'line' as const,
		name: 'TVL',
		encode: { x: 'timestamp', y: 'TVL' },
		color: '#4f8fea',
		yAxisIndex: 1,
		valueSymbol: '$'
	}
]
const tvlApyChartOptions = { tooltip: { formatter: formatTvlApyTooltip } }

const BASE_REWARD_BAR_CHARTS: IMultiSeriesChart2Props['charts'] = [
	{ type: 'bar', name: 'Base', encode: { x: 'timestamp', y: 'Base' }, stack: 'a', color: CHART_COLORS[0] },
	{ type: 'bar', name: 'Reward', encode: { x: 'timestamp', y: 'Reward' }, stack: 'a', color: CHART_COLORS[1] }
]

const SINGLE_APY_LINE_CHARTS: IMultiSeriesChart2Props['charts'] = [
	{ type: 'line', name: 'APY', encode: { x: 'timestamp', y: 'APY' }, color: CHART_COLORS[0] }
]

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

export function getYieldPoolAssetTokens(poolSymbol?: string | null): string[] {
	if (!poolSymbol) return []
	return [...new Set(extractPoolTokens(poolSymbol))]
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

const PageView = ({ pool, config, poolId }: { pool: IYieldTableRow; config: any; poolId: string }) => {
	const isClient = useIsClient()
	const { hasActiveSubscription } = useAuthContext()
	const { onRequestUpgrade, modal } = useYieldsUpgradePrompt()
	const hasPremiumAccess = isClient && hasActiveSubscription

	const poolData = pool
	const chain = poolData.chains?.[0] ?? ''
	const poolName = poolData.poolMeta ? `${poolData.pool} (${poolData.poolMeta})` : (poolData.pool ?? '')

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

	const { data: chart, isLoading: fetchingChartData } = useYieldChartData(poolId)

	const { data: chartBorrow, isLoading: fetchingChartDataBorrow } = useYieldChartLendBorrow(poolId)

	const { data: volatility } = useVolatility()
	const { data: holderHistory } = useHolderHistory(poolId)
	const { data: holderStatsMap } = useHolderStats(poolData.configID ? [poolData.configID] : undefined)
	const holderStats = poolData.configID ? holderStatsMap?.[poolData.configID] : null
	const { data: blockExplorersData } = useBlockExplorers()
	const holderChanges = useMemo(() => {
		return computeHolderChanges(holderStats?.top10Holders ?? null, holderHistory ?? null, 7)
	}, [holderStats?.top10Holders, holderHistory])
	const holderChanges30d = useMemo(() => {
		return computeHolderChanges(holderStats?.top10Holders ?? null, holderHistory ?? null, 30)
	}, [holderStats?.top10Holders, holderHistory])
	const poolConfigId = poolData.configID ?? poolId
	const cv30d = poolConfigId ? (volatility?.[poolConfigId]?.[3] ?? null) : null
	const apyMedian30d = poolConfigId ? (volatility?.[poolConfigId]?.[1] ?? null) : null
	const apyStd30d = poolConfigId ? (volatility?.[poolConfigId]?.[2] ?? null) : null

	// prepare csv data
	const prepareCsv = () => {
		if (!chart?.data || !poolId) return { filename: `yields`, rows: [] }
		const rows = [['APY', 'APY_BASE', 'APY_REWARD', 'TVL', 'DATE']]

		for (const item of chart?.data ?? EMPTY_CHART_DATA) {
			rows.push([item.apy, item.apyBase, item.apyReward, item.tvlUsd, item.timestamp])
		}

		return { filename: poolId, rows: rows as (string | number | boolean)[][] }
	}

	const apyValue = poolData.apy ?? 0
	const apy = apyValue.toFixed(2)
	const apyMean30d = poolData.apyMean30d?.toFixed(2) ?? '0'
	const apyDelta20pct = (apyValue * 0.8).toFixed(2)

	let confidence: string | null = null

	if (poolData.confidence) {
		confidence = poolData.confidence === 1 ? 'Low' : poolData.confidence === 2 ? 'Medium' : 'High'
		// on the frontend we round numerical values; eg values < 0.005 are displayed as 0.00;
		// in the context of apy and predictions this sometimes can lead to the following:
		// an apy is displayed as 0.00% and the outlook on /pool would read:
		// "The algorithm predicts the current APY of 0.00% to not fall below 0.00% within the next 4 weeks. Confidence: High`"
		// which is useless.
		// solution: suppress the outlook and confidence values if apy < 0.005
		confidence = apyValue >= 0.005 ? confidence : null
	}

	const predictedDirection = poolData.outlook === 'Down' ? '' : 'not'

	const projectName = config?.name ?? poolData.project ?? ''
	const projectSlug = poolData.projectslug ?? ''
	const url = poolData.url ?? ''
	const category = config?.category ?? poolData.category ?? ''

	const isLoading = fetchingChartData || fetchingChartDataBorrow

	const getYieldsChartConfig = (chartType?: YieldChartType): YieldsChartConfig | null => {
		if (!poolId) return null
		return {
			id: chartType ? `yields-${poolId}-${chartType}` : `yields-${poolId}`,
			kind: 'yields',
			poolConfigId,
			poolName,
			project: projectName,
			chain,
			chartType
		}
	}

	const {
		tvlApyDataset = EMPTY_TVL_APY_DATASET,
		supplyApyBarDataset = EMPTY_BASE_REWARD_DATASET,
		supplyApy7dDataset = EMPTY_APY_DATASET,
		// borrow stuff
		borrowApyBarDataset = EMPTY_BASE_REWARD_DATASET,
		netBorrowApyDataset = EMPTY_APY_DATASET,
		poolLiquidityDataset = EMPTY_LIQUIDITY_DATASET
	} = useMemo(() => {
		if (!chart) return {}

		// - calc 7day APY moving average
		const windowSize = 7
		const apyValues = chart?.data?.map((m) => m.apy)
		const avg7Days = []

		for (let i = 0; i < apyValues?.length; i++) {
			if (i + 1 < windowSize) {
				avg7Days[i] = null
			} else {
				avg7Days[i] = apyValues.slice(i + 1 - windowSize, i + 1).reduce((a, b) => a + b, 0) / windowSize
			}
		}

		// - format for chart components
		const data = chart?.data?.map((el, i) => [
			// round time to day
			Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			el.tvlUsd,
			el.apy?.toFixed(2) ?? null,
			el.apyBase?.toFixed(2) ?? null,
			el.apyReward?.toFixed(2) ?? null,
			avg7Days[i]?.toFixed(2) ?? null
		])

		const dataBar = data?.filter((t) => t[3] !== null || t[4] !== null) ?? EMPTY_CHART_DATA

		const supplyApyBarDataset: MultiSeriesChart2Dataset = {
			source: dataBar.length
				? dataBar.map((item) => ({
						timestamp: item[0] * 1e3,
						Base: item[3] === null ? null : Number(item[3]),
						Reward: item[4] === null ? null : Number(item[4])
					}))
				: [],
			dimensions: ['timestamp', 'Base', 'Reward']
		}

		const supplyApy7dDataset: MultiSeriesChart2Dataset = {
			source: data?.length
				? data
						.filter((t) => t[5] !== null)
						.map((t) => ({ timestamp: t[0] * 1e3, APY: t[5] === null ? null : Number(t[5]) }))
				: [],
			dimensions: ['timestamp', 'APY']
		}

		// borrow charts

		// - format for chart components
		const dataBorrow = chartBorrow?.data?.map((el) => [
			// round time to day
			Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			el.totalSupplyUsd,
			el.totalBorrowUsd,
			category === 'CDP' && el.debtCeilingUsd
				? el.debtCeilingUsd - el.totalBorrowUsd
				: category === 'CDP'
					? null
					: el.totalSupplyUsd === null && el.totalBorrowUsd === null
						? null
						: el.totalSupplyUsd - el.totalBorrowUsd,
			el.apyBase?.toFixed(2) ?? null,
			el.apyReward?.toFixed(2) ?? null,
			el.apyBaseBorrow == null ? null : -Number(el.apyBaseBorrow.toFixed(2)),
			el.apyRewardBorrow?.toFixed(2) ?? null,
			el.apyBaseBorrow === null && el.apyRewardBorrow === null
				? null
				: ((-el.apyBaseBorrow + el.apyRewardBorrow).toFixed(2) ?? null)
		])

		const dataBarBorrow = dataBorrow?.filter((t) => Number.isFinite(t[6]) || t[7] !== null) ?? EMPTY_CHART_DATA
		const borrowApyBarDataset: MultiSeriesChart2Dataset = {
			source: dataBarBorrow.length
				? dataBarBorrow.map((item) => ({
						timestamp: item[0] * 1e3,
						Base: item[6] === null ? null : Number(item[6]),
						Reward: item[7] === null ? null : Number(item[7])
					}))
				: [],
			dimensions: ['timestamp', 'Base', 'Reward']
		}

		const dataArea = dataBorrow?.filter((t) => t[1] !== null && t[2] !== null && t[3] !== null) ?? EMPTY_CHART_DATA
		const poolLiquidityDataset: MultiSeriesChart2Dataset = {
			source: dataArea.length
				? dataArea.map((t) => ({ timestamp: t[0] * 1e3, Supplied: t[1], Borrowed: t[2], Available: t[3] }))
				: [],
			dimensions: ['timestamp', 'Supplied', 'Borrowed', 'Available']
		}

		const dataNetBorrowArea = dataBorrow?.filter((t) => t[8] !== null) ?? EMPTY_CHART_DATA
		const netBorrowApyDataset: MultiSeriesChart2Dataset = {
			source: dataNetBorrowArea.length
				? dataNetBorrowArea.map((t) => ({ timestamp: t[0] * 1e3, APY: t[8] === null ? null : Number(t[8]) }))
				: [],
			dimensions: ['timestamp', 'APY']
		}

		return {
			tvlApyDataset: {
				source: (data ?? []).map((item) => ({ timestamp: item[0] * 1000, TVL: item[1], APY: item[2] })),
				dimensions: ['timestamp', 'APY', 'TVL']
			},
			supplyApyBarDataset,
			supplyApy7dDataset,
			borrowApyBarDataset,
			netBorrowApyDataset,
			poolLiquidityDataset
		}
	}, [chart, chartBorrow, category])
	const deferredTvlApyDataset = useDeferredValue(tvlApyDataset)
	const deferredSupplyApyBarDataset = useDeferredValue(supplyApyBarDataset)
	const deferredSupplyApy7dDataset = useDeferredValue(supplyApy7dDataset)
	const deferredBorrowApyBarDataset = useDeferredValue(borrowApyBarDataset)
	const deferredNetBorrowApyDataset = useDeferredValue(netBorrowApyDataset)
	const deferredPoolLiquidityDataset = useDeferredValue(poolLiquidityDataset)

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

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
					<h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
						{poolName}

						<span className="mr-auto font-normal">
							({projectName} - {chain})
						</span>
					</h1>

					<div className="flex flex-col gap-2 text-base">
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">APY</span>
							<span className="ml-auto font-jetbrains text-(--apy-pink)">{apy}%</span>
						</p>
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">30d Avg APY</span>
							<span className="ml-auto font-jetbrains text-(--apy-pink)">{apyMean30d}%</span>
						</p>
						{poolConfigId ? (
							<p className="flex items-center justify-between gap-1">
								<span className="font-semibold">Yield Score</span>
								<StabilityCell
									cv30d={cv30d}
									apyMedian30d={apyMedian30d}
									apyStd30d={apyStd30d}
									hasPremiumAccess={hasPremiumAccess}
									onRequestUpgrade={onRequestUpgrade}
								/>
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
							<span className="ml-auto font-jetbrains text-(--apy-blue)">{formattedNum(poolData.tvl ?? 0, true)}</span>
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

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-1 p-2">
						<AddToDashboardButton chartConfig={getYieldsChartConfig()} smol />
						<ChartExportButtons
							chartInstance={tvlApyChartInstance}
							filename={`${poolId}-tvl-apy`}
							title={`${poolName} - ${projectName} (${chain})`}
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={deferredTvlApyDataset}
							charts={tvlApyCharts}
							chartOptions={tvlApyChartOptions}
							valueSymbol=""
							alwaysShowTooltip
							onReady={handleTvlApyReady}
						/>
					</Suspense>
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
										filename={`${poolId}-supply-apy`}
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
										filename={`${poolId}-supply-apy-7d-avg`}
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
									filename={`${poolId}-borrow-apy`}
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
									filename={`${poolId}-net-borrow-apy`}
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
									filename={`${poolId}-pool-liquidity`}
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
										const param = p as { value?: number | string; marker?: string; name?: string }
										const val = typeof param.value === 'number' ? param.value : Number(param.value ?? 0)
										return `${param.marker ?? ''}${param.name ?? ''}: <b>${val.toFixed(2)}%</b>`
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
								chain={chain}
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
								tvlUsd={poolData.tvl ?? null}
							/>
						</div>
					) : null}
				</div>
			) : null}

			<ProtocolInformationCard
				category={category}
				projectName={projectName}
				projectSlug={projectSlug}
				config={config}
				url={url}
				assetTokens={getYieldPoolAssetTokens(poolData.pool)}
			/>
			{modal}
		</>
	)
}

const liquidityChartColors: Record<string, string> = {
	Supplied: CHART_COLORS[0],
	Borrowed: CHART_COLORS[1],
	Available: CHART_COLORS[2]
}

const LIQUIDITY_LEGEND_OPTIONS: string[] = ['Supplied', 'Borrowed', 'Available']

export default function YieldPoolPage(props: YieldPoolPageProps) {
	const { poolId, pool, config } = props
	const chain = pool.chains?.[0] ?? ''

	const poolName = pool.poolMeta ? `${pool.pool} (${pool.poolMeta})` : (pool.pool ?? '')
	const projectName = config?.name ?? pool.project ?? ''

	const poolLabel =
		poolName && projectName && chain ? `${poolName} (${projectName} - ${chain})` : poolName || poolId || ''

	const title = poolLabel ? `${poolLabel} Yields` : ''
	const description = poolLabel
		? `Compare historic APY rates, TVL, and pool metrics for ${poolLabel} on DefiLlama.`
		: ''

	return (
		<Layout title={title} description={description} canonicalUrl={poolId ? `/yields/pool/${poolId}` : null}>
			<PageView pool={pool} config={config} poolId={poolId} />
		</Layout>
	)
}

export const getServerSideProps = withServerSidePropsTelemetry('/yields/pool/[pool]', getServerSidePropsHandler)
