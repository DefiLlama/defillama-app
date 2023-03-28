import * as React from 'react'
import Layout from '~/layout'
import { DetailsWrapper, Name, ChartWrapper, ChartsWrapper, LazyChart } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import TokenLogo from '~/components/TokenLogo'
import FormattedName from '~/components/FormattedName'
import { nftCollectionIconUrl } from '~/utils'
import dynamic from 'next/dynamic'
import type { ICollectionScatterChartProps } from './types'
import { IChartProps } from '~/components/ECharts/types'

const CollectionScatterChart = dynamic(() => import('./CollectionScatterChart'), {
	ssr: false
}) as React.FC<ICollectionScatterChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export function NFTCollectionContainer({ name, data, stats, sales, address, floorHistory }) {
	return (
		<Layout title={(name || 'NFTs') + ' - DefiLlama'}>
			<StatsSection>
				<DetailsWrapper>
					<Name>
						<TokenLogo logo={nftCollectionIconUrl(address)} size={24} />
						<FormattedName text={name} fontWeight={700} />
					</Name>

					<Stat>
						<span>Total Supply</span>
						<span>{data?.[0]?.totalSupply}</span>
					</Stat>
				</DetailsWrapper>

				<ChartWrapper>
					<CollectionScatterChart sales={sales} />
				</ChartWrapper>
			</StatsSection>

			<ChartsWrapper>
				<LazyChart>
					<AreaChart chartData={floorHistory} hideDefaultLegend valueSymbol="ETH" title="Floor Price" />
				</LazyChart>
			</ChartsWrapper>
		</Layout>
	)
}
