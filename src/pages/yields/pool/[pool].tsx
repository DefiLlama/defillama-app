import { lazy, Suspense, useMemo } from 'react'
import { useRouter } from 'next/router'
import Layout from '~/layout'
import { AuditInfo } from '~/components/AuditInfo'
import { download, toK } from '~/utils'
import { LazyChart } from '~/components/LazyChart'
import {
	useYieldChartData,
	useYieldConfigData,
	useYieldPoolData,
	useYieldChartLendBorrow
} from '~/containers/Yields/queries/client'
import { getColorFromNumber } from '~/utils'
import { YIELD_RISK_API_EXPONENTIAL } from '~/constants'
import exponentialLogo from '~/assets/exponential.avif'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { useQuery } from '@tanstack/react-query'
import { fetchApi } from '~/utils/async'
import { Icon } from '~/components/Icon'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { BasicLink } from '~/components/Link'
import { defaultProtocolPageStyles } from '~/containers/ProtocolOverview/Chart/constants'

const BarChart = lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const Chart = lazy(() => import('~/components/ECharts/AreaChart2')) as React.FC<IChartProps>

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
	const { query } = useRouter()

	const { data: pool, isLoading: fetchingPoolData } = useYieldPoolData(query.pool)
	const poolData = pool?.data?.[0] ?? {}

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
	const downloadCsv = () => {
		const rows = [['APY', 'APY_BASE', 'APY_REWARD', 'TVL', 'DATE']]

		chart.data?.forEach((item) => {
			rows.push([item.apy, item.apyBase, item.apyReward, item.tvlUsd, item.timestamp])
		})

		download(`${query.pool}.csv`, rows.map((r) => r.join(',')).join('\n'))
	}

	const apy = poolData.apy?.toFixed(2) ?? 0
	const apyMean30d = poolData.apyMean30d?.toFixed(2) ?? 0
	const apyDelta20pct = (apy * 0.8).toFixed(2)

	const tvlUsd = toK(poolData.tvlUsd ?? 0)

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
	const audits = config?.audits ?? ''
	const audit_links = config?.audit_links ?? []
	const url = poolData.url ?? ''
	const twitter = config?.twitter ?? ''
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
			// @ts-ignore
			-el.apyBaseBorrow?.toFixed(2) ?? null,
			el.apyRewardBorrow?.toFixed(2) ?? null,
			el.apyBaseBorrow === null && el.apyRewardBorrow === null
				? null
				: (-el.apyBaseBorrow + el.apyRewardBorrow).toFixed(2) ?? null
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

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full rounded-md bg-(--cards-bg)">
				<p className="text-center">Loading...</p>
			</div>
		)
	}

	return (
		<>
			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-1">
				<div className="bg-(--cards-bg) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<h1 className="flex items-center gap-2 text-xl flex-wrap">
						{poolData.poolMeta !== undefined && poolData.poolMeta !== null && poolData.poolMeta.length > 1
							? `${poolData.symbol} (${poolData.poolMeta})`
							: poolData.symbol ?? 'Loading'}

						<span className="font-normal mr-auto">
							({projectName} - {poolData.chain})
						</span>
					</h1>

					<div className="flex items-end justify-between flex-wrap gap-5 relative">
						<p className="flex flex-col gap-1">
							<span className="text-base text-[#545757] dark:text-[#cccccc]">APY</span>
							<span className="font-semibold text-2xl font-jetbrains min-h-8 text-[#fd3c99]">{apy}%</span>
						</p>
						<p className="flex flex-col gap-1">
							<span className="text-base text-[#545757] dark:text-[#cccccc]">30d Avg APY</span>
							<span className="font-semibold text-2xl font-jetbrains min-h-8 text-[#fd3c99]">{apyMean30d}%</span>
						</p>
						<CSVDownloadButton onClick={downloadCsv} smol />
					</div>

					<p className="flex flex-col gap-1">
						<span className="text-base text-[#545757] dark:text-[#cccccc]">Total Value Locked</span>
						<span className="font-semibold text-2xl font-jetbrains min-h-8 text-[#4f8fea]">${tvlUsd}</span>
					</p>

					{hasRiskData && (
						<p className="flex flex-col items-start gap-1">
							<span className="text-base text-[#545757] dark:text-[#cccccc]">Total Risk Rating</span>
							<span className="flex items-center gap-2 flex-nowrap">
								<span
									className={`w-7 h-7 rounded-full flex items-center justify-center text-base font-bold ${
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
									className="flex items-center text-[#445ed0] dark:text-[#2172E5] hover:underline gap-1 font-semibold font-jetbrains text-xl"
								>
									<span>{getRatingDescription(riskData?.pool_rating)}</span>
									<Icon name="external-link" height={16} width={16} />
								</a>
							</span>
							<span className="text-xs font-bold mt-1">Assessed by exponential.fi</span>
						</p>
					)}

					<p className="flex flex-col gap-1">
						<span className="text-base text-[#545757] dark:text-[#cccccc]">Outlook</span>
						<span className="text-base leading-normal" style={isLoading ? { height: '60px' } : {}}>
							{confidence !== null
								? `The algorithm predicts the current APY of ${apy}% to ${predictedDirection} fall below ${apyDelta20pct}% within the next 4 weeks. Confidence: ${confidence}`
								: 'No outlook available'}
						</span>
					</p>
				</div>

				<LazyChart className="bg-(--cards-bg) rounded-md pt-3 col-span-2 min-h-[480px]">
					{!isLoading && (
						<Chart
							height="468px"
							chartData={finalChartData}
							stackColors={mainChartStackColors}
							stacks={mainChartStacks}
							title=""
						/>
					)}
				</LazyChart>
			</div>

			<div className="grid grid-cols-2 gap-1 rounded-md bg-(--cards-bg)">
				{hasRiskData && (
					<div className="flex flex-col col-span-2 xl:col-span-1 p-5">
						<h2 className="mb-6 flex items-center gap-3 text-lg font-bold">
							Risk Rating by exponential.fi{' '}
							<img src={exponentialLogo.src} height={24} width={24} style={{ marginBottom: 6 }} alt="" />
						</h2>
						<div className="flex flex-col items-start relative">
							<div className="flex flex-col justify-between flex-1 w-full relative">
								<div className="flex items-center p-1 border border-(--form-control-border) mb-3 last:mb-0 rounded-2xl gap-2">
									<p
										className="w-20 rounded-xl flex items-center justify-center font-bold text-sm py-1"
										style={getRatingColor(riskData?.pool_design?.rating_color)}
									>
										{riskData?.pool_design?.rating || 'N/A'}
									</p>
									<p className="text-sm flex-1">Pool Design</p>
								</div>
								<div className="flex items-center p-1 border border-(--form-control-border) mb-3 last:mb-0 rounded-2xl gap-2">
									<p
										className="w-20 rounded-xl flex items-center justify-center font-bold text-sm py-1"
										style={getRatingColor(riskData?.assets?.rating_color)}
									>
										{riskData?.assets?.rating || 'N/A'}
									</p>
									<p className="text-sm flex-1">Assets</p>
									<div className="flex items-center gap-1 ml-auto">
										{riskData?.assets?.underlying?.map((asset) => (
											<a
												className="py-1 px-2 text-xs rounded-2xl flex items-center gap-1 border"
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
								<div className="flex items-center p-1 border border-(--form-control-border) mb-3 last:mb-0 rounded-2xl gap-2">
									<p
										className="w-20 rounded-xl flex items-center justify-center font-bold text-sm py-1"
										style={getRatingColor(riskData?.protocols?.underlying[0]?.rating_color)}
									>
										{riskData?.protocols?.underlying[0]?.rating || 'N/A'}
									</p>
									<p className="text-sm flex-1">Protocols</p>
									<div className="flex items-center gap-1 ml-auto">
										{riskData?.protocols?.underlying
											?.filter((p) => p?.name)
											.map((protocol) => (
												<a
													className="py-1 px-2 text-xs rounded-2xl flex items-center gap-1 border"
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
								<div className="flex items-center p-1 border border-(--form-control-border) mb-3 last:mb-0 rounded-2xl gap-2">
									<p
										className="w-20 rounded-xl flex items-center justify-center font-bold text-sm py-1"
										style={getRatingColor(riskData?.chain?.rating_color)}
									>
										{riskData?.chain?.rating || 'N/A'}
									</p>
									<p className="text-sm flex-1">Chain</p>
									<div className="flex items-center gap-1 ml-auto">
										{riskData?.chain?.underlying
											?.filter((c) => c?.name)
											.map((chain) => (
												<a
													className="py-1 px-2 text-xs rounded-2xl flex items-center gap-1 border"
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
							<div className="flex flex-col justify-between flex-1 w-full relative">
								<div className="flex items-center justify-between rounded-xl min-w-[160px] mb-4 p-3">
									<h3 className="flex items-center gap-1 text-base font-bold">
										<span
											className={`w-7 h-7 rounded-full flex items-center justify-center ${
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
										className="font-medium flex items-center gap-2 text-[#445ed0] dark:text-[#2172E5] hover:underline"
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
					<p className="flex items-center justify-center text-center h-[400px] col-span-full">Loading...</p>
				) : (
					<>
						{barChartData?.length ? (
							<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<Suspense fallback={<></>}>
									<BarChart
										title="Supply APY"
										chartData={barChartData}
										stacks={barChartStacks}
										stackColors={barChartColors}
										valueSymbol={'%'}
									/>
								</Suspense>
							</LazyChart>
						) : null}
						{areaChartData.length ? (
							<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<Suspense fallback={<></>}>
									<AreaChart
										title="7 day moving average of Supply APY"
										chartData={areaChartData}
										color={backgroundColor}
										valueSymbol={'%'}
									/>
								</Suspense>
							</LazyChart>
						) : null}
					</>
				)}
			</div>

			<div className="grid grid-cols-2 gap-1 rounded-md bg-(--cards-bg)">
				{fetchingChartDataBorrow ? (
					<p className="flex items-center justify-center text-center h-[400px] col-span-full">Loading...</p>
				) : (
					<>
						{areaChartDataBorrow?.length ? (
							<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<Suspense fallback={<></>}>
									<BarChart
										title="Borrow APY"
										chartData={barChartDataBorrow}
										stacks={barChartStacks}
										stackColors={barChartColors}
										valueSymbol={'%'}
									/>
								</Suspense>
							</LazyChart>
						) : null}
						{areaChartDataBorrow.length ? (
							<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<Suspense fallback={<></>}>
									<AreaChart
										title="Net Borrow APY"
										chartData={netBorrowChartData}
										color={backgroundColor}
										valueSymbol={'%'}
									/>
								</Suspense>
							</LazyChart>
						) : null}

						{areaChartDataBorrow?.length ? (
							<LazyChart className="relative col-span-full min-h-[360px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
								<Suspense fallback={<></>}>
									<AreaChart
										chartData={areaChartDataBorrow}
										title="Pool Liquidity"
										customLegendName="Filter"
										customLegendOptions={['Supplied', 'Borrowed', 'Available']}
										valueSymbol="$"
										stackColors={liquidityChartColors}
									/>
								</Suspense>
							</LazyChart>
						) : null}
					</>
				)}
			</div>
			<div className="flex flex-col gap-4 bg-(--cards-bg) rounded-md p-5">
				<h3 className="font-semibold text-lg">Protocol Information</h3>
				<p className="flex items-center gap-2">
					<span>Category</span>
					<span>:</span>
					<BasicLink href={`/protocols/${category.toLowerCase()}`}>{category}</BasicLink>
				</p>

				<AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} isLoading={isLoading} />

				<div className="flex items-center gap-4 flex-wrap">
					{(url || isLoading) && (
						<a
							href={url}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
						>
							<span>Website</span> <Icon name="arrow-up-right" height={14} width={14} />
						</a>
					)}

					{twitter && (
						<a
							href={`https://twitter.com/${twitter}`}
							target="_blank"
							rel="noopener noreferrer"
							className="flex items-center gap-1 text-xs font-medium py-1 px-3 rounded-md bg-(--btn-bg) whitespace-nowrap hover:bg-(--btn-hover-bg)"
						>
							<span>Twitter</span> <Icon name="arrow-up-right" height={14} width={14} />
						</a>
					)}
				</div>
			</div>
		</>
	)
}

const backgroundColor = '#4f8fea'

const mainChartStacks = ['APY', 'TVL']

const mainChartStackColors = {
	APY: '#fd3c99',
	TVL: '#4f8fea'
}

const barChartColors = {
	Base: backgroundColor,
	Reward: '#E59421'
}

const liquidityChartColors = {
	Supplied: getColorFromNumber(0, 6),
	Borrowed: getColorFromNumber(1, 6),
	Available: getColorFromNumber(2, 6)
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
		<Layout title={`Yield Chart - DefiLlama`} style={defaultProtocolPageStyles} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}
