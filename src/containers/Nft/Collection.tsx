import * as React from 'react'
import Layout from '~/layout'
import { ChartWrapper, LazyChart, Button } from '~/layout/ProtocolAndPool'
import { TokenLogo } from '~/components/TokenLogo'
import { FormattedName } from '~/components/FormattedName'
import dynamic from 'next/dynamic'
import type { ICollectionScatterChartProps, IOrderBookChartProps } from './types'
import { IChartProps } from '~/components/ECharts/types'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { NFTsSearch } from '~/components/Search/NFTs'
import { getNFTCollection } from '~/api/categories/nfts'
import { LocalLoader } from '~/components/LocalLoader'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '~/components/Icon'

const CollectionScatterChart = dynamic(() => import('./CollectionScatterChart'), {
	ssr: false
}) as React.FC<ICollectionScatterChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const OrderbookChart = dynamic(() => import('./OrderbookChart'), {
	ssr: false
}) as React.FC<IOrderBookChartProps>

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
			<NFTsSearch
				step={{
					category: 'NFT Collections',
					name: name,
					route: 'nfts',
					hideOptions: true
				}}
			/>

			<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
				<div className="flex flex-col gap-6 p-5 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
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

					<Link href={`https://etherscan.io/token/${address.split(':')[0]}`} passHref>
						<Button
							as="a"
							target="_blank"
							rel="noopener noreferrer"
							useTextColor={true}
							style={{ width: 'fit-content' }}
						>
							<span>View on Etherscan</span> <Icon name="arrow-up-right" height={14} width={14} />
						</Button>
					</Link>
				</div>

				<ChartWrapper style={{ padding: '20px 0 0 0' }}>
					<div className="flex items-center gap-1 flex-nowrap ml-auto px-5">
						<input
							type="checkbox"
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
						<span>Include Outliers</span>
					</div>
					<CollectionScatterChart
						sales={includeOutliers ? sales : salesExOutliers}
						salesMedian1d={salesMedian1d as any}
						volume={stats}
					/>
				</ChartWrapper>
			</div>

			<div className="grid grid-cols-2 rounded-xl bg-[var(--bg6)] shadow">
				<LazyChart style={{ minHeight: '360px', padding: '20px 16px 20px 0' }}>
					<AreaChart chartData={floorHistory} hideDefaultLegend valueSymbol="ETH" title="Floor Price" />
				</LazyChart>
				<LazyChart style={{ minHeight: '360px', padding: '20px 16px 20px 0' }}>
					<OrderbookChart chartData={orderbook} />
				</LazyChart>
			</div>
		</Layout>
	)
}
