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

// func for denominating the cumulative returns in either $, btc, eth or sol
function calculateDenominatedReturns(data, denominatedCoin) {
	const sortedData = data.sort((a, b) => a.date - b.date)

	const denominatedReturns = []

	// calculate eg BTC-denominated returns for each day
	sortedData.forEach((dayData, index) => {
		const newDayData = { date: dayData.date }

		if (index === 0) {
			// for first day, we set all returns to 0 (base case)
			Object.keys(dayData).forEach((category) => {
				if (category !== 'date' && category !== denominatedCoin) {
					newDayData[category] = 0
				}
			})
		} else {
			const previousDay = sortedData[index - 1]

			// calculate daily return for `denominatedCoin` eg Bitcoin
			const btcDailyReturn = (1 + dayData[denominatedCoin] / 100) / (1 + previousDay[denominatedCoin] / 100) - 1

			Object.keys(dayData).forEach((category) => {
				if (category !== 'date' && category !== denominatedCoin) {
					// calculate daily return for the category
					const categoryDailyReturn = (1 + dayData[category] / 100) / (1 + previousDay[category] / 100) - 1

					// calculate daily return denominated by eg Bitcoin
					const btcDenominatedDailyReturn = (1 + categoryDailyReturn) / (1 + btcDailyReturn) - 1

					// calculate cumulative return
					const previousCumulativeReturn = denominatedReturns[index - 1][category]
					newDayData[category] = ((1 + previousCumulativeReturn / 100) * (1 + btcDenominatedDailyReturn) - 1) * 100
				}
			})
		}

		denominatedReturns.push(newDayData)
	})

	return denominatedReturns
}

export const CategoryReturnsContainer = ({ returns, isCoinPage, returnsChartData, coinsInCategory }) => {
	useScrollToTop()

	const [tab, setTab] = React.useState('linechart')
	const [groupBy, setGroupBy] = React.useState<'1D' | '7D' | '30D' | '365D' | 'YTD'>('7D')

	const [groupByDenom, setGroupByDenom] = React.useState<'$' | 'BTC' | 'ETH' | 'SOL'>('$')

	const { sortedReturns, barChart, heatmapData, lineChart } = React.useMemo(() => {
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

		const denomCoin = {
			$: '$',
			BTC: 'Bitcoin',
			ETH: 'Ethereum',
			SOL: 'Solana'
		}[groupByDenom]

		const lineChart = denomCoin === '$' ? returnsChartData : calculateDenominatedReturns(returnsChartData, denomCoin)

		return { sortedReturns: sorted, barChart, heatmapData, lineChart }
	}, [returns, groupBy, returnsChartData, groupByDenom])

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
					<Tab onClick={() => setTab('linechart')} aria-selected={tab === 'linechart'}>
						Linechart
					</Tab>
					<Tab onClick={() => setTab('barchart')} aria-selected={tab === 'barchart'}>
						Barchart
					</Tab>
					<Tab onClick={() => setTab('heatmap')} aria-selected={tab === 'heatmap'}>
						Heatmap
					</Tab>
				</TabList>

				<TabContainer>
					<>
						{tab === 'linechart' ? (
							<Filters color={primaryColor} style={{ marginLeft: 'auto' }}>
								<DenominationLabel>Denominate in</DenominationLabel>
								{(['$', 'BTC', 'ETH', 'SOL'] as const).map((denom) => (
									<Denomination
										key={denom}
										as="button"
										active={groupByDenom === denom}
										onClick={() => setGroupByDenom(denom)}
									>
										{denom}
									</Denomination>
								))}
							</Filters>
						) : (
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
							<BarChart title="" chartData={barChart} valueSymbol="%" height="533px" />
						</>
					) : tab === 'linechart' ? (
						<AreaChart
							title=""
							chartData={lineChart}
							stacks={coinsInCategory}
							valueSymbol="%"
							hideDefaultLegend={true}
							hideGradient={true}
							customLegendName={isCoinPage ? 'Coin' : 'Category'}
							customLegendOptions={coinsInCategory}
							tooltipValuesRelative
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

const DenominationLabel = styled.p`
	padding-left: 8px;
	font-size: 12px;
`
