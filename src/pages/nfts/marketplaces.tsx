import * as React from 'react'
import { maxAgeForNext } from '~/api'
import type { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { NftsMarketplaceTable } from '~/components/Table/Nfts/Marketplaces'
import { TagGroup } from '~/components/TagGroup'
import { getNFTMarketplacesData } from '~/containers/Nft/queries'
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

const pageName = ['Volume', 'by', 'NFT Marketplaces']

const VIEW_TYPES = ['Absolute', 'Relative'] as const
type ViewType = (typeof VIEW_TYPES)[number]

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
	const [viewType, setViewType] = React.useState<ViewType>('Absolute')

	return (
		<Layout
			title="NFT Marketplaces - DefiLlama"
			description={`NFT Marketplaces by Volume. DefiLlama is committed to providing accurate data without ads or sponsored content, as well as transparency.`}
			keywords={`nft marketplaces by volume, defi nft marketplaces`}
			canonicalUrl={`/nfts/marketplaces`}
			pageName={pageName}
		>
			<div className="rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<div className="flex items-center justify-between gap-2 p-2">
					<TagGroup
						selectedValue={viewType}
						setValue={(period) => setViewType(period as ViewType)}
						values={VIEW_TYPES}
						className="ml-auto"
					/>
				</div>
				<div className="grid min-h-[796px] grid-cols-1 *:col-span-1 xl:min-h-[398px] xl:grid-cols-2">
					{viewType === 'Relative' ? (
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
					{viewType === 'Relative' ? (
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
