import * as React from 'react'
import Layout from '~/layout'
import { NftsMarketplaceTable } from '~/components/Table/Nfts/Marketplaces'
import { maxAgeForNext } from '~/api'
import { getNFTMarketplacesData } from '~/api/categories/nfts'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { NFTsSearch } from '~/components/Search/NFTs'
import { withPerformanceLogging } from '~/utils/perf'

const BarChart = React.lazy(() => import('~/components/ECharts/BarChart')) as React.FC<IBarChartProps>

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

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

	return (
		<Layout title="NFT Marketplaces - DefiLlama" defaultSEO>
			<NFTsSearch />

			<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md">
				<div className="flex items-center gap-4 justify-between">
					<h1 className="text-xl font-semibold p-3">NFT Marketplaces</h1>

					<div className="text-xs font-medium m-3 ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-(--form-control-border) text-[#666] dark:text-[#919296]">
						<button
							data-active={!dominanceChart}
							className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							onClick={() => setDominanceChart(false)}
						>
							Absolute
						</button>
						<button
							data-active={dominanceChart}
							className="shrink-0 py-2 px-3 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							onClick={() => setDominanceChart(true)}
						>
							Relative
						</button>
					</div>
				</div>
				<div className="grid grid-cols-1 xl:grid-cols-2 *:col-span-1 min-h-[744px] xl:min-h-[384px] py-3">
					{dominanceChart ? (
						<React.Suspense fallback={<></>}>
							<AreaChart
								chartData={dominance}
								stacks={marketplaces}
								stackColors={stackColors}
								hideDefaultLegend
								valueSymbol="%"
								title="Volume"
								expandTo100Percent={true}
							/>
						</React.Suspense>
					) : (
						<React.Suspense fallback={<></>}>
							<BarChart
								title="Volume"
								stacks={volumeChartStacks}
								stackColors={stackColors}
								chartData={volume}
								valueSymbol="ETH"
								hideDefaultLegend
								tooltipOrderBottomUp
							/>
						</React.Suspense>
					)}
					{dominanceChart ? (
						<React.Suspense fallback={<></>}>
							<AreaChart
								chartData={dominanceTrade}
								stacks={marketplaces}
								stackColors={stackColors}
								hideDefaultLegend
								valueSymbol="%"
								title="Trades"
								expandTo100Percent={true}
							/>
						</React.Suspense>
					) : (
						<React.Suspense fallback={<></>}>
							<BarChart
								title="Trades"
								stacks={tradeChartStacks}
								stackColors={stackColors}
								chartData={trades}
								valueSymbol=""
								hideDefaultLegend
								tooltipOrderBottomUp
							/>
						</React.Suspense>
					)}
				</div>
				<NftsMarketplaceTable data={data} />
			</div>
		</Layout>
	)
}

export default Marketplaces
