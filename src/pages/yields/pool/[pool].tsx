import { useRouter } from 'next/router'
import { lazy, Suspense, useMemo, useState } from 'react'
import { AddToDashboardButton } from '~/components/AddToDashboard'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { formatTvlApyTooltip } from '~/components/ECharts/formatters'
import type { IMultiSeriesChart2Props, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
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
	useYieldPoolData
} from '~/containers/Yields/queries/client'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>
const EMPTY_CHART_DATA: any[] = []
const EMPTY_TVL_APY_DATASET = { source: [] as any[], dimensions: ['timestamp', 'APY', 'TVL'] }

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

const EMPTY_BASE_REWARD_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp', 'Base', 'Reward'] }
const EMPTY_APY_DATASET: MultiSeriesChart2Dataset = { source: [], dimensions: ['timestamp', 'APY'] }
const EMPTY_LIQUIDITY_DATASET: MultiSeriesChart2Dataset = {
	source: [],
	dimensions: ['timestamp', 'Supplied', 'Borrowed', 'Available']
}

const PageView = (_props) => {
	const { query, isReady } = useRouter()

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

	const poolId = typeof query.pool === 'string' ? query.pool : null

	const { data: chart, isLoading: fetchingChartData } = useYieldChartData(poolId)

	const { data: chartBorrow, isLoading: fetchingChartDataBorrow } = useYieldChartLendBorrow(poolId)

	const { data: config, isLoading: fetchingConfigData } = useYieldConfigData(poolData.project ?? '')

	// prepare csv data
	const prepareCsv = () => {
		if (!chart?.data || !query?.pool) return { filename: `yields.csv`, rows: [] }
		const rows = [['APY', 'APY_BASE', 'APY_REWARD', 'TVL', 'DATE']]

		for (const item of chart?.data ?? EMPTY_CHART_DATA) {
			rows.push([item.apy, item.apyBase, item.apyReward, item.tvlUsd, item.timestamp])
		}

		return { filename: `${query.pool}.csv`, rows: rows as (string | number | boolean)[][] }
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

				<div className="col-span-2 rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex items-center justify-end gap-1 p-2">
						<AddToDashboardButton chartConfig={getYieldsChartConfig()} smol />
						<ChartExportButtons
							chartInstance={tvlApyChartInstance}
							filename={`${query.pool}-tvl-apy`}
							title={`${poolName} - ${projectName} (${poolData.chain})`}
						/>
					</div>
					<Suspense fallback={<div className="min-h-[360px]" />}>
						<MultiSeriesChart2
							dataset={tvlApyDataset}
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
					<div className="col-span-full flex h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<LocalLoader />
					</div>
				) : (
					<>
						{supplyApyBarDataset.source.length ? (
							<div className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
										dataset={supplyApyBarDataset}
										charts={BASE_REWARD_BAR_CHARTS}
										valueSymbol="%"
										hideDefaultLegend={false}
										onReady={handleSupplyApyReady}
									/>
								</Suspense>
							</div>
						) : null}
						{supplyApy7dDataset.source.length ? (
							<div className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
										dataset={supplyApy7dDataset}
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
				<div className="col-span-full flex h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : hasBorrowCharts ? (
				<div className="grid min-h-[408px] grid-cols-2 gap-2 rounded-md">
					{borrowApyBarDataset.source.length ? (
						<div className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
									dataset={borrowApyBarDataset}
									charts={BASE_REWARD_BAR_CHARTS}
									valueSymbol="%"
									hideDefaultLegend={false}
									onReady={handleBorrowApyReady}
								/>
							</Suspense>
						</div>
					) : null}
					{netBorrowApyDataset.source.length ? (
						<div className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
									dataset={netBorrowApyDataset}
									charts={SINGLE_APY_LINE_CHARTS}
									valueSymbol="%"
									onReady={handleNetBorrowApyReady}
								/>
							</Suspense>
						</div>
					) : null}

					{poolLiquidityDataset.source.length ? (
						<div className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
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
									dataset={poolLiquidityDataset}
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
	return (
		<Layout title={`Yields - DefiLlama`}>
			<PageView {...props} />
		</Layout>
	)
}
