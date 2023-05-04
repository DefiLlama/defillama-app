import * as React from 'react'
import Layout from '~/layout'
import { NftsmarketplaceTable } from '~/components/Table'
import { maxAgeForNext } from '~/api'
import { getNFTMarketplacesData } from '~/api/categories/nfts'
import dynamic from 'next/dynamic'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/ProtocolChart'
import styled from 'styled-components'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { NFTsSearch } from '~/components/Search'
import { withPerformanceLogging } from '~/utils/perf'

const FlatDenomination = styled(Denomination)`
	white-space: nowrap;
	overflow: hidden;
`

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export const getStaticProps = withPerformanceLogging('nfts/marketplaces', async () => {
	const data = await getNFTMarketplacesData()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
})

function Marketplaces({
	data,
	volume,
	dominance,
	trades,
	dominanceTrade,
	marketplaces,
	volumeChartStacks,
	tradeChartStacks
}) {
	const [dominanceChart, setDominanceChart] = React.useState(false)

	//x
	return (
		<Layout title="NFT Marketplaces - DefiLlama" defaultSEO>
			<NFTsSearch
				step={{
					category: 'Home',
					name: 'NFT Marketplaces',
					route: '',
					hideOptions: true
				}}
			/>

			<Header>NFT Marketplaces</Header>

			<Filters color={'#4f8fea'} style={{ marginLeft: 'auto' }}>
				<FlatDenomination active={!dominanceChart} onClick={() => setDominanceChart(false)}>
					Absolute
				</FlatDenomination>
				<FlatDenomination active={dominanceChart} onClick={() => setDominanceChart(true)}>
					Relative
				</FlatDenomination>
			</Filters>
			<ChartWrapper>
				{dominanceChart ? (
					<AreaChart
						chartData={dominance}
						stacks={marketplaces}
						hideDefaultLegend
						valueSymbol="%"
						title="Volume"
						expandTo100Percent={true}
					/>
				) : (
					<BarChart
						title="Volume"
						stacks={volumeChartStacks}
						chartData={volume}
						valueSymbol="ETH"
						hideDefaultLegend
						tooltipOrderBottomUp
					/>
				)}
				{dominanceChart ? (
					<AreaChart
						chartData={dominanceTrade}
						stacks={marketplaces}
						hideDefaultLegend
						valueSymbol="%"
						title="Trades"
						expandTo100Percent={true}
					/>
				) : (
					<BarChart
						title="Trades"
						stacks={tradeChartStacks}
						chartData={trades}
						valueSymbol=""
						hideDefaultLegend
						tooltipOrderBottomUp
					/>
				)}
			</ChartWrapper>
			<NftsmarketplaceTable data={data} />
		</Layout>
	)
}

export default Marketplaces

const ChartWrapper = styled(Panel)`
	min-height: 402px;
	display: grid;
	grid-template-columns: 1fr;
	gap: 16px;

	& > * {
		grid-cols: span 1;
	}

	@media screen and (min-width: 80rem) {
		grid-template-columns: 1fr 1fr;
	}
`
