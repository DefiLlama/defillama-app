import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import styled from 'styled-components'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, PanelHiddenMobile } from '~/components'
import { Denomination, Filters, FiltersWrapper } from '~/components/ECharts/ProtocolChart/ProtocolChart'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import type { IDexChartsProps } from './types'
import { getCleanMonthTimestamp, getCleanWeekTimestamp } from './utils'
import { volumeTypes } from '~/utils/adaptorsPages/utils'
import QuestionHelper from '~/components/QuestionHelper'
import { useChartInterval } from '~/contexts/LocalStorage'
import LocalLoader from '~/components/LocalLoader'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false,
	loading: () => <LocalLoader style={{ margin: 'auto' }} />
}) as React.FC<IBarChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => <LocalLoader style={{ margin: 'auto' }} />
}) as React.FC<IChartProps>

export const FlatDenomination = styled(Denomination)`
	white-space: nowrap;
	overflow: hidden;
`
export const FiltersAligned = styled(Filters)``

export const FiltersWrapperRow = styled(FiltersWrapper)`
	justify-content: space-between;
	flex-direction: row;
	margin: 1rem 1rem 0 1rem;
	align-items: center;
	font-weight: 600;
	color: ${({ theme }) => (theme.mode === 'dark' ? 'rgba(255, 255, 255, 1)' : 'rgba(0, 0, 0, 1)')};
	font-size: 1.3em;
`

export interface IMainBarChartProps {
	type: string
	total24h: number | null
	change_1d: number | null
	change_1m: number | null
	change_7dover7d: number | null
	chartData: IBarChartProps['chartData'] | null
}

export type DataIntervalType = 'Daily' | 'Weekly' | 'Monthly' | string
export const GROUP_INTERVALS_LIST: DataIntervalType[] = ['Daily', 'Weekly', 'Monthly']
export type ChartType = 'Volume' | 'Dominance'
export const GROUP_CHART_LIST: ChartType[] = ['Volume', 'Dominance']

export const aggregateDataByInterval =
	(barInterval: DataIntervalType, chartData: IDexChartsProps['chartData']) => () => {
		let cleanTimestampFormatter: typeof getCleanMonthTimestamp
		if (barInterval === 'Monthly') cleanTimestampFormatter = getCleanMonthTimestamp
		else if (barInterval === 'Weekly') cleanTimestampFormatter = getCleanWeekTimestamp
		else cleanTimestampFormatter = (timestampInSeconds: number) => timestampInSeconds

		const monthBarsDataMap = chartData[0].reduce((acc, current) => {
			const cleanDate = cleanTimestampFormatter(+current.date)
			acc[cleanDate] = Object.entries(current).reduce((intervalAcc, [label, value]) => {
				if (typeof value === 'string') return intervalAcc
				const v = ((intervalAcc[label] as number) ?? 0) + value
				if (v !== 0) intervalAcc[label] = v
				return intervalAcc
			}, acc[cleanDate] ?? ({} as typeof acc[number]))
			return acc
		}, {} as typeof chartData[0])
		return Object.entries(monthBarsDataMap).map(([date, bar]) => ({ ...bar, date }))
	}

