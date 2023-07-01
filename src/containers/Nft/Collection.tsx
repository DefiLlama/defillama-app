import * as React from 'react'
import Layout from '~/layout'
import { DetailsWrapper, Name, ChartWrapper, ChartsWrapper, LazyChart, Button } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { nftCollectionIconUrl } from '~/utils'
import dynamic from 'next/dynamic'
import type { ICollectionScatterChartProps, IOrderBookChartProps } from './types'
import { IChartProps } from '~/components/ECharts/types'
import { ArrowUpRight } from 'react-feather'
import Link from 'next/link'
import { ToggleWrapper2 } from '~/components'
import { useRouter } from 'next/router'
import { NFTsSearch } from '~/components/Search'
import { getNFTCollection } from '~/api/categories/nfts'
import useSWR from 'swr'
import LocalLoader from '~/components/LocalLoader'

export const useCollectionData = (slug) => {
	const { data, error } = useSWR(slug, getNFTCollection)
	return { data, error, loading: !data && !error }
}

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
	const { data: collectionData, loading: fetchingData } = useCollectionData(router.query.collection)
	if (fetchingData) {
		return (
			<Layout title={'NFT Collection - DefiLlama'}>
				<LocalLoader />
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

			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={nftCollectionIconUrl(address)} fallbackLogo={data?.[0]?.image} size={48} />
						<FormattedName text={name} fontWeight={700} />
					</Name>

					<Stat>
						<span>Floor Price</span>
						<span>{floorPrice ? floorPrice.toFixed(2) + ' ETH' : ''}</span>
					</Stat>

					<Stat>
						<span>24h Volume</span>
						<span>{volume24h ? volume24h.toFixed(2) + ' ETH' : ''}</span>
					</Stat>

					<Stat>
						<span>Total Supply</span>
						<span>{data?.[0]?.totalSupply}</span>
					</Stat>

					<Link href={`https://etherscan.io/token/${address.split(':')[0]}`} passHref>
						<Button
							as="a"
							target="_blank"
							rel="noopener noreferrer"
							useTextColor={true}
							style={{ width: 'fit-content' }}
						>
							<span>View on Etherscan</span> <ArrowUpRight size={14} />
						</Button>
					</Link>
				</DetailsWrapper>

				<ChartWrapper style={{ padding: '20px 0 0 0' }}>
					<ToggleWrapper2 style={{ padding: '0 20px' }}>
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
					</ToggleWrapper2>
					<CollectionScatterChart
						sales={includeOutliers ? sales : salesExOutliers}
						salesMedian1d={salesMedian1d as any}
						volume={stats}
					/>
				</ChartWrapper>
			</StatsSection>

			<ChartsWrapper>
				<LazyChart style={{ minHeight: '360px', padding: '20px 16px 20px 0' }}>
					<AreaChart chartData={floorHistory} hideDefaultLegend valueSymbol="ETH" title="Floor Price" />
				</LazyChart>
				<LazyChart style={{ minHeight: '360px', padding: '20px 16px 20px 0' }}>
					<OrderbookChart chartData={orderbook} />
				</LazyChart>
			</ChartsWrapper>
		</Layout>
	)
}
