import * as React from 'react'
import { Panel } from '~/components'

import dynamic from 'next/dynamic'

import { Name, Symbol, DetailsTable, ChartWrapper } from '~/layout/ProtocolAndPool'
import { PoolDetails } from '~/layout/Pool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import styled from 'styled-components'
import { useRouter } from 'next/router'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => <></>
})

const ReturnsPage = ({ priceData }) => {
	const { query } = useRouter()
	const prices = query.coin ? priceData.coins[`coingecko:${query.coin}`]?.prices : []

	const priceStart = prices[0]?.price
	const priceNow = prices.slice(-1)[0]?.price
	const price1d = prices.slice(-2, -1)[0]?.price
	const price7d = prices.slice(-7, -6)[0]?.price
	const price30d = prices.slice(-30, -29)[0]?.price

	const return1d = ((priceNow - price1d) / price1d) * 100
	const return7d = ((priceNow - price7d) / price7d) * 100
	const return30d = ((priceNow - price30d) / price30d) * 100

	const returnInception = ((priceNow - priceStart) / priceStart) * 100

	const finalChart = prices.map((i) => [i.timestamp, i.price])

	return (
		<>
			<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
				Search Placeholder
			</Panel>

			<StatsSection>
				<PoolDetails>
					<Name style={{ flexWrap: 'wrap' }}>
						Avalanche
						<Symbol>AVAX</Symbol>
					</Name>

					<Stat>
						<span>Return</span>
						<span style={{ color: returnInception > 0 ? 'green' : 'red' }}>{returnInception?.toFixed(2)}%</span>
					</Stat>

					<TableWrapper>
						<tbody>
							<tr>
								<th>1d:</th>
								<td style={{ color: return1d > 0 ? 'green' : 'red' }}>{return1d?.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>7d:</th>
								<td style={{ color: return7d > 0 ? 'green' : 'red' }}>{return7d?.toFixed(2)}%</td>
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>30d:</th>
								<td style={{ color: return30d > 0 ? 'green' : 'red' }}>{return30d?.toFixed(2)}%</td>
							</tr>
						</tbody>
					</TableWrapper>
				</PoolDetails>

				<ChartWrapper style={{ position: 'relative' }}>
					<AreaChart title="Price" chartData={finalChart} color={'gray'} valueSymbol={'$'} />
				</ChartWrapper>
			</StatsSection>
		</>
	)
}

export default ReturnsPage

const TableWrapper = styled(DetailsTable)`
	tr[data-divider] {
		position: relative;
		th::before {
			content: '';
			position: absolute;
			top: 5px;
			left: 0;
			right: 0;
			height: 10px;
			border-top: 1px solid ${({ theme }) => theme.divider};
		}
	}
`