export const MainBarChart: React.FC<IDexChartsProps> = (props) => {
	const [chartType, setChartType] = React.useState<ChartType>('Volume')
	const [chartInterval, changeChartInterval] = useChartInterval()
	const dataType = volumeTypes.includes(props.type) ? 'volume' : props.type
	const simpleStack =
		props.chartData[1].includes('Fees') || props.chartData[1].includes('Premium volume')
			? props.chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
			: undefined

	const barsData = React.useMemo(aggregateDataByInterval(chartInterval, props.chartData), [
		props.chartData,
		chartInterval
	])

	return (
		<ChartAndValuesWrapper>
			{typeof props.data.total24h === 'number' ||
			typeof props.data.change_1d === 'number' ||
			typeof props.data.change_1m === 'number' ||
			(typeof props.data.dexsDominance === 'number' && props.type === 'dexs') ||
			(typeof props.data.change_7dover7d === 'number' && props.type === 'dexs') ||
			(typeof props.data.total7d === 'number' && props.type === 'dexs') ? (
				<BreakpointPanels>
					{!Number.isNaN(props.data.total24h) ? (
						<BreakpointPanel>
							<h1>Total {dataType} (24h)</h1>
							<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
								{formattedNum(props.data.total24h, true)}
							</p>
						</BreakpointPanel>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.total7d) ? (
						<BreakpointPanel>
							<h1>Total {dataType} (7d)</h1>
							<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
								{formattedNum(props.data.total7d, true)}
							</p>
						</BreakpointPanel>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.change_7dover7d) ? (
						<PanelHiddenMobileHelper>
							<div>
								<h2>Weekly change</h2>
								<QuestionHelper
									text={`Change of last 7d volume over the previous 7d volume of all dexs`}
									textAlign="center"
								/>
							</div>
							{props.data.change_7dover7d > 0 ? (
								<p style={{ '--tile-text-color': '#3cfd99' } as React.CSSProperties}>
									{' '}
									{props.data.change_7dover7d || 0}%
								</p>
							) : (
								<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}>
									{' '}
									{props.data.change_7dover7d || 0}%
								</p>
							)}
						</PanelHiddenMobileHelper>
					) : null}
					{props.type !== 'dexs' && !Number.isNaN(props.data.change_1d) ? (
						<PanelHiddenMobile>
							<h2>Change (24h)</h2>
							{props.data.change_1d > 0 ? (
								<p style={{ '--tile-text-color': '#3cfd99' } as React.CSSProperties}> {props.data.change_1d || 0}%</p>
							) : (
								<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {props.data.change_1d || 0}%</p>
							)}
						</PanelHiddenMobile>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.dexsDominance) ? (
						<>
							{!props.name && (
								<PanelHiddenMobileHelper>
									<div>
										<h2>DEX vs CEX dominance</h2>
										<QuestionHelper
											text={`Dexs dominance over aggregated dexs and cexs volume (24h)`}
											textAlign="center"
										/>
									</div>
									<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}>
										{' '}
										{props.data.dexsDominance || 0}%
									</p>
								</PanelHiddenMobileHelper>
							)}
						</>
					) : !Number.isNaN(props.data.change_1m) ? (
						<PanelHiddenMobile>
							<h2>Change (30d)</h2>
							<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {props.data.change_1m || 0}%</p>
						</PanelHiddenMobile>
					) : null}
				</BreakpointPanels>
			) : (
				<></>
			)}
			<BreakpointPanel id="chartWrapper">
				<>
					<FiltersWrapperRow>
						<FiltersAligned color={'#4f8fea'}>
							{GROUP_INTERVALS_LIST.map((dataInterval) => (
								<FlatDenomination
									key={dataInterval}
									onClick={() => changeChartInterval(dataInterval)}
									active={dataInterval === chartInterval}
								>
									{dataInterval}
								</FlatDenomination>
							))}
						</FiltersAligned>
						{props.chartTypes && (
							<Filters color={'#4f8fea'}>
								{props.chartTypes.map((dataType) => (
									<Link href={`/options?dataType=${dataType}`} key={dataType} shallow passHref>
										<FlatDenomination active={dataType === props.selectedType}>{dataType}</FlatDenomination>
									</Link>
								))}
							</Filters>
						)}
						{props.chartData?.[1]?.length > 1 ? (
							<Filters color={'#4f8fea'}>
								{GROUP_CHART_LIST.map((dataType) => (
									<FlatDenomination
										active={dataType === chartType}
										key={dataType}
										onClick={() => setChartType(dataType)}
									>
										{dataType}
									</FlatDenomination>
								))}
							</Filters>
						) : (
							<></>
						)}
					</FiltersWrapperRow>
				</>
				{barsData && barsData.length > 0 && (
					<>
						{chartType === 'Dominance' ? (
							<AreaChart title="" chartData={barsData} stacks={props.chartData[1]} expandTo100Percent valueSymbol="%" />
						) : (
							<StackedBarChart
								title=""
								chartData={barsData}
								customLegendOptions={props.chartData[1]}
								stacks={simpleStack}
								hideDefaultLegend={props.disableDefaultLeged}
								/* stackColors={stackedBarChartColors} */
							/>
						)}
					</>
				)}
			</BreakpointPanel>
		</ChartAndValuesWrapper>
	)
}

const PanelHiddenMobileHelper = styled(PanelHiddenMobile)`
	& > div {
		display: inline-flex;
		gap: 0.5em;
	}
	& > div > h2 {
		min-width: 0;
		font-weight: 500;
		font-size: 1rem;
	}
`
