import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'

import type { IBarChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { PerformanceCoinsColumn } from '~/components/Table/Defi/columns'
import { primaryColor } from '~/constants/colors'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart/NonTimeSeries'), {
	ssr: false
}) as React.FC<IBarChartProps>

const ChartsContainer = styled.div`
	background-color: ${({ theme }) => theme.advancedBG};
	border: 1px solid ${({ theme }) => theme.bg3};
	border-radius: 8px;
`

const TabContainer = styled.div`
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	min-height: 360px;
`

const TotalLocked = styled(Header)`
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16px;
	flex-wrap: wrap;

	& > *:last-child {
		font-family: var(--font-jetbrains);
	}
`

export const FdvContainer = ({ categoryPerformance }) => {
	const [groupBy, setGroupBy] = React.useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('weekly')

	const averages = categoryPerformance
		.sort((a, b) => b.pctChange1W - a.pctChange1W)
		.map((i) => [i.coinId, i.pctChange1W?.toFixed(2)])

	return (
		<>
			<TotalLocked>
				<span>Category Performance</span>
			</TotalLocked>

			<ChartsContainer>
				<TabContainer>
					<>
						<Filters color={primaryColor} style={{ marginLeft: 'auto' }}>
							<Denomination as="button" active={groupBy === 'daily'} onClick={() => setGroupBy('daily')}>
								Daily
							</Denomination>

							<Denomination as="button" active={groupBy === 'weekly'} onClick={() => setGroupBy('weekly')}>
								Weekly
							</Denomination>

							<Denomination as="button" active={groupBy === 'monthly'} onClick={() => setGroupBy('monthly')}>
								Monthly
							</Denomination>

							<Denomination as="button" active={groupBy === 'yearly'} onClick={() => setGroupBy('yearly')}>
								Yearly
							</Denomination>
						</Filters>

						<BarChart title="" chartData={averages} valueSymbol="%" height="480px" />
					</>
				</TabContainer>
			</ChartsContainer>

			<TableWithSearch
				data={categoryPerformance}
				columns={PerformanceCoinsColumn}
				columnToSearch={'coinId'}
				placeholder={'Search category...'}
			/>
		</>
	)
}
