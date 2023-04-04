import * as React from 'react'
import Layout from '~/layout'
import { NftsmarketplaceTable } from '~/components/Table'
import { maxAgeForNext } from '~/api'
import { getNFTMarketplacesData } from '~/api/categories/nfts'
import dynamic from 'next/dynamic'
import type { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { ChartWrapper } from '~/layout/ProtocolAndPool'
import { Header } from '~/Theme'
import { Panel } from '~/components'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/ProtocolChart'
import styled from 'styled-components'
import type { IChartProps } from '~/components/ECharts/types'

const FlatDenomination = styled(Denomination)`
	white-space: nowrap;
	overflow: hidden;
`

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export async function getStaticProps() {
	const data = await getNFTMarketplacesData()

	return {
		props: {
			...data
		},
		revalidate: maxAgeForNext([22])
	}
}

function Marketplaces({ data, volume, dominance, marketplaces }) {
	const [dominanceChart, setDominanceChart] = React.useState(false)

	return (
		<Layout title="NFT Marketplaces - DefiLlama" defaultSEO>
			<Header>NFT Marketplaces</Header>
			<Panel style={{ padding: '1rem 1rem 0', width: '100%' }}>
				<Filters color={'#4f8fea'} style={{ marginLeft: 'auto' }}>
					<FlatDenomination active={!dominanceChart} onClick={() => setDominanceChart(false)}>
						Volume
					</FlatDenomination>
					<FlatDenomination active={dominanceChart} onClick={() => setDominanceChart(true)}>
						Dominance
					</FlatDenomination>
				</Filters>
				<ChartWrapper>
					{dominanceChart ? (
						<AreaChart
							chartData={dominance}
							stacks={marketplaces}
							hideDefaultLegend
							valueSymbol="%"
							title=""
							expandTo100Percent={true}
						/>
					) : (
						<StackedBarChart chartData={volume} valueSymbol="ETH" />
					)}
				</ChartWrapper>
			</Panel>
			<NftsmarketplaceTable data={data} />
		</Layout>
	)
}

export default Marketplaces
