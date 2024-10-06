import { useMemo } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowUpRight, DownloadCloud, CheckCircle, Circle } from 'react-feather'
import styled from 'styled-components'
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
import { YIELD_POOLS_LAMBDA_API, YIELD_RISK_API_EXPONENTIAL } from '~/constants'
import { ExternalLink } from '~/components/Link'

import exponentialLogo from '~/assets/exponential.avif'

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

const RiskRating = styled(Stat)`
	flex-direction: column;
	align-items: flex-start;
`

const RatingLink = styled(ExternalLink)`
	display: flex;
	align-items: center;
	gap: 0px;
`

const RatingWrapper = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`

const RatingCircle = styled.div`
	width: 30px;
	height: 30px;
	border-radius: 50%;
	background-color: ${(props) => props.color};
	display: flex;
	justify-content: center;
	align-items: center;
	color: white;
	font-weight: bold;
	font-size: 1rem;
`

const RatingText = styled.span`
	font-size: 1.2rem;
	font-weight: bold;
`

const RatingDescription = styled.span`
	font-size: 1.2rem;
`

const AssessedBy = styled.span`
	font-size: 0.7rem;
	font-weight: bold;
	margin-top: 4px;
`

const getRatingColor = (rating) => {
	switch (rating?.toLowerCase()) {
		case 'green':
			return '#009400'
		case 'yellow':
			return '#b69f1c'
		case 'red':
			return 'firebrick'
		default:
			return '#9E9E9E'
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

const RiskRatingSection = styled.div`
	display: flex;
	flex-direction: column;
	background: ${({ theme }) => theme.bg6};
	border-radius: 12px;
	padding: 24px;

	@media screen and (max-width: 80rem) {
		grid-column: span 2;
	}
`

const RiskRatingTitle = styled.h2`
	font-size: 1.2rem;
	margin-bottom: 24px;
	color: ${({ theme }) => theme.text1};
	display: flex;
	align-items: center;
	gap: 12px;
`

const RiskRatingContent = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	position: relative;
`

const TotalRiskWrapper = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	border-radius: 12px;
	padding: 12px;
	margin-bottom: 16px;
	min-width: 160px;
`

const ResultWrapper = styled.div`
	display: flex;
	align-items: center;
`

const TotalRiskCircle = styled.div<{ color: string }>`
	width: 30px;
	height: 30px;
	border-radius: 50%;
	background-color: ${(props) => getRatingColor(props.color)};
	display: flex;
	justify-content: center;
	align-items: center;
	margin-right: 16px;
`

const TotalRiskGrade = styled.span`
	font-size: 16px;
	font-weight: bold;
	color: white;
`

const TotalRiskInfo = styled.div`
	display: flex;
	flex-direction: column;
`

const OpenReportButton = styled(Button)`
	padding: 8px 12px;
	font-size: 0.9rem;
`

const FactorsContainer = styled.div`
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	flex-grow: 1;
	width: 100%;
	position: relative;
`

const TotalRiskContainer = styled(FactorsContainer)``

const Factor = styled.div`
	display: flex;
	align-items: center;
	border: 1px solid ${({ theme }) => theme.text4};
	border-radius: 16px;
	padding: 6px;
	position: relative;
	margin-bottom: 12px;
	font-weight: semibold;
`

const FactorBadge = styled.div<{ color: string }>`
	background-color: ${(props) => getRatingColor(props.color)};
	color: white;
	font-size: 0.8rem;
	font-weight: bold;
	padding: 4px 0;
	border-radius: 12px;
	margin-right: 12px;
	width: 80px;
	text-align: center;
	display: flex;
	justify-content: center;
	align-items: center;
`

const FactorLabel = styled.span`
	font-size: 0.9rem;
	color: ${({ theme }) => theme.text1};
	margin-right: 8px;
	flex: 1; // Allow label to take up remaining space
`

const FactorAssets = styled.div`
	display: flex;
	gap: 4px;
	margin-left: auto;
`

const Asset = styled.div<{ color: string }>`
	border-radius: 16px;
	font-size: 0.6rem;
	padding: 4px 8px;
	border: 2px solid ${(props) => getRatingColor(props.color)};
`

const ConnectingLines = styled.svg`
	position: absolute;
	left: -40px;
	top: 0;
	height: 100%;
	width: 40px;
