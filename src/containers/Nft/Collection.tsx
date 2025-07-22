import * as React from 'react'
import Layout from '~/layout'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import type { ICollectionScatterChartProps, IOrderBookChartProps } from './types'
import { IChartProps } from '~/components/ECharts/types'
import { useRouter } from 'next/router'
import { NFTsSearch } from '~/components/Search/NFTs'
import { getNFTCollection } from '~/api/categories/nfts'
import { LocalLoader } from '~/components/LocalLoader'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'
import { Switch } from '~/components/Switch'

const CollectionScatterChart = React.lazy(
	() => import('./CollectionScatterChart')
) as React.FC<ICollectionScatterChartProps>

const AreaChart = React.lazy(() => import('~/components/ECharts/AreaChart')) as React.FC<IChartProps>

const OrderbookChart = React.lazy(() => import('./OrderbookChart')) as React.FC<IOrderBookChartProps>

export function NFTCollectionContainer() {
	const router = useRouter()
	const { data: collectionData, isLoading: fetchingData } = useQuery({
		queryKey: ['collection-data', router.query.collection],
		queryFn: () =>
			getNFTCollection(
				typeof router.query.collection === 'string' ? router.query.collection : router.query.collection[0]
			),
		staleTime: 60 * 60 * 1000
	})
	if (fetchingData) {
		return (
			<Layout title={'NFT Collection - DefiLlama'}>
				<div className="flex items-center justify-center m-auto min-h-[360px]">
					<LocalLoader />
				</div>
			</Layout>
		)
	}
	const { name, data, stats, sales, salesExOutliers, salesMedian1d, address, floorHistory, orderbook } = collectionData
	const floorPrice = floorHistory ? floorHistory[floorHistory.length - 1]?.[1] : null
	const volume24h = stats ? stats[stats.length - 1]?.[1] : null

	const includeOutliers = router.isReady && router.query.includeOutliers === 'true' ? true : false

	return (
		<Layout title={(name || 'NFTs') + ' - DefiLlama'}>
			<NFTsSearch />

			<div className="grid grid-cols-2 relative isolate xl:grid-cols-3 gap-2">
				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
					<h1 className="flex items-center gap-2 text-xl">
						<TokenLogo logo={data[0].image} fallbackLogo={data?.[0]?.image} size={48} />
						<FormattedName text={name} fontWeight={700} />
					</h1>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Floor Price</span>
						<span className="font-jetbrains font-semibold text-2xl">
							{floorPrice ? floorPrice.toFixed(2) + ' ETH' : ''}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">24h Volume</span>
						<span className="font-jetbrains font-semibold text-2xl">
							{volume24h ? volume24h.toFixed(2) + ' ETH' : ''}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-[#545757] dark:text-[#cccccc]">Total Supply</span>
						<span className="font-jetbrains font-semibold text-2xl">{data?.[0]?.totalSupply}</span>
					</p>

					<a
						href={`https://etherscan.io/token/${address.split(':')[0]}`}
						target="_blank"
						rel="noopener noreferrer"
						className="flex items-center gap-1 justify-center py-1 px-2 whitespace-nowrap text-xs rounded-md text-(--link-text) bg-(--link-bg) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) mt-auto mr-auto"
					>
						<span>View on Etherscan</span> <Icon name="arrow-up-right" height={14} width={14} />
					</a>
				</div>

				<div className="bg-(--cards-bg) border border-(--cards-border) rounded-md col-span-2 min-h-[392px]">
					<div className="flex items-center justify-end p-3 pb-0 w-full">
						<Switch
							label="Include Outliers"
							value="showMcapChart"
							checked={includeOutliers}
							onChange={() =>
								router.push(
									{ pathname: router.pathname, query: { ...router.query, includeOutliers: !includeOutliers } },
									undefined,
									{
										shallow: true
									}
								)
							}
						/>
					</div>
					<React.Suspense fallback={<></>}>
						<CollectionScatterChart
							sales={includeOutliers ? sales : salesExOutliers}
							salesMedian1d={salesMedian1d as any}
							volume={stats}
						/>
					</React.Suspense>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-1">
				<LazyChart className="bg-(--cards-bg) pt-3 rounded-md relative col-span-full min-h-[372px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<AreaChart chartData={floorHistory} hideDefaultLegend valueSymbol="ETH" title="Floor Price" />
					</React.Suspense>
				</LazyChart>
				<LazyChart className="bg-(--cards-bg) pt-3 rounded-md relative col-span-full min-h-[372px] flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<OrderbookChart chartData={orderbook} />
					</React.Suspense>
				</LazyChart>
			</div>
		</Layout>
	)
}
