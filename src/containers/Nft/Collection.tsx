import * as React from 'react'
import { useRouter } from 'next/router'
import { useQuery } from '@tanstack/react-query'
import { getNFTCollection } from '~/api/categories/nfts'
import { IChartProps } from '~/components/ECharts/types'
import { FormattedName } from '~/components/FormattedName'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'
import { LocalLoader } from '~/components/Loaders'
import { Switch } from '~/components/Switch'
import { TokenLogo } from '~/components/TokenLogo'
import Layout from '~/layout'
import type { ICollectionScatterChartProps, IOrderBookChartProps } from './types'

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
				<div className="m-auto flex min-h-[360px] items-center justify-center">
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
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="flex items-center gap-2 text-xl">
						<TokenLogo logo={data[0].image} fallbackLogo={data?.[0]?.image} size={48} />
						<FormattedName text={name} fontWeight={700} />
					</h1>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Floor Price</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{floorPrice ? floorPrice.toFixed(2) + ' ETH' : ''}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">24h Volume</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{volume24h ? volume24h.toFixed(2) + ' ETH' : ''}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total Supply</span>
						<span className="font-jetbrains text-2xl font-semibold">{data?.[0]?.totalSupply}</span>
					</p>

					<a
						href={`https://etherscan.io/token/${address.split(':')[0]}`}
						target="_blank"
						rel="noopener noreferrer"
						className="mt-auto mr-auto flex items-center justify-center gap-1 rounded-md bg-(--link-bg) px-2 py-1 text-xs whitespace-nowrap text-(--link-text) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg)"
					>
						<span>View on Etherscan</span> <Icon name="arrow-up-right" height={14} width={14} />
					</a>
				</div>

				<div className="col-span-2 min-h-[392px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
					<div className="flex w-full items-center justify-end p-3 pb-0">
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
				<LazyChart className="relative col-span-full flex min-h-[372px] flex-col rounded-md bg-(--cards-bg) pt-3 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<AreaChart chartData={floorHistory} hideDefaultLegend valueSymbol="ETH" title="Floor Price" />
					</React.Suspense>
				</LazyChart>
				<LazyChart className="relative col-span-full flex min-h-[372px] flex-col rounded-md bg-(--cards-bg) pt-3 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
					<React.Suspense fallback={<></>}>
						<OrderbookChart chartData={orderbook} />
					</React.Suspense>
				</LazyChart>
			</div>
		</Layout>
	)
}