`

const PageView = (props) => {
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
							<span>APY</span>
							<span style={{ color: '#fd3c99' }}>{apy}%</span>
						</Stat>
						<Stat>
							<span>30d Avg APY</span>
							<span style={{ color: '#fd3c99' }}>{apyMean30d}%</span>
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

					<RiskRating>
						<span>Total Risk Rating</span>

						<RatingWrapper>
							<RatingCircle color={getRatingColor(props.poolRiskData?.pool_rating_color)}>
								{props.poolRiskData?.pool_rating || 'N/A'}
							</RatingCircle>
							<RatingLink
								href={
									props.poolRiskData?.pool_id
										? `https://exponential.fi/pools/${props.poolRiskData?.pool_id}`
										: `https://exponential.fi/`
								}
								target="_blank"
								rel="noopener noreferrer"
							>
								<RatingDescription>{getRatingDescription(props.poolRiskData?.pool_rating)}</RatingDescription>
							</RatingLink>
						</RatingWrapper>
						<AssessedBy>Assessed by exponential.fi</AssessedBy>
					</RiskRating>

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
						<Chart
							height="460px"
							chartData={finalChartData}
							stackColors={mainChartStackColors}
							stacks={mainChartStacks}
							title=""
						/>
					)}
				</LazyChart>
			</StatsSection>

			<ChartsWrapper>
				<RiskRatingSection>
					<RiskRatingTitle>
						Risk Rating by exponential.fi{' '}
						<img src={exponentialLogo.src} height={24} width={24} style={{ marginBottom: 6 }} />
					</RiskRatingTitle>
					<RiskRatingContent>
						<FactorsContainer>
							<Factor>
								<FactorBadge color={props.poolRiskData?.pool_design?.rating_color}>
									{props.poolRiskData?.pool_design?.rating || 'N/A'}
								</FactorBadge>
								<FactorLabel>Pool Design</FactorLabel>
							</Factor>
							<Factor>
								<FactorBadge color={props.poolRiskData?.assets?.rating_color}>
									{props.poolRiskData?.assets?.rating || 'N/A'}
								</FactorBadge>
								<FactorLabel>Assets</FactorLabel>
								<FactorAssets>
									{props.poolRiskData?.assets?.underlying?.map((asset, index) => (
										<Asset key={index} color={asset.rating_color} title={asset.name}>
											{asset.name}
										</Asset>
									))}
								</FactorAssets>
							</Factor>
							<Factor>
								<FactorBadge color={props.poolRiskData?.protocols?.underlying[0]?.rating_color}>
									{props.poolRiskData?.protocols?.underlying[0]?.rating || 'N/A'}
								</FactorBadge>
								<FactorLabel>Protocols</FactorLabel>
								<FactorAssets>
									{props.poolRiskData?.protocols?.underlying
										?.filter((p) => p?.name)
										.map((protocol, index) => (
											<Asset key={index} color={protocol.rating_color} title={protocol.name}>
												{protocol.name}
											</Asset>
										))}
								</FactorAssets>
							</Factor>
							<Factor>
								<FactorBadge color={props.poolRiskData?.chain?.rating_color}>
									{props.poolRiskData?.chain?.rating || 'N/A'}
								</FactorBadge>
								<FactorLabel>Chain</FactorLabel>
								<FactorAssets>
									{props.poolRiskData?.chain?.underlying
										?.filter((c) => c?.name)
										.map((chain, index) => (
											<Asset key={index} color={chain.rating_color} title={chain.name}>
												{chain.name}
											</Asset>
										))}
								</FactorAssets>
							</Factor>
						</FactorsContainer>
						<TotalRiskContainer>
							<TotalRiskWrapper>
								<ResultWrapper>
									<TotalRiskCircle color={props.poolRiskData?.pool_rating_color}>
										<TotalRiskGrade>{props.poolRiskData?.pool_rating || 'N/A'}</TotalRiskGrade>
									</TotalRiskCircle>
									<TotalRiskInfo>
										<h3>{getRatingDescription(props.poolRiskData?.pool_rating)}</h3>
									</TotalRiskInfo>
								</ResultWrapper>
								<OpenReportButton
									as={ExternalLink}
									href={props.poolRiskData?.pool_url}
									target="_blank"
									rel="noopener noreferrer"
									useTextColor={true}
									color={backgroundColor}
								>
									<span>Open Report</span>
								</OpenReportButton>
							</TotalRiskWrapper>
						</TotalRiskContainer>
					</RiskRatingContent>
				</RiskRatingSection>

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
		<Layout title={`Yield Chart - DefiLlama`} defaultSEO>
			<PageView {...props} />
		</Layout>
	)
}

export async function getStaticPaths() {
	return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params: { pool } }) {
	const poolUrl = `${YIELD_POOLS_LAMBDA_API}?pool=${pool}`

	const res = await fetch(poolUrl).then((res) => res.json())
	const poolData = res.data?.[0] ?? {}

	let poolRiskData = null
	try {
		const response = await fetch(YIELD_RISK_API_EXPONENTIAL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-API-KEY': process.env.EXPONENTIAL_API_KEY
			},
			body: JSON.stringify({
				token_address: cleanPool(poolData.pool_old),
				blockchain: poolData.chain?.toLowerCase(),
				protocol: poolData.project,
				tvl: poolData.tvlUsd,
				assets: poolData.underlyingTokens
			})
		})

		poolRiskData = await response.json()
	} catch (error) {
		console.error('Error fetching pool risk data:', error)
	}

	return {
		props: {
			poolData,
			poolRiskData: poolRiskData?.data
		}
	}
}
