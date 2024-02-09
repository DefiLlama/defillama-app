import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import AuditInfo from '~/components/AuditInfo'
import { download, toK } from '~/utils'
import {
	Button,
	DownloadButton,
	FlexRow,
	InfoWrapper,
	LinksWrapper,
	Name,
	Section,
	Symbol,
	ChartsWrapper,
	LazyChart,
	ChartsPlaceholder
} from '~/layout/ProtocolAndPool'
import { PoolDetails } from '~/layout/Pool'
import { StatsSection, StatWrapper } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import {
	useYieldChartData,
	useYieldConfigData,
	useYieldPoolData,
	useYieldChartLendBorrow
} from '~/api/categories/yield/client'
import { getColorFromNumber } from '~/utils'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false,
	loading: () => <></>
})

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => <></>
})

const Chart = dynamic(() => import('~/components/ECharts/AreaChart2'), {
	ssr: false,
	loading: () => <></>
})

const PageView = () => {
	const { query } = useRouter()

	const { data: pool, loading: fetchingPoolData } = useYieldPoolData(query.pool)

	const { data: chart, loading: fetchingChartData } = useYieldChartData(query.pool)

	const { data: chartBorrow, loading: fetchingChartDataBorrow } = useYieldChartLendBorrow(query.pool)

	const poolData = pool?.data?.[0] ?? {}

	const { data: config, loading: fetchingConfigData } = useYieldConfigData(poolData.project ?? '')

	// prepare csv data
	const downloadCsv = () => {
		const rows = [['APY', 'APY_BASE', 'APY_REWARD', 'TVL', 'DATE']]

		chart.data?.forEach((item) => {
			rows.push([item.apy, item.apyBase, item.apyReward, item.tvlUsd, item.timestamp])
		})

		download(`${query.pool}.csv`, rows.map((r) => r.join(',')).join('\n'))
	}

	const apy = poolData.apy?.toFixed(2) ?? 0

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

	return (
		<>
			<StatsSection>
				<PoolDetails>
					<Name style={{ flexWrap: 'wrap' }}>
						{poolData.poolMeta !== undefined && poolData.poolMeta !== null && poolData.poolMeta.length > 1
							? `${poolData.symbol} (${poolData.poolMeta})`
							: poolData.symbol ?? 'Loading'}

						<Symbol>
							({projectName} - {poolData.chain})
						</Symbol>
					</Name>

					<StatWrapper>
						<Stat>
							<span>Total APY</span>
							<span style={{ color: '#fd3c99' }}>{apy}%</span>
						</Stat>
						<DownloadButton as="button" onClick={downloadCsv}>
							<DownloadCloud size={14} />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</StatWrapper>

					<Stat>
						<span>Total Value Locked</span>
						<span style={{ color: '#4f8fea' }}>${tvlUsd}</span>
					</Stat>

					<Stat>
						<span>Outlook</span>
						{isLoading ? (
							<span style={{ height: '60px' }}></span>
						) : (
							<span data-default-style>
								{confidence !== null
									? `The algorithm predicts the current APY of ${apy}% to ${predictedDirection} fall below ${apyDelta20pct}% within the next 4 weeks. Confidence: ${confidence}`
									: 'No outlook available'}
							</span>
						)}
					</Stat>
				</PoolDetails>

				<LazyChart style={{ padding: '20px 0' }}>
					{!isLoading && (
						<Chart chartData={finalChartData} stackColors={mainChartStackColors} stacks={mainChartStacks} title="" />
					)}
				</LazyChart>
			</StatsSection>

			<ChartsWrapper>
				{isLoading ? (
					<ChartsPlaceholder>Loading...</ChartsPlaceholder>
				) : (
					<>
						{barChartData?.length ? (
							<LazyChart>
								<StackedBarChart
									title="Supply APY"
									chartData={barChartData}
									stacks={barChartStacks}
									stackColors={stackedBarChartColors}
									valueSymbol={'%'}
								/>
							</LazyChart>
						) : null}
						{areaChartData.length ? (
							<LazyChart>
								<AreaChart
									title="7 day moving average of Supply APY"
									chartData={areaChartData}
									color={backgroundColor}
									valueSymbol={'%'}
								/>
							</LazyChart>
						) : null}
					</>
				)}
			</ChartsWrapper>

			<ChartsWrapper>
				{fetchingChartDataBorrow ? (
					<ChartsPlaceholder>Loading...</ChartsPlaceholder>
				) : (
					<>
						{areaChartDataBorrow?.length ? (
							<LazyChart>
								<StackedBarChart
									title="Borrow APY"
									chartData={barChartDataBorrow}
									stacks={barChartStacks}
									stackColors={stackedBarChartColors}
									valueSymbol={'%'}
								/>
							</LazyChart>
						) : null}
						{areaChartDataBorrow.length ? (
							<LazyChart>
								<AreaChart
									title="Net Borrow APY"
									chartData={netBorrowChartData}
									color={backgroundColor}
									valueSymbol={'%'}
								/>
							</LazyChart>
						) : null}

						{areaChartDataBorrow?.length ? (
							<LazyChart>
								<AreaChart
									chartData={areaChartDataBorrow}
									title="Pool Liquidity"
									customLegendName="Filter"
									customLegendOptions={['Supplied', 'Borrowed', 'Available']}
									valueSymbol="$"
									stackColors={liquidityChartColors}
								/>
							</LazyChart>
						) : null}
					</>
				)}
			</ChartsWrapper>

			<InfoWrapper>
				<Section>
					<h3>Protocol Information</h3>
					<FlexRow>
						<span>Category</span>
						<span>:</span>
						<Link href={`/protocols/${category.toLowerCase()}`}>{category}</Link>
					</FlexRow>

					<AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} isLoading={isLoading} />

					<LinksWrapper>
						{(url || isLoading) && (
							<Link href={url} passHref>
								<Button
									as="a"
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={backgroundColor}
									disabled={isLoading}
								>
									<span>Website</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}

						{twitter && (
							<Link href={`https://twitter.com/${twitter}`} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
									<span>Twitter</span> <ArrowUpRight size={14} />
								</Button>
							</Link>
						)}
					</LinksWrapper>
				</Section>
			</InfoWrapper>
		</>
	)
}

