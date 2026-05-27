import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo } from 'react'
import type { MultiSeriesChart2Dataset, MultiSeriesChart2SeriesConfig } from '~/components/ECharts/types'
import { LoadingDots } from '~/components/Loaders'
import { CHART_COLORS } from '~/constants/colors'
import { calculateLoopAPY, type LoopApyInputPool } from '~/containers/Yields/domain/loopApy'
import {
	useConfigPool,
	useYieldChartData,
	useYieldChartLendBorrow,
	useYieldConfigData
} from '~/containers/Yields/queries.client'
import Layout from '~/layout'
import { formattedNum } from '~/utils'

const MultiSeriesChart2 = lazy(() => import('~/components/ECharts/MultiSeriesChart2'))

const EMPTY_APY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp', 'APY'] }
const EMPTY_BASE_REWARD_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp', 'Base', 'Reward'] }

const APY_LINE_CHARTS: MultiSeriesChart2SeriesConfig[] = [
	{ type: 'line', name: 'APY', encode: { x: 'timestamp', y: 'APY' }, color: CHART_COLORS[0] }
]

const BAR_APY_CHARTS: MultiSeriesChart2SeriesConfig[] = [
	{ type: 'bar', name: 'Base', encode: { x: 'timestamp', y: 'Base' }, stack: 'a', color: CHART_COLORS[0] },
	{ type: 'bar', name: 'Reward', encode: { x: 'timestamp', y: 'Reward' }, stack: 'a', color: CHART_COLORS[1] }
]

interface StrategyConfigPool {
	config_id: string
	project: string
	category?: string | null
	symbol?: string | null
	mintedCoin?: string | null
	ltv?: number | null
}

interface YieldChartPoint {
	timestamp: string
	apy: number | null
	apyBase?: number | null
	apyReward?: number | null
	tvlUsd?: number | null
}

interface YieldBorrowChartPoint extends YieldChartPoint, Omit<LoopApyInputPool, 'project' | 'apyBaseBorrow'> {
	apyBaseBorrow: number | null
	apyRewardBorrow?: number | null
	totalSupplyUsd?: number | null
	totalBorrowUsd?: number | null
	borrowFactor?: number | null
}

type ParsedChartPoint<TPoint extends { timestamp: string }> = Omit<TPoint, 'timestamp'> & { timestamp: number }

type ParsedYieldChartPoint = ParsedChartPoint<YieldChartPoint>
type ParsedYieldBorrowChartPoint = ParsedChartPoint<YieldBorrowChartPoint>

interface MergedStrategyPoint {
	timestamp: number
	lendData: ParsedYieldChartPoint
	borrowData: ParsedYieldBorrowChartPoint
	farmData: ParsedYieldChartPoint
}

interface MergedStrategyCompletePoint extends MergedStrategyPoint {
	lendData: ParsedYieldChartPoint & { apy: number }
	borrowData: ParsedYieldBorrowChartPoint & { apyBaseBorrow: number }
	farmData: ParsedYieldChartPoint & { apy: number }
}

interface MergedStrategyApyPoint extends MergedStrategyCompletePoint {
	strategyAPY: number
	loopAPY?: number
}

function getFirstRouteParam(value: string | string[] | undefined) {
	return Array.isArray(value) ? value[0] : value
}

function parseTimestamp(timestamp: string) {
	return new Date(timestamp.split('T')[0]).getTime() / 1000
}

function buildParsedChartMap<TPoint extends { timestamp: string }>(
	points: TPoint[] | undefined,
	uniqueDates: Set<number>
) {
	const map = new Map<number, ParsedChartPoint<TPoint>>()
	if (!points) return map

	for (const point of points) {
		const timestamp = parseTimestamp(point.timestamp)
		map.set(timestamp, { ...point, timestamp } as ParsedChartPoint<TPoint>)
		uniqueDates.add(timestamp)
	}

	return map
}

export function calculateStrategyDetailLoopApy({
	borrowData,
	project,
	ltv
}: {
	borrowData: ParsedYieldBorrowChartPoint & { apyBaseBorrow: number }
	project: string
	ltv: number
}) {
	return calculateLoopAPY([{ ...borrowData, project, apyBaseBorrow: -borrowData.apyBaseBorrow, ltv }], 10)[0]?.loopApy
}

