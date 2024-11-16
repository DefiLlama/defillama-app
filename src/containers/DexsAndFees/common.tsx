import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import type { IDexChartsProps } from './types'
import { getCleanMonthTimestamp, getCleanWeekTimestamp } from './utils'
import { volumeTypes } from '~/utils/adaptorsPages/utils'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useChartInterval } from '~/contexts/LocalStorage'
import { LocalLoader } from '~/components/LocalLoader'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
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
		if (barInterval === 'Cumulative') {
			let cumulativeData = {}

			let currentDate

			const cumulativeStore = {}

			chartData[0].forEach(({ date, ...metricsOnDay }) => {
				if (!currentDate || currentDate < +date) {
					currentDate = +date
				}

				chartData[1].forEach((chartType) => {
					if (!cumulativeData[date]) {
						cumulativeData[date] = {}
					}

					cumulativeStore[chartType] = (cumulativeStore[chartType] || 0) + (+metricsOnDay[chartType] || 0)

					cumulativeData[currentDate][chartType] = cumulativeStore[chartType]
				})
			})

			return Object.entries(cumulativeData).map(([date, values]: [string, { [key: string]: number }]) => ({
				date,
				...values
			}))
		}

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
	const router = useRouter()
	const [chartType, setChartType] = React.useState<ChartType>('Volume')
	const [chartInterval, changeChartInterval] = useChartInterval()
	const dataType = volumeTypes.includes(props.type) ? 'volume' : props.type
	const simpleStack =
		props.chartData[1].includes('Fees') || props.chartData[1].includes('Premium volume')
			? props.chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
			: undefined

	const barsData = React.useMemo(
		() => aggregateDataByInterval(chartInterval, props.chartData)(),
		[props.chartData, chartInterval]
	)

	const valuesExist =
		typeof props.data.total24h === 'number' ||
		typeof props.data.change_1d === 'number' ||
		typeof props.data.change_1m === 'number' ||
		(typeof props.data.dexsDominance === 'number' && props.type === 'dexs') ||
		(typeof props.data.change_7dover7d === 'number' && props.type === 'dexs') ||
		(typeof props.data.total7d === 'number' && props.type === 'dexs')
			? true
			: false

	return (
		<div
			className={`grid grid-cols-1 ${
				valuesExist ? 'xl:grid-cols-[auto_1fr]' : ''
			} relative isolate bg-[var(--bg6)] border border-[var(--divider)] shadow rounded-xl`}
		>
			{valuesExist ? (
				<div className="flex flex-col gap-5 p-6 col-span-1 w-full xl:w-[380px] rounded-t-xl xl:rounded-l-xl xl:rounded-r-none text-[var(--text1)] bg-[var(--bg7)] overflow-x-auto">
					{!Number.isNaN(props.data.total24h) ? (
						<p className="flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Total {dataType} (24h)</span>
							<span className="font-semibold text-2xl font-jetbrains">{formattedNum(props.data.total24h, true)}</span>
						</p>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.total7d) ? (
						<p className="flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Total {dataType} (7d)</span>
							<span className="font-semibold text-2xl font-jetbrains">{formattedNum(props.data.total7d, true)}</span>
						</p>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.change_7dover7d) ? (
						<p className="hidden md:flex flex-col">
							<span className="flex items-center gap-1 text-[#545757] dark:text-[#cccccc]">
								<span>Weekly change</span>
								<QuestionHelper text={`Change of last 7d volume over the previous 7d volume of all dexs`} />
							</span>
							{props.data.change_7dover7d > 0 ? (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_7dover7d || 0}%</span>
							) : (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_7dover7d || 0}%</span>
							)}
						</p>
					) : null}
					{props.type !== 'dexs' && !Number.isNaN(props.data.change_1d) ? (
						<p className="hidden md:flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (24h)</span>
							{props.data.change_1d > 0 ? (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_1d || 0}%</span>
							) : (
								<span className="font-semibold text-2xl font-jetbrains">{props.data.change_1d || 0}%</span>
							)}
						</p>
					) : null}
					{props.type === 'dexs' && !Number.isNaN(props.data.dexsDominance) ? (
						<>
							{!props.name && (
								<p className="hidden md:flex flex-col">
									<span className="flex items-center gap-1 text-[#545757] dark:text-[#cccccc]">
										<h2>DEX vs CEX dominance</h2>
										<QuestionHelper text={`Dexs dominance over aggregated dexs and cexs volume (24h)`} />
									</span>
									<span className="font-semibold text-2xl font-jetbrains">{props.data.dexsDominance || 0}%</span>
								</p>
							)}
						</>
					) : !Number.isNaN(props.data.change_1m) ? (
						<p className="hidden md:flex flex-col">
							<span className="text-[#545757] dark:text-[#cccccc]">Change (30d)</span>
							<span className="font-semibold text-2xl font-jetbrains">{props.data.change_1m || 0}%</span>
						</p>
					) : null}
				</div>
			) : (
				<></>
			)}
			<div className="flex flex-col gap-4 py-4 col-span-1 min-h-[418px]">
				<>
					<div className="flex gap-2 flex-row items-center flex-wrap justify-between mx-4">
						<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] font-normal text-sm">
							{GROUP_INTERVALS_LIST.map((dataInterval) => (
								<a
									key={dataInterval}
									onClick={() => changeChartInterval(dataInterval)}
									data-active={dataInterval === chartInterval}
									className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10 cursor-pointer"
								>
									{dataInterval}
								</a>
							))}
						</div>
						{props.chartTypes && (
							<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] font-normal text-sm">
								{props.chartTypes.map((dataType) => (
									<Link href={`${router.asPath.split('?')[0]}?dataType=${dataType}`} key={dataType} shallow passHref>
										<a
											data-active={dataType === props.selectedType}
											className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10 cursor-pointer"
										>
											{dataType}
										</a>
									</Link>
								))}
							</div>
						)}
						{props.chartData?.[1]?.length > 1 ? (
							<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] font-normal text-sm">
								{GROUP_CHART_LIST.map((dataType) => (
									<button
										className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10 cursor-pointer"
										data-active={dataType === chartType}
										key={dataType}
										onClick={() => setChartType(dataType)}
									>
										{dataType}
									</button>
								))}
							</div>
						) : (
							<></>
						)}
					</div>
				</>
				{barsData && barsData.length > 0 && (
					<div className="min-h-[360px]">
						{chartType === 'Dominance' ? (
							<AreaChart title="" chartData={barsData} stacks={props.chartData[1]} expandTo100Percent valueSymbol="%" />
						) : (
							<StackedBarChart
								title=""
								chartData={barsData}
								customLegendOptions={props.chartData[1]}
								stacks={simpleStack}
								hideDefaultLegend={props.disableDefaultLeged}
								isMonthly={chartInterval === 'Monthly'}
								/* stackColors={stackedBarChartColors} */
							/>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
