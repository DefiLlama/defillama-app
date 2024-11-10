import * as React from 'react'
import dynamic from 'next/dynamic'
import { FormattedName } from '~/components/FormattedName'
import { TokenLogo } from '~/components/TokenLogo'
import { capitalizeFirstLetter, formattedNum, standardizeProtocolName } from '~/utils'
import { formatTimestampAsDate } from '~/api/categories/dexs/utils'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
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
import { LocalLoader } from '~/components/LocalLoader'
import { useRouter } from 'next/router'
import { OtherProtocols, ProtocolLink } from '~/containers/Defi/Protocol/Common'
import Link from 'next/link'
import { useFeesManager } from '~/contexts/LocalStorage'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center m-auto min-h-[360px]">
			<LocalLoader />
		</div>
	)
}) as React.FC<IBarChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center m-auto min-h-[360px]">
			<LocalLoader />
		</div>
	)
}) as React.FC<IChartProps>

const INTERVALS_LIST = [...GROUP_INTERVALS_LIST, 'Cumulative']

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
	childProtocols?: string[]
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
	childProtocols,
	disableDefaultLeged = false
}: IDexChartsProps) => {
	const router = useRouter()

	const typeString = volumeTypes.includes(type) ? 'Volume' : capitalizeFirstLetter(type)
	const typeSimple = volumeTypes.includes(type) ? 'volume' : type

	const tabs = [name]
	if (childProtocols) tabs.push(...childProtocols)

	const [barInterval, setBarInterval] = React.useState<DataIntervalType>('Daily')

	const simpleStack = chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
	// const simpleStack =
	// 	chartData[1].includes('Fees') || chartData[1].includes('Premium volume')
	// 		? chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
	// 		: undefined

	const barsData = React.useMemo(() => aggregateDataByInterval(barInterval, chartData)(), [chartData, barInterval])

	const [enabledSettings] = useFeesManager()

	return (
		<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl">
			{childProtocols && childProtocols.length > 0 && (
				<OtherProtocols>
					{tabs.map((p) => (
						<Link href={`/${type}/${standardizeProtocolName(p)}`} key={p} passHref>
							<ProtocolLink active={router.asPath === `/${type}/${standardizeProtocolName(p)}`} color={'#fff'}>
								{p}
							</ProtocolLink>
						</Link>
					))}
				</OtherProtocols>
			)}
			{!fullChart ? (
				<div
					className="flex flex-col gap-6 p-5 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto"
					style={{ borderTopLeftRadius: tabs?.length > 1 ? 0 : '12px' }}
				>
					<>
						{name && (
							<h1 className="flex items-center gap-2 text-xl">
								<TokenLogo logo={logo} size={24} />
								<FormattedName text={name ? name + ' ' : ''} maxCharacters={16} fontWeight={700} />
							</h1>
						)}
						{data.total24h || data.total24h === 0 ? (
							<p className="flex flex-col gap-1 text-base">
								<span className="text-[#545757] dark:text-[#cccccc]">
									{data.disabled === true
										? `Last day ${typeString.toLowerCase()} (${formatTimestampAsDate(
												+chartData[0][chartData[0].length - 1][0]
										  )})`
										: `${typeString} (24h)`}
								</span>
								<span className="font-jetbrains font-semibold text-2xl">
									{formattedNum(data.total24h || '0', true)}
								</span>
							</p>
						) : null}
						{data.dailyRevenue || data.dailyRevenue === 0 ? (
							<p className="flex flex-col gap-1 text-base">
								<span className="text-[#545757] dark:text-[#cccccc]">
									{data.disabled === true
										? `Last day ${typeString.toLowerCase()} (${formatTimestampAsDate(
												+chartData[0][chartData[0].length - 1][0]
										  )})`
										: `${type === 'options' ? 'Premium Volume' : 'Revenue'} (24h)`}
								</span>
								<span className="font-jetbrains font-semibold text-2xl">
									{formattedNum(
										(data.dailyRevenue ?? 0) +
											(enabledSettings.bribes ? (data as any).dailyBribesRevenue ?? 0 : 0) +
											(enabledSettings.tokentax ? (data as any).dailyTokenTaxes ?? 0 : 0),
										true
									)}
								</span>
							</p>
						) : null}
						{totalAllTime ? (
							<p className="flex flex-col gap-1 text-base">
								<span className="text-[#545757] dark:text-[#cccccc]">{`All time ${typeSimple}`}</span>
								<span className="font-jetbrains font-semibold text-2xl">{formattedNum(totalAllTime, true)}</span>
							</p>
						) : null}
					</>
				</div>
			) : (
				// TODO: Temporal work around to unlock feature
				<>‎</>
			)}
			<div className="flex flex-col gap-4 py-3 col-span-1">
				{barsData && barsData.length > 0 && (
					<FiltersWrapperRow>
						<>{title ?? ''}</>
						<FiltersAligned color={'#4f8fea'}>
							{INTERVALS_LIST.map((dataInterval) => (
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
				)}

				{barInterval === 'Cumulative' ? (
					<AreaChart
						title={''}
						chartData={barsData}
						stacks={chartData[1]}
						stackColors={stackedBarChartColors}
						valueSymbol="$"
						hideLegend={false}
					/>
				) : (
					<BarChart
						title={''}
						chartData={barsData}
						stacks={simpleStack}
						stackColors={stackedBarChartColors}
						isMonthly={barInterval === 'Monthly'}
					/>
				)}
			</div>
		</div>
	)
}

export const ChartOnly = ({ title, chartData }) => {
	const [barInterval, setBarInterval] = React.useState<DataIntervalType>('Daily')

	// const simpleStack =
	// 	chartData[1].includes('Fees') || chartData[1].includes('Premium volume')
	// 		? chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
	// 		: undefined
	const simpleStack = chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})

	const barsData = React.useMemo(() => aggregateDataByInterval(barInterval, chartData)(), [chartData, barInterval])

	return (
		<>
			{barsData && barsData.length > 0 && (
				<FiltersWrapperRow style={{ margin: '0 20px 20px', flexDirection: 'column', alignItems: 'flex-start' }}>
					<>{title ?? ''}</>

					<FiltersAligned color={'#4f8fea'}>
						{INTERVALS_LIST.map((dataInterval) => (
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
			)}

			{barInterval === 'Cumulative' ? (
				<AreaChart
					title={''}
					chartData={barsData}
					stacks={chartData[1]}
					stackColors={stackedBarChartColors}
					valueSymbol="$"
					hideLegend={false}
				/>
			) : (
				<BarChart
					title={''}
					chartData={barsData}
					stacks={simpleStack}
					stackColors={stackedBarChartColors}
					isMonthly={barInterval === 'Monthly'}
				/>
			)}
		</>
	)
}

export const stackedBarChartColors = {
	Fees: '#4f8fea',
	Revenue: '#E59421',
	Incentives: '#1cd8a6'
}