const backgroundColor = '#4f8fea'

const mainChartStacks = ['APY', 'TVL']

const mainChartStackColors = {
	APY: '#fd3c99',
	TVL: '#4f8fea'
}

const stackedBarChartColors = {
	Base: backgroundColor,
	Reward: '#E59421'
}

const liquidityChartColors = {}
	;[('Supplied', 'Borrowed', 'Available')].forEach((l, index) => {
		liquidityChartColors[l] = getColorFromNumber(index, 6)
	})

const barChartStacks = {
	Base: 'a',
	Reward: 'a'
}

export default function YieldPoolPage(props) {
	return (
		<Layout title={`Yield Chart - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}

// export async function getStaticPaths() {
// 	const res = await getYieldPageData()

// 	const paths = res.props.pools.slice(0, 30).map(({ pool }) => {
// 		return {
// 			params: { pool: [pool] }
// 		}
// 	})

// 	return { paths, fallback: 'blocking' }
// }

// export async function getStaticProps({
// 	params: {
// 		pool: [pool]
// 	}
// }) {
// 	const poolUrl = `${YIELD_POOLS_LAMBDA_API}?pool=${pool}`
// 	const chartUrl = `${YIELD_CHART_API}/${pool}`

// 	const res = await arrayFetcher([poolUrl, chartUrl])

// 	const poolData = res[0]?.data?.[0] ?? {}

// 	const configData = await fetch(`${CONFIG_API}/smol/${poolData.project}`).then((res) => res.json())

// 	return {
// 		props: {
// 			poolData: res[0]?.data?.[0] ?? {},
// 			chart: res[1]?.data ?? [],
// 			configData
// 		},
// 		revalidate: revalidate(23)
// 	}
// }
