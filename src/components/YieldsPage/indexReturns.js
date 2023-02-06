import * as React from 'react'
import { Panel } from '~/components'
import dynamic from 'next/dynamic'
import { Name, Symbol, DetailsTable, ChartWrapper } from '~/layout/ProtocolAndPool'
import { PoolDetails } from '~/layout/Pool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import styled from 'styled-components'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => <></>
})

const ReturnsPage = ({ prices, symbol }) => {
	const [pricesStartAndEnd, setPricesStartAndEnd] = React.useState([prices[0]?.price, prices.slice(-1)[0]?.price])

	const [priceStart, priceNow] = pricesStartAndEnd

	const price1d = prices.slice(-2, -1)[0]?.price
	const price7d = prices.slice(-7, -6)[0]?.price
	const price30d = prices.slice(-30, -29)[0]?.price

	const priceNowFixed = prices[0]?.price

	const return1d = price1d && priceNowFixed ? ((priceNowFixed - price1d) / price1d) * 100 : null
	const return7d = priceNowFixed && price7d ? ((priceNowFixed - price7d) / price7d) * 100 : null
	const return30d = priceNowFixed && price30d ? ((priceNowFixed - price30d) / price30d) * 100 : null

	const returnSelected = ((priceNow - priceStart) / priceStart) * 100

	const finalChart = prices.map((i) => [i.timestamp, i.price])

	const id = React.useRef()

	const onChartDataZoom = (start, end) => {
		if (id.current) {
			clearTimeout(id.current)
		}

		id.current = setTimeout(() => {
			const pStart = finalChart.find((x) => x[0] >= start)?.[1]
			const pEnd = finalChart.findLast((x) => x[0] <= end)?.[1]

			setPricesStartAndEnd([pStart, pEnd])
		}, 300)
	}

	return (
		<>
			<Panel as="p" style={{ margin: 0, textAlign: 'center' }}>
				Search Placeholder
			</Panel>

			<StatsSection>
				<PoolDetails>
					<Name style={{ flexWrap: 'wrap' }}>
						<Symbol>{symbol}</Symbol>
					</Name>

					<Stat>
						<span>Return over selected Date range</span>
						{returnSelected ? (
							<span style={{ color: returnSelected > 0 ? 'green' : 'red' }}>{returnSelected?.toFixed(2)}%</span>
						) : (
							<span style={{ height: '3rem' }}></span>
						)}
					</Stat>

					<TableWrapper>
						<tbody>
							<tr>
								<th>1d:</th>
								{return1d && <td style={{ color: return1d > 0 ? 'green' : 'red' }}>{return1d?.toFixed(2)}%</td>}
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>7d:</th>
								{return7d && <td style={{ color: return7d > 0 ? 'green' : 'red' }}>{return7d?.toFixed(2)}%</td>}
							</tr>

							<tr data-divider>
								<th></th>
							</tr>

							<tr>
								<th>30d:</th>
								{return30d && <td style={{ color: return30d > 0 ? 'green' : 'red' }}>{return30d?.toFixed(2)}%</td>}
							</tr>
						</tbody>
					</TableWrapper>
				</PoolDetails>

				<ChartWrapper style={{ position: 'relative' }}>
					<AreaChart
						title="Price"
						chartData={finalChart}
						color={'gray'}
						valueSymbol={'$'}
						onChartDataZoom={onChartDataZoom}
					/>
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