const PageView = () => {
	const { query } = useRouter()

	const strategyParam = getFirstRouteParam(query.strat)
	const tokens = strategyParam?.split('_') ?? []

	const lendToken = tokens.length ? tokens[0] : ''
	const borrowToken = tokens.length ? tokens[1] : ''
	const farmToken = tokens.length ? tokens[2] : ''

	const { data: lendHistory, isLoading: fetchingLendData } = useYieldChartData(lendToken)
	const { data: borrowHistory, isLoading: fetchingBorrowData } = useYieldChartLendBorrow(borrowToken)
	const { data: farmHistory, isLoading: fetchingFarmData } = useYieldChartData(farmToken)
	const { data: configData, isLoading: fetchingConfigData } = useConfigPool(tokens.length ? tokens.join(',') : '')

	const configsMap = useMemo(() => {
		const map = new Map<string, StrategyConfigPool>()
		for (const config of (configData?.data ?? []) as StrategyConfigPool[]) {
			map.set(config.config_id, config)
		}
		return map
	}, [configData])
	const project = configsMap?.get(lendToken)?.project

	const { data: config, isLoading: fetchingConfig } = useYieldConfigData(project ?? '')
	const lendProjectCategory = config?.category

	const {
		finalApyDataset = EMPTY_APY_DATASET,
		barDatasetSupply = EMPTY_BASE_REWARD_DATASET,
		barDatasetBorrow = EMPTY_BASE_REWARD_DATASET,
		barDatasetFarm = EMPTY_BASE_REWARD_DATASET,
		lendApy,
		borrowApy,
		farmApy,
		finalAPY,
		ltv,
		farmTVL,
		borrowAvailable
	} = useMemo(() => {
		if (!lendHistory || !borrowHistory || !farmHistory || !configData || !project || !lendProjectCategory) {
			return {
				finalApyDataset: EMPTY_APY_DATASET,
				barDatasetSupply: EMPTY_BASE_REWARD_DATASET,
				barDatasetBorrow: EMPTY_BASE_REWARD_DATASET,
				barDatasetFarm: EMPTY_BASE_REWARD_DATASET
			}
		}

		const uniqueDates = new Set<number>()
		const lendDataMap = buildParsedChartMap((lendHistory.data ?? []) as YieldChartPoint[], uniqueDates)
		const borrowDataMap = buildParsedChartMap((borrowHistory.data ?? []) as YieldBorrowChartPoint[], uniqueDates)
		const farmDataMap = buildParsedChartMap((farmHistory.data ?? []) as YieldChartPoint[], uniqueDates)

		const ltv = configsMap?.get(lendToken)?.ltv ?? 0
		const mergedWithApy: MergedStrategyApyPoint[] = []
		for (const d of uniqueDates) {
			const row: MergedStrategyPoint = {
				timestamp: d,
				lendData: lendDataMap.get(d),
				borrowData: borrowDataMap.get(d),
				farmData: farmDataMap.get(d)
			}
			if (!row.lendData || !row.borrowData || !row.farmData) continue
			if (row.lendData.apy === null || row.borrowData.apyBaseBorrow === null || row.farmData.apy === null) continue

			const completeRow = row as MergedStrategyCompletePoint
			mergedWithApy.push({
				...completeRow,
				strategyAPY:
					completeRow.lendData.apy +
					(-completeRow.borrowData.apyBaseBorrow + (completeRow.borrowData.apyRewardBorrow ?? 0)) * ltv +
					completeRow.farmData.apy * ltv,
				loopAPY: calculateStrategyDetailLoopApy({ borrowData: completeRow.borrowData, project, ltv })
			})
		}

		// make sure this is the most recent value
		const latestValues = mergedWithApy.at(-1)
		const farmTVL = latestValues?.farmData?.tvlUsd ?? 0
		const borrowAvailable =
			(latestValues?.borrowData?.totalSupplyUsd ?? 0) - (latestValues?.borrowData?.totalBorrowUsd ?? 0)

		const lendApy = latestValues?.lendData?.apy ?? 0

		const borrowApyBase = latestValues?.borrowData?.apyBaseBorrow ?? 0
		const borrowApyReward = latestValues?.borrowData?.apyRewardBorrow ?? 0
		const borrowApy = -borrowApyBase + borrowApyReward

		const farmApy = latestValues?.farmData?.apy ?? 0

		const strategyAPY = latestValues?.strategyAPY ?? 0
		const loopAPY = latestValues?.loopAPY ?? 0

		const finalAPY = lendToken === borrowToken && lendProjectCategory !== 'CDP' ? loopAPY : strategyAPY

		const isLoop = lendToken === borrowToken && lendProjectCategory !== 'CDP'
		const finalApySource: MultiSeriesChart2Dataset['source'] = []
		for (const point of mergedWithApy) {
			const apyRaw = isLoop ? point.loopAPY : point.strategyAPY
			const apy = typeof apyRaw === 'number' ? Number(apyRaw.toFixed(2)) : Number(apyRaw)
			if (Number.isFinite(apy)) {
				finalApySource.push({ timestamp: point.timestamp * 1e3, APY: apy })
			}
		}
		const finalApyDataset = {
			source: finalApySource,
			dimensions: ['timestamp', 'APY']
		}

		const supplySource: MultiSeriesChart2Dataset['source'] = []
		const borrowSource: MultiSeriesChart2Dataset['source'] = []
		const farmSource: MultiSeriesChart2Dataset['source'] = []
		for (const item of mergedWithApy) {
			supplySource.push({
				timestamp: item.lendData.timestamp * 1e3,
				Base:
					item.lendData.apyBase == null || !Number.isFinite(item.lendData.apyBase)
						? null
						: Number(item.lendData.apyBase.toFixed(2)),
				Reward:
					item.lendData.apyReward == null || !Number.isFinite(item.lendData.apyReward)
						? null
						: Number(item.lendData.apyReward.toFixed(2))
			})

			borrowSource.push({
				timestamp: item.borrowData.timestamp * 1e3,
				Base:
					item.borrowData.apyBaseBorrow == null || !Number.isFinite(item.borrowData.apyBaseBorrow)
						? null
						: -Number(item.borrowData.apyBaseBorrow.toFixed(2)),
				Reward:
					item.borrowData.apyRewardBorrow == null || !Number.isFinite(item.borrowData.apyRewardBorrow)
						? null
						: Number(item.borrowData.apyRewardBorrow.toFixed(2))
			})

			const farmBaseRaw =
				item.farmData.apyBase == null || !Number.isFinite(item.farmData.apyBase)
					? item.farmData.apy
					: item.farmData.apyBase
			farmSource.push({
				timestamp: item.farmData.timestamp * 1e3,
				Base: farmBaseRaw == null || !Number.isFinite(farmBaseRaw) ? null : Number(farmBaseRaw.toFixed(2)),
				Reward:
					item.farmData.apyReward == null || !Number.isFinite(item.farmData.apyReward)
						? null
						: Number(item.farmData.apyReward.toFixed(2))
			})
		}

		const barDatasetSupply = {
			source: supplySource,
			dimensions: ['timestamp', 'Base', 'Reward']
		}

		const barDatasetBorrow = {
			source: borrowSource,
			dimensions: ['timestamp', 'Base', 'Reward']
		}

		const barDatasetFarm = {
			source: farmSource,
			dimensions: ['timestamp', 'Base', 'Reward']
		}

		return {
			finalApyDataset,
			lendApy,
			borrowApy,
			farmApy,
			finalAPY,
			ltv,
			barDatasetSupply,
			barDatasetBorrow,
			barDatasetFarm,
			farmTVL,
			borrowAvailable
		}
	}, [
		lendHistory,
		borrowHistory,
		farmHistory,
		configData,
		configsMap,
		lendToken,
		borrowToken,
		lendProjectCategory,
		project
	])

	const isLoading = fetchingLendData || fetchingBorrowData || fetchingFarmData || fetchingConfigData || fetchingConfig

	return (
		<>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 text-base xl:col-span-1">
					<h1 className="text-xl font-bold">APY Breakdown:</h1>
					<h2 className="flex items-center justify-between gap-1">
						<span className="font-bold">Strategy APY</span>
						<span className="ml-auto font-jetbrains">
							{isLoading || finalAPY == null ? '' : `${finalAPY.toFixed(2)}%`}
						</span>
					</h2>
					<div className="flex flex-col gap-1">
						<p className="flex items-center gap-1">
							<span>Supply APY:</span>
							<span className="ml-auto font-jetbrains">
								{isLoading || lendApy == null ? '' : `${lendApy.toFixed(2)}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Borrow APY:</span>
							<span className="ml-auto font-jetbrains">
								{isLoading || borrowApy == null ? '' : `${borrowApy.toFixed(2)}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Farm APY:</span>
							<span className="ml-auto font-jetbrains">
								{isLoading || farmApy == null ? '' : `${farmApy.toFixed(2)}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Max LTV:</span>
							<span className="ml-auto font-jetbrains">
								{isLoading || ltv == null ? '' : `${(ltv * 100).toFixed(2)}%`}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Available Borrow Liquidity:</span>
							<span className="ml-auto font-jetbrains">
								{isLoading || borrowAvailable == null ? '' : formattedNum(borrowAvailable, true)}
							</span>
						</p>
						<p className="flex items-center gap-1">
							<span>Farm TVL:</span>
							<span className="ml-auto font-jetbrains">
								{isLoading || farmTVL == null ? '' : formattedNum(farmTVL, true)}
							</span>
						</p>
					</div>
				</div>
				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<Suspense fallback={<div className="min-h-[398px]" />}>
						<MultiSeriesChart2
							title="Strategy APY"
							dataset={finalApyDataset}
							charts={APY_LINE_CHARTS}
							valueSymbol="%"
							exportButtons="auto"
						/>
					</Suspense>
				</div>
			</div>

			<div className="flex flex-col gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
				<h3 className="font-bold">Steps</h3>
				<p className="flex items-center gap-2">
					<span>1.</span>
					Lend {configsMap.get(lendToken)?.symbol} as collateral on {configsMap.get(lendToken)?.project} which earns a
					Supply APY of {lendApy?.toFixed(2)}%.
				</p>
				<p className="flex items-center gap-2">
					<span>2.</span>
					Borrow{' '}
					{lendProjectCategory !== 'CDP'
						? configsMap.get(borrowToken)?.symbol
						: configsMap.get(borrowToken)?.mintedCoin}{' '}
					against your {configsMap.get(lendToken)?.symbol} collateral with a max LTV of {(ltv * 100).toFixed()}% and a
					borrow APY of {borrowApy?.toFixed(2)}% (
					{borrowApy > 0 ? 'You get paid by borrowing' : 'The interest you need to pay'}).
				</p>

				{configsMap.get(borrowToken)?.symbol !== configsMap.get(farmToken)?.symbol && lendProjectCategory !== 'CDP' ? (
					<p className="flex items-center gap-2">
						<span>3.</span>
						Swap borrowed {configsMap.get(borrowToken)?.symbol} for {configsMap.get(farmToken)?.symbol}
					</p>
				) : null}

				<p className="flex items-center gap-2">
					{configsMap.get(borrowToken)?.symbol !== configsMap.get(farmToken)?.symbol ? (
						<span>4.</span>
					) : (
						<span>3.</span>
					)}
					Farm with {configsMap.get(farmToken)?.symbol} on {configsMap.get(farmToken)?.project} which earns{' '}
					{farmApy?.toFixed(2)}%.
				</p>

				{configsMap.get(lendToken)?.symbol === configsMap.get(borrowToken)?.symbol ? (
					// loop strategies
					<p className="flex items-center gap-2">
						Strategy APY = Recursively lend and borrow {configsMap.get(lendToken)?.symbol} up to n-times (Strategy APY
						is calculated assuming 10 loops)
					</p>
				) : (
					// non loop strategies
					<p className="flex items-center gap-2">
						Strategy APY = {lendApy?.toFixed(2)}% {borrowApy > 0 ? `+ ${borrowApy?.toFixed(2)}` : borrowApy?.toFixed(2)}
						% * {ltv?.toFixed(2)} + {farmApy?.toFixed(2)}% * {ltv?.toFixed(2)} = {finalAPY?.toFixed(2)}%
					</p>
				)}
			</div>

			<div className="grid grid-cols-2 gap-2 rounded-md">
				{fetchingLendData ? (
					<p className="col-span-full flex h-[400px] items-center justify-center gap-1 rounded-md border border-(--cards-border) bg-(--cards-bg) text-center">
						Loading
						<LoadingDots />
					</p>
				) : (
					lendHistory?.data?.length && (
						<>
							{barDatasetSupply?.source?.length ? (
								<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<Suspense fallback={<div className="min-h-[398px]" />}>
										<MultiSeriesChart2
											title="Supply APY"
											dataset={barDatasetSupply}
											charts={BAR_APY_CHARTS}
											valueSymbol="%"
											hideDefaultLegend={false}
											exportButtons="auto"
										/>
									</Suspense>
								</div>
							) : null}

							{barDatasetBorrow?.source?.length ? (
								<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<Suspense fallback={<div className="min-h-[398px]" />}>
										<MultiSeriesChart2
											title="Borrow APY"
											dataset={barDatasetBorrow}
											charts={BAR_APY_CHARTS}
											valueSymbol="%"
											hideDefaultLegend={false}
											exportButtons="auto"
										/>
									</Suspense>
								</div>
							) : null}

							{barDatasetFarm?.source?.length ? (
								<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
									<Suspense fallback={<div className="min-h-[398px]" />}>
										<MultiSeriesChart2
											title="Farm APY"
											dataset={barDatasetFarm}
											charts={BAR_APY_CHARTS}
											valueSymbol="%"
											hideDefaultLegend={false}
											exportButtons="auto"
										/>
									</Suspense>
								</div>
							) : null}
						</>
					)
				)}
			</div>
		</>
	)
}

export default function YieldPoolPage() {
	const { query } = useRouter()
	const strat = getFirstRouteParam(query.strat)

	return (
		<Layout
			title={strat ? `Strategy: ${strat} - DefiLlama Yield` : ''}
			description={
				strat
					? `Explore lend-borrow-farm strategies for ${strat} across all tracked pools on DefiLlama. Calculates total Strategy APY from individual yield components at each step.`
					: ''
			}
			canonicalUrl={strat ? `/yields/strategy/${strat}` : null}
		>
			<PageView />
		</Layout>
	)
}
