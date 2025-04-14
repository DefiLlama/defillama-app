import * as React from 'react'
import dynamic from 'next/dynamic'
import { FormattedName } from '~/components/FormattedName'
import { TokenLogo } from '~/components/TokenLogo'
import { capitalizeFirstLetter, formattedNum, slug } from '~/utils'
import { formatTimestampAsDate } from '~/api/categories/adaptors/utils'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { IJoin2ReturnType, IOverviewProps, VOLUME_TYPE_ADAPTORS } from '~/api/categories/adaptors'
import { aggregateDataByInterval, DataIntervalType, GROUP_INTERVALS_LIST } from '../common'
import type { IProtocolContainerProps } from '../types'
import { LocalLoader } from '~/components/LocalLoader'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useFeesManager } from '~/contexts/LocalStorage'

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center m-auto h-[406px]">
			<LocalLoader />
		</div>
	)
}) as React.FC<IBarChartProps>

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false,
	loading: () => (
		<div className="flex items-center justify-center m-auto h-[406px]">
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
	linkedProtocols?: string[]
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
	linkedProtocols,
	disableDefaultLeged = false
}: IDexChartsProps) => {
	const router = useRouter()

	const typeString = VOLUME_TYPE_ADAPTORS.includes(type) ? 'Volume' : capitalizeFirstLetter(type)
	const typeSimple = VOLUME_TYPE_ADAPTORS.includes(type) ? 'volume' : type

	const tabs = linkedProtocols

	const [barInterval, setBarInterval] = React.useState<DataIntervalType>('Daily')

	const { simpleStack, customLegendOptions } = React.useMemo(() => {
		const simpleStack = chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
		return { simpleStack, customLegendOptions: Object.keys(simpleStack) }
	}, [chartData])
	// const simpleStack =
	// 	chartData[1].includes('Fees') || chartData[1].includes('Premium volume')
	// 		? chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
	// 		: undefined

	const barsData = React.useMemo(() => aggregateDataByInterval(barInterval, chartData)(), [chartData, barInterval])

	const [enabledSettings] = useFeesManager()

	return (
		<div className="grid grid-cols-1 relative isolate xl:grid-cols-[auto_1fr] gap-1">
			{linkedProtocols && linkedProtocols.length > 0 && (
				<nav className="col-span-1 text-xs font-medium xl:col-span-2 flex overflow-x-auto rounded-md bg-[var(--cards-bg)] border-b border-black/10 dark:border-white/10">
					{tabs.map((p) => (
						<Link href={`/${type}/${slug(p)}`} key={p} passHref>
							<a
								data-active={router.asPath.split('#')[0].split('?')[0] === `/${type}/${slug(p)}`}
								className="flex-shrink-0 py-2 px-6 whitespace-nowrap first:rounded-tl-md data-[active=true]:bg-[var(--link-hover-bg)] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] border-l border-black/10 dark:border-white/10 first:border-l-0"
							>
								{p}
							</a>
						</Link>
					))}
				</nav>
			)}
			{!fullChart ? (
				<div className="flex flex-col gap-6 p-5 col-span-1 w-full xl:w-[380px] bg-[var(--cards-bg)] rounded-md overflow-x-auto">
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
												+chartData[0][chartData[0].length - 1].date
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
										? `Last day revenue (${formatTimestampAsDate(+chartData[0][chartData[0].length - 1].date)})`
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
			) : null}
			<div
				className={`flex flex-col gap-4 ${
					!fullChart ? 'col-span-1' : 'col-span-2'
				} bg-[var(--cards-bg)] rounded-md min-h-[444px]`}
			>
				{barsData && barsData.length > 0 && (
					<div className="flex gap-2 flex-row items-center flex-wrap justify-between m-3 -mb-6">
						{title ? <h1 className="text-base font-semibold">{title}</h1> : null}
						<div className="text-xs font-medium ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
							{INTERVALS_LIST.map((dataInterval) => (
								<button
									key={dataInterval}
									onClick={() => setBarInterval(dataInterval)}
									data-active={dataInterval === barInterval}
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								>
									{dataInterval}
								</button>
							))}
						</div>
					</div>
				)}

				{barInterval === 'Cumulative' ? (
					<AreaChart
						title={''}
						chartData={barsData}
						stacks={chartData[1]}
						stackColors={stackedBarChartColors}
						valueSymbol="$"
						hideDefaultLegend
						customLegendName="Chains"
						customLegendOptions={chartData[1]}
					/>
				) : (
					<BarChart
						title={''}
						chartData={barsData}
						stacks={simpleStack}
						stackColors={stackedBarChartColors}
						isMonthly={barInterval === 'Monthly'}
						hideDefaultLegend
						customLegendName="Chains"
						customLegendOptions={customLegendOptions}
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
				<div className="flex flex-col gap-2 m-3 mt-0">
					{title ? <h1 className="text-base font-semibold">{title}</h1> : null}
					<div className="text-xs font-medium m-3 ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296]">
						{INTERVALS_LIST.map((dataInterval) => (
							<button
								key={dataInterval}
								onClick={() => setBarInterval(dataInterval)}
								data-active={dataInterval === barInterval}
								className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
							>
								{dataInterval}
							</button>
						))}
					</div>
				</div>
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
