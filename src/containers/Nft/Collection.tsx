import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/router'
import * as React from 'react'
import type { IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { FormattedName } from '~/components/FormattedName'
import { Icon } from '~/components/Icon'
import { LocalLoader } from '~/components/Loaders'
import { Switch } from '~/components/Switch'
import { TokenLogo } from '~/components/TokenLogo'
import { getNFTCollection } from '~/containers/Nft/queries'
import Layout from '~/layout'
import type { ICollectionScatterChartProps, IOrderBookChartProps } from './types'

const CollectionScatterChart = React.lazy(
	() => import('./CollectionScatterChart')
) as React.FC<ICollectionScatterChartProps>

const MultiSeriesChart2 = React.lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const OrderbookChart = React.lazy(() => import('./OrderbookChart')) as React.FC<IOrderBookChartProps>

export function NFTCollectionContainer() {
	const router = useRouter()
	const collectionSlug =
		typeof router.query.collection === 'string'
			? router.query.collection
			: Array.isArray(router.query.collection)
				? router.query.collection[0]
				: null

	const { data: collectionData, isLoading: fetchingData } = useQuery({
		queryKey: ['collection-data', collectionSlug],
		queryFn: () => (collectionSlug != null ? getNFTCollection(collectionSlug) : Promise.resolve(undefined)),
		enabled: collectionSlug != null,
		staleTime: 60 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: 0
	})
	if (fetchingData || !collectionData) {
		return (
			<Layout
				title={'NFT Collection - DefiLlama'}
				description=""
				keywords=""
				canonicalUrl={`/nfts/collection/${router.query.collection}`}
			>
				<div className="flex flex-1 items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg) p-2">
					{fetchingData || !router.isReady ? <LocalLoader /> : <p>Failed to load collection data.</p>}
				</div>
			</Layout>
		)
	}
	const { name, data, stats, sales, salesExOutliers, salesMedian1d, address, floorHistory, orderbook } = collectionData
	const collectionName = name ?? 'NFTs'
	const primaryCollection = data?.[0]
	const lastFloorRow =
		floorHistory?.source != null && Array.isArray(floorHistory.source) && floorHistory.source.length > 0
			? floorHistory.source[floorHistory.source.length - 1]
			: null
	const floorPriceRaw = lastFloorRow != null ? Number(lastFloorRow['Floor Price']) : null
	const floorPrice = typeof floorPriceRaw === 'number' && Number.isFinite(floorPriceRaw) ? floorPriceRaw : null
	const volume24h = stats.length > 0 ? (stats[stats.length - 1]?.[1] ?? null) : null

	const includeOutliers = router.isReady && router.query.includeOutliers === 'true'

	return (
		<Layout
			title={collectionName + ' - DefiLlama'}
			description={`Track ${collectionName} - View floor price, 24h volume and total supply of ${collectionName}. Real-time DeFi analytics from DefiLlama.`}
			keywords={`${collectionName} floor price, ${collectionName} 24h volume, ${collectionName} total supply`}
			canonicalUrl={`/nfts/collection/${router.query.collection}`}
		>
			<div className="relative isolate grid grid-cols-2 gap-2 xl:grid-cols-3">
				<div className="col-span-2 flex w-full flex-col gap-6 overflow-x-auto rounded-md border border-(--cards-border) bg-(--cards-bg) p-5 xl:col-span-1">
					<h1 className="flex items-center gap-2 text-xl">
						<TokenLogo logo={primaryCollection?.image} fallbackLogo={primaryCollection?.image} size={48} />
						<FormattedName text={name ?? ''} fontWeight={700} />
					</h1>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Floor Price</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{floorPrice != null ? floorPrice.toFixed(2) + ' ETH' : ''}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">24h Volume</span>
						<span className="font-jetbrains text-2xl font-semibold">
							{volume24h != null ? volume24h.toFixed(2) + ' ETH' : ''}
						</span>
					</p>

					<p className="flex flex-col gap-1 text-base">
						<span className="text-(--text-label)">Total Supply</span>
						<span className="font-jetbrains text-2xl font-semibold">{primaryCollection?.totalSupply}</span>
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

				<div className="col-span-2 min-h-[394px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
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
							salesMedian1d={salesMedian1d}
							volume={stats}
						/>
					</React.Suspense>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
				{floorHistory?.source?.length > 0 ? (
					<div className="relative rounded-md border border-(--cards-border) bg-(--cards-bg) only:col-span-full">
						<React.Suspense fallback={<div className="h-[398px]" />}>
							<MultiSeriesChart2 dataset={floorHistory} valueSymbol="ETH" title="Floor Price" />
						</React.Suspense>
					</div>
				) : null}
				{orderbook?.length > 0 ? (
					<div className="relative rounded-md border border-(--cards-border) bg-(--cards-bg) only:col-span-full">
						<React.Suspense fallback={<div className="h-[398px]" />}>
							<OrderbookChart chartData={orderbook} />
						</React.Suspense>
					</div>
				) : null}
			</div>
		</Layout>
	)
}
