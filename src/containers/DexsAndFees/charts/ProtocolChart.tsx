import * as React from 'react'
import dynamic from 'next/dynamic'
import { DetailsWrapper, Name, ChartWrapper } from '~/layout/ProtocolAndPool'
import { StatsSection } from '~/layout/Stats/Medium'
import { Stat } from '~/layout/Stats/Large'
import FormattedName from '~/components/FormattedName'
import TokenLogo from '~/components/TokenLogo'
import { capitalizeFirstLetter, formattedNum } from '~/utils'
import { formatTimestampAsDate } from '~/api/categories/dexs/utils'
import { IBarChartProps } from '~/components/ECharts/types'
import { IJoin2ReturnType, IOverviewProps } from '~/api/categories/adaptors'
import {
	aggregateDataByInterval,
	DataIntervalType,
	FiltersAligned,
	FiltersWrapperRow,
	FlatDenomination,
	GROUP_INTERVALS_LIST
} from '../common'
import { volumeTypes } from '~/utils/adaptorsPages/utils'
import type { IProtocolContainerProps } from '../types'
import LocalLoader from '~/components/LocalLoader'

const StackedChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false,
	loading: () => <LocalLoader style={{ margin: 'auto' }} />
}) as React.FC<IBarChartProps>

export interface IDexChartsProps {
	data: {
		total24h: IProtocolContainerProps['protocolSummary']['total24h']
		total7d: IProtocolContainerProps['protocolSummary']['total7d']
		disabled: IProtocolContainerProps['protocolSummary']['disabled']
		dailyRevenue?: IProtocolContainerProps['protocolSummary']['dailyRevenue']
		change_1d: IProtocolContainerProps['protocolSummary']['change_1d']
		change_1m?: IProtocolContainerProps['protocolSummary']['change_1m']
		change_7dover7d?: IOverviewProps['dexsDominance']
		dexsDominance?: IOverviewProps['dexsDominance']
	}
	chartData: [IJoin2ReturnType, string[]]
	name: string
	logo?: string
	isProtocolPage?: boolean
	chainsChart?: IDexChartsProps['chartData']
	type?: string
	title?: string
	fullChart?: boolean
	totalAllTime?: number
	disableDefaultLeged?: boolean
	chartTypes?: string[]
	selectedType?: string
	selectedChartType?: string
}

export const ProtocolChart = ({
	logo,
	data,
	chartData,
	name,
	type,
	title,
	fullChart = false,
	totalAllTime,
	disableDefaultLeged = false
}: IDexChartsProps) => {
	const typeString = volumeTypes.includes(type) ? 'Volume' : capitalizeFirstLetter(type)
	const typeSimple = volumeTypes.includes(type) ? 'volume' : type

	if (fullChart) {
		return <OnlyChart title={title} chartData={chartData} />
	}

	return (
		<StatsSection>
			<DetailsWrapper>
				{name && (
					<Name>
						<TokenLogo logo={logo} size={24} />
						<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
					</Name>
				)}
				{data.total24h || data.total24h === 0 ? (
					<Stat>
						<span>
							{data.disabled === true
								? `Last day ${typeString.toLowerCase()} (${formatTimestampAsDate(
										+chartData[0][chartData[0].length - 1][0]
								  )})`
								: `${typeString} (24h)`}
						</span>
						<span>{formattedNum(data.total24h || '0', true)}</span>
					</Stat>
				) : (
					<></>
				)}
				{data.dailyRevenue || data.dailyRevenue === 0 ? (
					<Stat>
						<span>
							{data.disabled === true
								? `Last day ${typeString.toLowerCase()} (${formatTimestampAsDate(
										+chartData[0][chartData[0].length - 1][0]
								  )})`
								: `Revenue (24h)`}
						</span>
						<span>{formattedNum(data.dailyRevenue || '0', true)}</span>
					</Stat>
				) : (
					<></>
				)}

				{typeString !== 'Fees' && data.change_1d ? (
					<Stat>
						<span>
							{data.disabled === true
								? `Last day change (${formatTimestampAsDate(+chartData[0][chartData[0].length - 1][0])})`
								: 'Change (24h)'}
						</span>
						<span>{data.change_1d || 0}%</span>
					</Stat>
				) : (
					<></>
				)}
				{totalAllTime ? (
					<Stat>
						<span>{`All time ${typeSimple}`}</span>
						<span>{formattedNum(totalAllTime, true)}</span>
					</Stat>
				) : (
					<></>
				)}
			</DetailsWrapper>

			<ChartWrapper>
				<OnlyChart title={title} chartData={chartData} />
			</ChartWrapper>
		</StatsSection>
	)
}

const OnlyChart = ({ title, chartData }: { title: string; chartData: [IJoin2ReturnType, string[]] }) => {
	const [barInterval, setBarInterval] = React.useState<DataIntervalType>('Daily')
	const simpleStack =
		chartData[1].includes('Fees') || chartData[1].includes('Premium volume')
			? chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
			: undefined

	const barsData = React.useMemo(aggregateDataByInterval(barInterval, chartData), [chartData, barInterval])

	return (
		<>
			{barsData && barsData.length > 0 && (
				<>
					<FiltersWrapperRow>
						<>{title ?? ''}</>
						<FiltersAligned color={'#4f8fea'}>
							{GROUP_INTERVALS_LIST.map((dataInterval) => (
								<FlatDenomination
									key={dataInterval}
									onClick={() => setBarInterval(dataInterval)}
									active={dataInterval === barInterval}
								>
									{dataInterval}
								</FlatDenomination>
							))}
						</FiltersAligned>
					</FiltersWrapperRow>
					<StackedChart
						title={''}
						chartData={barsData}
						customLegendOptions={chartData[1]}
						stacks={simpleStack}
						stackColors={stackedBarChartColors}
					/>
				</>
			)}
		</>
	)
}

const stackedBarChartColors = {
	Fees: '#4f8fea',
	Revenue: '#E59421'
}
