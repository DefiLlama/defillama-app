import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import AuditInfo from '~/components/AuditInfo'
import { YieldsSearch } from '~/components/Search'
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
	LazyChart
} from '~/layout/ProtocolAndPool'
import { PoolDetails } from '~/layout/Pool'
import { StatsSection, StatWrapper } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import FormattedName from '~/components/FormattedName'
import { BreakpointPanel } from '~/components'
import { useYieldChartData, useYieldConfigData, useYieldPoolData } from '~/api/categories/yield/client'
// import { getYieldPageData } from '~/api/categories/yield'
// import { CONFIG_API, YIELD_CHART_API, YIELD_POOLS_LAMBDA_API } from '~/constants'
// import { arrayFetcher } from '~/utils/useSWR'
// import { revalidate } from '~/api'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
})

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart/index'), {
	ssr: false
})

const Chart = dynamic(() => import('~/components/GlobalChart'), {
	ssr: false
})

const PageView = () => {
	const { query } = useRouter()

	const { data: pool, loading: fetchingPoolData } = useYieldPoolData(query.pool)

	const { data: chart, loading: fetchingChartData } = useYieldChartData(query.pool)

	const poolData = pool?.data ? pool.data[0] : {}

	const project = poolData.project ?? ''

	const { data: config, loading: fetchingConfigData } = useYieldConfigData(project)

	const configData = config ?? {}

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

	const projectName = configData.name ?? ''
	const audits = configData.audits ?? ''
	const audit_links = configData.audit_links ?? []
	const url = configData.url ?? ''
	const twitter = configData.twitter ?? ''
	const category = configData.category ?? ''

	const backgroundColor = '#696969'

	const stackedBarChartColors = {
		Base: backgroundColor,
		Reward: '#4f8fea'
	}

	const isLoading = fetchingPoolData || fetchingChartData || fetchingConfigData

	const { finalChartData, barChartData, areaChartData } = useMemo(() => {
		// prepare chart data
		let finalChartData = chart?.data
		// - calc 7day APY moving average
		const windowSize = 7
		const apyValues = finalChartData?.map((m) => m.apy)
		const avg = []
		for (let i = 0; i < apyValues?.length; i++) {
			if (i + 1 < windowSize) {
				avg[i] = null
			} else {
				avg[i] = apyValues.slice(i + 1 - windowSize, i + 1).reduce((a, b) => a + b, 0) / windowSize
			}
		}
		finalChartData = finalChartData?.map((m, i) => ({ ...m, avg7day: avg[i] }))

		// - format for chart components
		finalChartData = finalChartData?.map((el) => [
			// round time to day
			Math.floor(new Date(el.timestamp.split('T')[0]).getTime() / 1000),
			el.tvlUsd,
			el.apy?.toFixed(2) ?? null,
			el.apyBase?.toFixed(2) ?? null,
			el.apyReward?.toFixed(2) ?? null,
			el.avg7day?.toFixed(2) ?? null
		])

		const barChartData = [
			{
				name: 'Base',
				// remove entries with Base apy === null
				data: finalChartData?.length ? finalChartData.filter((t) => t[3] !== null).map((d) => [d[0] * 1000, d[3]]) : []
			},
			{
				name: 'Reward',
				// remove entries with Reward apy === null
				data: finalChartData?.length ? finalChartData.filter((t) => t[4] !== null).map((t) => [t[0] * 1000, t[4]]) : []
			}
		]

		const areaChartData = finalChartData?.length
			? finalChartData.filter((t) => t[5] !== null).map((t) => [t[0], t[5]])
			: []

		return { finalChartData, barChartData, areaChartData }
	}, [chart])

	return (
		<>
			<YieldsSearch step={{ category: 'Yields', name: poolData.symbol, hideOptions: true }} />

			<StatsSection>
				<PoolDetails>
					<Name>
						<FormattedName
							text={
								poolData.poolMeta !== undefined && poolData.poolMeta !== null && poolData.poolMeta.length > 1
									? `${poolData.symbol} (${poolData.poolMeta})`
									: poolData.symbol ?? 'Loading'
							}
							maxCharacters={16}
							fontWeight={700}
						/>
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
				<BreakpointPanel id="chartWrapper" style={{ border: 'none', borderRadius: '0 12px 12px 0', boxShadow: 'none' }}>
					<Chart
						display="liquidity"
						dailyData={finalChartData}
						totalLiquidity={poolData.tvlUsd}
						liquidityChange={poolData.apy}
						title="APY & TVL"
						dualAxis={true}
					/>
				</BreakpointPanel>
			</StatsSection>

			<ChartsWrapper>
				<LazyChart>
					<StackedBarChart
						title="Base and Reward APY"
						chartData={barChartData}
						color={backgroundColor}
						stackColors={stackedBarChartColors}
						showLegend={true}
						yields={true}
						valueSymbol={'%'}
					></StackedBarChart>
				</LazyChart>
				<LazyChart>
					<AreaChart
						title="7 day moving average of total APY"
						chartData={areaChartData}
						color={backgroundColor}
						valueSymbol={'%'}
					></AreaChart>
				</LazyChart>
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
