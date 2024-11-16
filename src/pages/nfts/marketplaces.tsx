import * as React from 'react'
import Layout from '~/layout'
import { NftsMarketplaceTable } from '~/components/Table/Nfts/Marketplaces'
import { maxAgeForNext } from '~/api'
import { getNFTMarketplacesData } from '~/api/categories/nfts'
import dynamic from 'next/dynamic'
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

			<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] ml-auto">
				<button
					data-active={!dominanceChart}
					className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
					onClick={() => setDominanceChart(false)}
				>
					Absolute
				</button>
				<button
					data-active={dominanceChart}
					className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
					onClick={() => setDominanceChart(true)}
				>
					Relative
				</button>
			</div>
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
