import * as React from 'react'
import { maxAgeForNext } from '~/api'
import { getNFTMarketplacesData } from '~/api/categories/nfts'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { NftsMarketplaceTable } from '~/components/Table/Nfts/Marketplaces'
import Layout from '~/layout'
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
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex items-center justify-between gap-4">
					<h1 className="p-3 text-xl font-semibold">NFT Marketplaces</h1>

					<div className="m-3 ml-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
						<button
							data-active={!dominanceChart}
							className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							onClick={() => setDominanceChart(false)}
						>
							Absolute
						</button>
						<button
							data-active={dominanceChart}
							className="shrink-0 px-3 py-2 whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							onClick={() => setDominanceChart(true)}
						>
							Relative
						</button>
					</div>
				</div>
				<div className="grid min-h-[744px] grid-cols-1 py-3 *:col-span-1 xl:min-h-[384px] xl:grid-cols-2">
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
