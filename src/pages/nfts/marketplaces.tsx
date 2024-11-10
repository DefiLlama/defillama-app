import * as React from 'react'
import Layout from '~/layout'
import { NftsMarketplaceTable } from '~/components/Table/Nfts/Marketplaces'
import { maxAgeForNext } from '~/api'
import { getNFTMarketplacesData } from '~/api/categories/nfts'
import dynamic from 'next/dynamic'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/ProtocolChart'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { NFTsSearch } from '~/components/Search/NFTs'
import { withPerformanceLogging } from '~/utils/perf'

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
	tradeChartStacks,
	stackColors
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

			<h1 className="text-2xl font-medium -mb-5">NFT Marketplaces</h1>

			<Filters color={'#4f8fea'} className="ml-auto">
				<Denomination active={!dominanceChart} onClick={() => setDominanceChart(false)}>
					Absolute
				</Denomination>
				<Denomination active={dominanceChart} onClick={() => setDominanceChart(true)}>
					Relative
				</Denomination>
			</Filters>
			<div className="grid grid-cols-1 xl:grid-cols-2 *:col-span-1 bg-[var(--bg6)] min-h-[392px] rounded-xl shadow p-4">
				{dominanceChart ? (
					<AreaChart
						chartData={dominance}
						stacks={marketplaces}
						stackColors={stackColors}
						hideDefaultLegend
						valueSymbol="%"
						title="Volume"
						expandTo100Percent={true}
					/>
				) : (
					<BarChart
						title="Volume"
						stacks={volumeChartStacks}
						stackColors={stackColors}
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
						stackColors={stackColors}
						hideDefaultLegend
						valueSymbol="%"
						title="Trades"
						expandTo100Percent={true}
					/>
				) : (
					<BarChart
						title="Trades"
						stacks={tradeChartStacks}
						stackColors={stackColors}
						chartData={trades}
						valueSymbol=""
						hideDefaultLegend
						tooltipOrderBottomUp
					/>
				)}
			</div>
			<NftsMarketplaceTable data={data} />
		</Layout>
	)
}

export default Marketplaces
