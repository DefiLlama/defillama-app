import { lazy, Suspense, useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import exponentialLogo from '~/assets/exponential.avif'
import { ChartExportButton } from '~/components/ButtonStyled/ChartExportButton'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'
import { BasicLink } from '~/components/Link'
import { LocalLoader } from '~/components/Loaders'
import { Menu } from '~/components/Menu'
import { QuestionHelper } from '~/components/QuestionHelper'
import { YIELD_RISK_API_EXPONENTIAL } from '~/constants'
import { CHART_COLORS } from '~/constants/colors'
import {
	useYieldChartData,
	useYieldChartLendBorrow,
	useYieldConfigData,
	useYieldPoolData
} from '~/containers/Yields/queries/client'
import { useChartImageExport } from '~/hooks/useChartImageExport'
import Layout from '~/layout'
import { formattedNum, slug } from '~/utils'
import { fetchApi } from '~/utils/async'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const TVLAPYChart = lazy(() => import('~/components/ECharts/TVLAPYChart')) as React.FC<IChartProps>

const getRatingColor = (rating) => {
	switch (rating?.toLowerCase()) {
		case 'green':
			return { backgroundColor: '#009400', color: 'white' }
		case 'yellow':
			return { backgroundColor: '#b69f1c', color: 'black' }
		case 'red':
			return { backgroundColor: 'firebrick', color: 'white' }
		default:
			return { backgroundColor: '#9E9E9E', color: 'white' }
	}
}

const getRatingDescription = (rating) => {
	switch (rating?.toLowerCase()) {
		case 'a':
			return 'Lowest risk'
		case 'b':
			return 'Low risk'
		case 'c':
			return 'Medium risk'
		case 'd':
			return 'High risk'
		case 'f':
			return 'Highest risk'
		default:
			return 'Not rated'
	}
}

const PageView = (props) => {
	const { query, isReady } = useRouter()

	const { data: pool, isLoading: fetchingPoolData } = useYieldPoolData(query.pool)
	const poolData = pool?.data?.[0] ?? {}

	const { chartInstance: tvlApyChartInstance, handleChartReady: handleTvlApyChartReady } = useChartImageExport()
	const { chartInstance: supplyApyBarChartInstance, handleChartReady: handleSupplyApyBarChartReady } =
		useChartImageExport()
	const { chartInstance: supplyApy7dChartInstance, handleChartReady: handleSupplyApy7dChartReady } =
		useChartImageExport()
	const { chartInstance: borrowApyBarChartInstance, handleChartReady: handleBorrowApyBarChartReady } =
		useChartImageExport()
	const { chartInstance: netBorrowApyChartInstance, handleChartReady: handleNetBorrowApyChartReady } =
		useChartImageExport()
	const { chartInstance: poolLiquidityChartInstance, handleChartReady: handlePoolLiquidityChartReady } =
		useChartImageExport()

	const riskUrl = poolData?.project
		? `${YIELD_RISK_API_EXPONENTIAL}?${new URLSearchParams({
				pool_old: cleanPool(poolData.pool_old),
				chain: poolData.chain?.toLowerCase(),
				project: poolData.project,
				tvlUsd: poolData.tvlUsd.toString()
			})}&${poolData.underlyingTokens
				?.map((token) => `underlyingTokens[]=${encodeURIComponent(token?.toLowerCase())}`)
				.join('&')}`
		: null
	const {
		data: riskData,
		isLoading: isRiskLoading,
		error: riskError
	} = useQuery({
		queryKey: ['risk-data', riskUrl],
		queryFn: riskUrl ? () => fetchApi(riskUrl).then((data) => data.data.data) : () => null,
		staleTime: 60 * 60 * 1000
	})

	const { data: chart, isLoading: fetchingChartData } = useYieldChartData(query.pool)

	const { data: chartBorrow, isLoading: fetchingChartDataBorrow } = useYieldChartLendBorrow(query.pool)

	const { data: config, isLoading: fetchingConfigData } = useYieldConfigData(poolData.project ?? '')

	// prepare csv data
	const prepareCsv = useCallback(() => {
		if (!chart?.data || !query?.pool) return { filename: `yields.csv`, rows: [] }
		const rows = [['APY', 'APY_BASE', 'APY_REWARD', 'TVL', 'DATE']]

		chart?.data?.forEach((item) => {
			rows.push([item.apy, item.apyBase, item.apyReward, item.tvlUsd, item.timestamp])
		})

		return { filename: `${query.pool}.csv`, rows: rows as (string | number | boolean)[][] }
	}, [chart?.data, query?.pool])

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

	const {
		finalChartData = [],
		barChartData = [],
		areaChartData = [],
		// borrow stuff
		barChartDataSupply = [],
		barChartDataBorrow = [],
		areaChartDataBorrow = [],
		netBorrowChartData = []
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

		const dataBar = data?.filter((t) => t[3] !== null || t[4] !== null) ?? []

		const barChartData = dataBar.length
			? dataBar.map((item) => ({ date: item[0], Base: item[3], Reward: item[4] }))
			: []

		const areaChartData = data?.length ? data.filter((t) => t[5] !== null).map((t) => [t[0], t[5]]) : []

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
			// @ts-expect-error - apyBaseBorrow is not typed
			-el.apyBaseBorrow?.toFixed(2) ?? null,
			el.apyRewardBorrow?.toFixed(2) ?? null,
			el.apyBaseBorrow === null && el.apyRewardBorrow === null
				? null
				: ((-el.apyBaseBorrow + el.apyRewardBorrow).toFixed(2) ?? null)
		])

		const dataBarSupply = dataBorrow?.filter((t) => t[4] !== null || t[5] !== null) ?? []
		const barChartDataSupply = dataBarSupply.length
			? dataBarSupply.map((item) => ({ date: item[0], Base: item[4], Reward: item[5] }))
			: []

		const dataBarBorrow = dataBorrow?.filter((t) => Number.isFinite(t[6]) || t[7] !== null) ?? []
		const barChartDataBorrow = dataBarBorrow.length
			? dataBarBorrow.map((item) => ({ date: item[0], Base: item[6], Reward: item[7] }))
			: []

		const dataArea = dataBorrow?.filter((t) => t[1] !== null && t[2] !== null && t[3] !== null) ?? []
		const areaChartDataBorrow = dataArea.length
			? dataArea.map((t) => ({ date: t[0], Supplied: t[1], Borrowed: t[2], Available: t[3] }))
			: []

		const dataNetBorrowArea = dataBorrow?.filter((t) => t[8] !== null) ?? []
		const netBorrowChartData = dataNetBorrowArea.length ? dataNetBorrowArea.map((t) => [t[0], t[8]]) : []

		return {
			finalChartData: data.map((item) => ({ date: item[0], TVL: item[1], APY: item[2] })),
			barChartData,
			areaChartData,
			barChartDataSupply,
			barChartDataBorrow,
			areaChartDataBorrow,
			netBorrowChartData
		}
	}, [chart, chartBorrow, category])

	const hasRiskData =
		!isRiskLoading &&
		!riskError &&
		(riskData?.assets?.underlying?.some((a) => a?.rating) ||
			riskData?.protocols?.underlying?.some((p) => p?.rating) ||
			riskData?.chain?.underlying?.some((c) => c?.rating))

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
						{poolData.poolMeta !== undefined && poolData.poolMeta !== null && poolData.poolMeta.length > 1
							? `${poolData.symbol} (${poolData.poolMeta})`
							: poolData.symbol}

						<span className="mr-auto font-normal">
							({projectName} - {poolData.chain})
						</span>
					</h1>

					<div className="flex flex-col gap-2 text-base">
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">APY</span>
							<span className="font-jetbrains ml-auto text-(--apy-pink)">{isLoading ? null : `${apy}%`}</span>
						</p>
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">30d Avg APY</span>
							<span className="font-jetbrains ml-auto text-(--apy-pink)">{isLoading ? null : `${apyMean30d}%`}</span>
						</p>
						<p className="flex items-center justify-between gap-1">
							<span className="font-semibold">Total Value Locked</span>
							<span className="font-jetbrains ml-auto text-(--apy-blue)">
								{isLoading ? null : formattedNum(poolData.tvlUsd ?? 0, true)}
							</span>
						</p>
					</div>

					{hasRiskData && (
						<p className="flex flex-col items-start gap-1">
							<span className="font-semibold">Total Risk Rating</span>
							<span className="flex flex-nowrap items-center gap-2">
								<span
									className={`flex h-7 w-7 items-center justify-center rounded-full text-base font-bold ${
										riskData?.pool_rating ? 'text-base' : 'text-sm'
									}`}
									style={getRatingColor(riskData?.pool_rating_color)}
								>
									{riskData?.pool_rating || 'N/A'}
								</span>
								<a
									href={riskData?.pool_url ? riskData?.pool_url : `https://exponential.fi/about-us`}
									target="_blank"
									rel="noopener noreferrer"
									className="font-jetbrains flex items-center gap-1 text-xl font-semibold hover:underline"
								>
									<span>{getRatingDescription(riskData?.pool_rating)}</span>
									<Icon name="external-link" height={16} width={16} />
								</a>
							</span>
							<span className="mt-1 text-xs">Assessed by exponential.fi</span>
						</p>
					)}

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
					<div className="flex items-center justify-end p-2">
						<ChartExportButton
							chartInstance={tvlApyChartInstance}
							filename={`${query.pool}-tvl-apy`}
							title="TVL & APY"
							className="flex items-center justify-center gap-1 rounded-md border border-(--form-control-border) px-2 py-1.5 text-xs text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) disabled:text-(--text-disabled)"
							smol
						/>
					</div>
					<Suspense fallback={<></>}>
						<TVLAPYChart
							height="468px"
							chartData={finalChartData}
							stackColors={mainChartStackColors}
							stacks={mainChartStacks}
							title=""
							onReady={handleTvlApyChartReady}
						/>
					</Suspense>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-2">
				{hasRiskData && (
					<div className="col-span-2 flex flex-col gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-2 xl:col-span-1">
						<h2 className="flex items-center text-lg font-bold">
							Risk Rating by exponential.fi{' '}
							<img src={exponentialLogo.src} height={24} width={24} style={{ marginBottom: 6 }} alt="" />
						</h2>
						<div className="relative flex flex-col items-start gap-3">
							<div className="relative flex w-full flex-1 flex-col justify-between gap-3">
								<div className="flex items-center gap-2 rounded-2xl border border-(--form-control-border) p-1">
									<p
										className="flex w-20 items-center justify-center rounded-xl py-1 text-sm font-bold"
										style={getRatingColor(riskData?.pool_design?.rating_color)}
									>
										{riskData?.pool_design?.rating || 'N/A'}
									</p>
									<p className="flex-1 text-sm">Pool Design</p>
								</div>
								<div className="flex items-center gap-2 rounded-2xl border border-(--form-control-border) p-1">
									<p
										className="flex w-20 items-center justify-center rounded-xl py-1 text-sm font-bold"
										style={getRatingColor(riskData?.assets?.rating_color)}
									>
										{riskData?.assets?.rating || 'N/A'}
									</p>
									<p className="flex-1 text-sm">Assets</p>
									<div className="ml-auto flex items-center gap-1">
										{riskData?.assets?.underlying?.map((asset) => (
											<a
												className="flex items-center gap-1 rounded-2xl border px-2 py-1 text-xs"
												key={`asset-underlying-${asset.name}-${asset.url}`}
												style={{ borderColor: getRatingColor(asset.rating_color).backgroundColor }}
												href={asset.url}
												target="_blank"
												rel="noreferrer noopener"
											>
												{asset.name} {asset.url ? <Icon name="arrow-up-right" height={14} width={14} /> : null}
											</a>
										))}
									</div>
								</div>
								<div className="flex items-center gap-2 rounded-2xl border border-(--form-control-border) p-1">
									<p
										className="flex w-20 items-center justify-center rounded-xl py-1 text-sm font-bold"
										style={getRatingColor(riskData?.protocols?.underlying[0]?.rating_color)}
									>
										{riskData?.protocols?.underlying[0]?.rating || 'N/A'}
									</p>
									<p className="flex-1 text-sm">Protocols</p>
									<div className="ml-auto flex items-center gap-1">
										{riskData?.protocols?.underlying
											?.filter((p) => p?.name)
											.map((protocol) => (
												<a
													className="flex items-center gap-1 rounded-2xl border px-2 py-1 text-xs"
													key={`protocol-underlying-${protocol.name}-${protocol.url}`}
													style={{ borderColor: getRatingColor(protocol.rating_color).backgroundColor }}
													href={protocol.url}
													target="_blank"
													rel="noreferrer noopener"
												>
													{protocol.name} {protocol.url ? <Icon name="arrow-up-right" height={14} width={14} /> : null}
												</a>
											))}
									</div>
								</div>
								<div className="flex items-center gap-2 rounded-2xl border border-(--form-control-border) p-1">
									<p
										className="flex w-20 items-center justify-center rounded-xl py-1 text-sm font-bold"
										style={getRatingColor(riskData?.chain?.rating_color)}
									>
										{riskData?.chain?.rating || 'N/A'}
									</p>
									<p className="flex-1 text-sm">Chain</p>
									<div className="ml-auto flex items-center gap-1">
										{riskData?.chain?.underlying
											?.filter((c) => c?.name)
											.map((chain) => (
												<a
													className="flex items-center gap-1 rounded-2xl border px-2 py-1 text-xs"
													key={`chain-underlying-${chain.name}-${chain.url}`}
													style={{ borderColor: getRatingColor(chain.rating_color).backgroundColor }}
													href={chain.url}
													target="_blank"
													rel="noreferrer noopener"
												>
													{chain.name} {chain.url ? <Icon name="arrow-up-right" height={14} width={14} /> : null}
												</a>
											))}
									</div>
								</div>
							</div>
							<div className="relative flex w-full flex-1 flex-col justify-between gap-3">
								<div className="flex min-w-[160px] items-center justify-between rounded-xl px-1">
									<h3 className="flex items-center gap-1 text-base font-bold">
										<span
											className={`flex h-7 w-7 items-center justify-center rounded-full ${
												riskData?.pool_rating ? 'text-base' : 'text-sm'
											}`}
											style={getRatingColor(riskData?.pool_rating_color)}
										>
											{riskData?.pool_rating || 'N/A'}
										</span>
										<span>{getRatingDescription(riskData?.pool_rating)}</span>
									</h3>
									<a
										href={riskData?.pool_url || 'https://exponential.fi/about-us'}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 font-medium text-(--link-text) hover:underline"
									>
										<span>{riskData?.pool_url ? 'Open Report' : 'About exponential.fi'}</span>
										<Icon name="external-link" height={16} width={16} />
									</a>
								</div>
							</div>
						</div>
					</div>
				)}

				{isLoading ? (
					<div className="col-span-full flex h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<LocalLoader />
					</div>
				) : (
					<>
						{barChartData?.length ? (
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<Suspense fallback={<></>}>
									<BarChart
										title="Supply APY"
										chartData={barChartData}
										stacks={barChartStacks}
										stackColors={barChartColors}
										valueSymbol={'%'}
										enableImageExport={true}
										imageExportFilename={`${query.pool}-supply-apy`}
										imageExportTitle="Supply APY"
										onReady={handleSupplyApyBarChartReady}
									/>
								</Suspense>
							</LazyChart>
						) : null}
						{areaChartData.length ? (
							<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<Suspense fallback={<></>}>
									<AreaChart
										title="7 day moving average of Supply APY"
										chartData={areaChartData}
										color={CHART_COLORS[0]}
										valueSymbol={'%'}
										enableImageExport={true}
										imageExportFilename={`${query.pool}-supply-apy-7d-avg`}
										imageExportTitle="7 day moving average of Supply APY"
										onReady={handleSupplyApy7dChartReady}
									/>
								</Suspense>
							</LazyChart>
						) : null}
					</>
				)}
			</div>

			{fetchingChartDataBorrow ? (
				<div className="col-span-full flex h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<LocalLoader />
				</div>
			) : areaChartDataBorrow?.length ? (
				<div className="grid min-h-[408px] grid-cols-2 gap-2 rounded-md">
					{areaChartDataBorrow?.length ? (
						<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<Suspense fallback={<></>}>
								<BarChart
									title="Borrow APY"
									chartData={barChartDataBorrow}
									stacks={barChartStacks}
									stackColors={barChartColors}
									valueSymbol={'%'}
									enableImageExport={true}
									imageExportFilename={`${query.pool}-borrow-apy`}
									imageExportTitle="Borrow APY"
									onReady={handleBorrowApyBarChartReady}
								/>
							</Suspense>
						</LazyChart>
					) : null}
					{areaChartDataBorrow.length ? (
						<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<Suspense fallback={<></>}>
								<AreaChart
									title="Net Borrow APY"
									chartData={netBorrowChartData}
									color={CHART_COLORS[0]}
									valueSymbol={'%'}
									enableImageExport={true}
									imageExportFilename={`${query.pool}-net-borrow-apy`}
									imageExportTitle="Net Borrow APY"
									onReady={handleNetBorrowApyChartReady}
								/>
							</Suspense>
						</LazyChart>
					) : null}

					{areaChartDataBorrow?.length ? (
						<LazyChart className="relative col-span-full flex min-h-[408px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<Suspense fallback={<></>}>
								<AreaChart
									chartData={areaChartDataBorrow}
									title="Pool Liquidity"
									customLegendName="Filter"
									customLegendOptions={['Supplied', 'Borrowed', 'Available']}
									valueSymbol="$"
									stackColors={liquidityChartColors}
									enableImageExport={true}
									imageExportFilename={`${query.pool}-pool-liquidity`}
									imageExportTitle="Pool Liquidity"
								/>
							</Suspense>
						</LazyChart>
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
							href={`https://twitter.com/${config.twitter}`}
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

const mainChartStacks = ['APY', 'TVL']

const mainChartStackColors = {
	APY: '#fd3c99',
	TVL: '#4f8fea'
}

const barChartColors = {
	Base: CHART_COLORS[0],
	Reward: CHART_COLORS[1]
}

const liquidityChartColors = {
	Supplied: CHART_COLORS[0],
	Borrowed: CHART_COLORS[1],
	Available: CHART_COLORS[2]
}

const barChartStacks = {
	Base: 'a',
	Reward: 'a'
}

function cleanPool(pool) {
	// some pool fields contain chain (or other) info as prefix/suffix
	// need to remove these parts from api call, otherwise we won't receive the total risk score

	// for 0x addresses
	// match 0x followed by at least 40 hexadecimal characters balancer pool ids have length 64)
	const pattern = /0x[a-fA-F0-9]{40,}/

	const match = pool.match(pattern)

	// for non 0x addresses return pool as is
	return match ? match[0] : pool
}

export default function YieldPoolPage(props) {
	return (
		<Layout title={`Yields - DefiLlama`}>
			<PageView {...props} />
		</Layout>
	)
}
