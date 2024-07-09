import * as React from 'react'
import dynamic from 'next/dynamic'
import styled from 'styled-components'
import { Header } from '~/Theme'

import type { IBarChartProps } from '~/components/ECharts/types'
import { TableWithSearch } from '~/components/Table/TableWithSearch'
import { CategoryReturnsColumn, CoinReturnsColumn } from '~/components/Table/Defi/columns'
import { primaryColor } from '~/constants/colors'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import { Tab, TabList } from '~/components'
import { useScrollToTop } from '~/hooks'
import { IChartProps as IAreaChartProps } from '~/components/ECharts/types'

interface IChartProps {
	chartData: any[]
	title?: string
}

const BarChart = dynamic(() => import('~/components/ECharts/BarChart/NonTimeSeries'), {
	ssr: false
}) as React.FC<IBarChartProps>

const TreemapChart = dynamic(() => import('~/components/ECharts/TreemapChart2'), {
	ssr: false
}) as React.FC<IChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IAreaChartProps>

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

export const CategoryReturnsContainer = ({ returns, isCoinPage, returnsChartData, coinsInCategory }) => {
	useScrollToTop()

	const [tab, setTab] = React.useState('barchart')
	const [groupBy, setGroupBy] = React.useState<'1D' | '7D' | '30D' | '365D' | 'YTD'>('7D')

	const { sortedReturns, barChart, heatmapData } = React.useMemo(() => {
		const field = {
			'1D': 'returns1D',
			'7D': 'returns1W',
			'30D': 'returns1M',
			'365D': 'returns1Y',
			YTD: 'returnsYtd'
		}[groupBy]

		const sorted = [...returns].sort((a, b) => b[field] - a[field])
		const barChart = sorted.map((i) => [i.name, i[field]?.toFixed(2)])
		const heatmapData = sorted.map((i) => ({ ...i, returnField: i[field] }))

		return { sortedReturns: sorted, barChart, heatmapData }
	}, [returns, groupBy])

	return (
		<>
			{isCoinPage ? (
				<TotalLocked>
					<span>Category: {returns[0].categoryName}</span>
				</TotalLocked>
			) : (
				<TotalLocked>
					<span>Average Performance per Category weighted by market cap</span>
				</TotalLocked>
			)}

			<ChartsContainer>
				<TabList>
					<Tab onClick={() => setTab('barchart')} aria-selected={tab === 'barchart'}>
						Barchart
					</Tab>
					<Tab onClick={() => setTab('heatmap')} aria-selected={tab === 'heatmap'}>
						Heatmap
					</Tab>
					<Tab onClick={() => setTab('returns')} aria-selected={tab === 'returns'}>
						Linechart
					</Tab>
				</TabList>

				<TabContainer>
					<>
						{tab === 'returns' ? null : (
							<Filters color={primaryColor} style={{ marginLeft: 'auto' }}>
								{(['1D', '7D', '30D', 'YTD', '365D'] as const).map((period) => (
									<Denomination key={period} as="button" active={groupBy === period} onClick={() => setGroupBy(period)}>
										{period.charAt(0).toUpperCase() + period.slice(1)}
									</Denomination>
								))}
							</Filters>
						)}
					</>
					{tab === 'barchart' ? (
						<>
							<BarChart title="" chartData={barChart} valueSymbol="%" height="480px" />
						</>
					) : tab === 'returns' ? (
						<AreaChart
							title=""
							chartData={returnsChartData}
							stacks={coinsInCategory}
							valueSymbol="%"
							hideDefaultLegend={true}
							hideGradient={true}
							customLegendName={isCoinPage ? 'Coin' : 'Category'}
							customLegendOptions={coinsInCategory}
							hideOthersInTooltip
							chartOptions={areaChartoptions}
							height="533px"
						/>
					) : (
						<TreemapChart chartData={heatmapData} />
					)}
				</TabContainer>
			</ChartsContainer>

			<TableWithSearch
				data={sortedReturns}
				columns={isCoinPage ? CoinReturnsColumn : CategoryReturnsColumn}
				columnToSearch={'name'}
				placeholder={'Search...'}
			/>
		</>
	)
}

const areaChartoptions = {
	yAxis: {
		position: 'right'
	}
}
