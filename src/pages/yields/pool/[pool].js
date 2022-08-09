import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import { ArrowUpRight, DownloadCloud } from 'react-feather'
import Layout from '~/layout'
import AuditInfo from '~/components/AuditInfo'
import { YieldsSearch } from '~/components/Search'
import { download, toK } from '~/utils'
import { useYieldPoolData, useYieldChartData, useYieldConfigData } from '~/api/categories/yield/client'
import {
	Button,
	DownloadButton,
	FlexRow,
	InfoWrapper,
	LinksWrapper,
	PoolDetails,
	ProtocolName,
	Section,
	Stat,
	StatsSection,
	StatWrapper,
	Symbol
} from '~/components/ProtocolAndPool'
import FormattedName from '~/components/FormattedName'
import { BreakpointPanel } from '~/components'

const Chart = dynamic(() => import('~/components/GlobalChart'), {
	ssr: false
})

const ChartWrapper = styled.div`
	padding: 0 0 20px 0;
	min-height: 380px;
	grid-column: span 1;
`

const PageView = () => {
	const { query } = useRouter()

	let { data: pool } = useYieldPoolData(query.pool)
	let { data: chart } = useYieldChartData(query.pool)

	const poolData = pool?.data ? pool.data[0] : {}

	const project = poolData.project ?? ''

	let { data: config } = useYieldConfigData(project)

	const configData = config ?? {}

	const finalChartData = chart?.data.map((el) => [
		String(Math.floor(new Date(el.timestamp).getTime() / 1000)),
		el.tvlUsd,
		// i format here for the plot in `TradingViewChart`
		el.apy?.toFixed(2) ?? 0
	])

	// prepare csv data
	const downloadCsv = () => {
		const rows = [['APY', 'TVL', 'DATE']]

		chart.data?.forEach((item) => {
			rows.push([item.apy, item.tvlUsd, item.timestamp])
		})

		download(`${query.pool}.csv`, rows.map((r) => r.join(',')).join('\n'))
	}

	const apy = poolData.apy?.toFixed(2) ?? 0

	const apyDelta20pct = (apy * 0.8).toFixed(2)

	const tvlUsd = toK(poolData.tvlUsd ?? 0)

	let confidence = poolData.predictions?.binnedConfidence ?? null
	if (confidence) {
		confidence = confidence === 1 ? 'Low' : confidence === 2 ? 'Medium' : 'High'
	}
	const predictedDirection = poolData.predictions?.predictedClass === 'Down' ? '' : 'not'

	const projectName = configData.name ?? ''
	const audits = configData.audits ?? ''
	const audit_links = configData.audit_links ?? []
	const url = configData.url ?? ''
	const twitter = configData.twitter ?? ''
	const category = configData.category ?? ''

	const backgroundColor = '#696969'

	return (
		<>
			<YieldsSearch step={{ category: 'Yields', name: poolData.symbol, hideOptions: true }} />

			<StatsSection>
				<PoolDetails>
					<ProtocolName>
						<FormattedName
							text={
								projectName === 'Osmosis'
									? `${poolData.symbol} ${poolData.pool.split('-').slice(-1)}-lock`
									: poolData.symbol ?? 'Loading'
							}
							maxCharacters={16}
							fontWeight={700}
						/>
						<Symbol>
							({projectName} - {poolData.chain})
						</Symbol>
					</ProtocolName>

					<StatWrapper>
						<Stat>
							<span style={{ fontSize: '1rem' }}>APY</span>
							<span style={{ color: '#fd3c99' }}>{apy}%</span>
						</Stat>
					</StatWrapper>

					<StatWrapper>
						<Stat>
							<span style={{ fontSize: '1rem' }}>Total Value Locked</span>
							<span style={{ color: '#4f8fea' }}>${tvlUsd}</span>
						</Stat>

						<DownloadButton as="button" onClick={downloadCsv}>
							<DownloadCloud size={14} />
							<span>&nbsp;&nbsp;.csv</span>
						</DownloadButton>
					</StatWrapper>

					<StatWrapper>
						<Stat>
							<span style={{ fontSize: '1rem' }}>Outlook</span>
							<span style={{ fontSize: '1rem', fontWeight: '400' }}>
								{confidence !== null
									? `The algorithm predicts the current APY of ${apy}% to ${predictedDirection} fall below ${apyDelta20pct}% within the next 4 weeks. Confidence: ${confidence}`
									: 'No outlook available'}
							</span>
						</Stat>
					</StatWrapper>
				</PoolDetails>
				<BreakpointPanel id="chartWrapper" style={{ border: 'none' }}>
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

			<InfoWrapper>
				<Section>
					<h3>Protocol Information</h3>
					<FlexRow>
						<span>Category</span>
						<span>:</span>
						<Link href={`/protocols/${category.toLowerCase()}`}>{category}</Link>
					</FlexRow>

					{audits && audit_links && <AuditInfo audits={audits} auditLinks={audit_links} color={backgroundColor} />}

					<LinksWrapper>
						{url && (
							<Link href={url} passHref>
								<Button as="a" target="_blank" rel="noopener noreferrer" useTextColor={true} color={backgroundColor}>
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
