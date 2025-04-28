import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { firstDayOfMonth, formattedNum, lastDayOfWeek } from '~/utils'
import type { IDexChartsProps } from './types'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useDimensionChartInterval } from '~/contexts/LocalStorage'
import { LocalLoader } from '~/components/LocalLoader'
import { VOLUME_TYPE_ADAPTORS } from '~/api/categories/adaptors'

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

		let cleanTimestampFormatter: (timestampInSeconds: number) => number
		if (barInterval === 'Monthly')
			cleanTimestampFormatter = (timestampInSeconds) => firstDayOfMonth(timestampInSeconds * 1000)
		else if (barInterval === 'Weekly')
			cleanTimestampFormatter = (timestampInSeconds) => lastDayOfWeek(timestampInSeconds * 1000)
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
	const [chartInterval, changeChartInterval] = useDimensionChartInterval()
	const dataType = VOLUME_TYPE_ADAPTORS.includes(props.type) ? 'volume' : props.type

	const { barsData, simpleStack } = React.useMemo(() => {
		const barsData = aggregateDataByInterval(chartInterval, props.chartData)()
		return {
			barsData: aggregateDataByInterval(chartInterval, props.chartData)(),
			simpleStack:
				barsData.length > 0
					? Object.fromEntries(
							Object.keys(barsData[barsData.length - 1])
								.filter((x) => x !== 'date')
								.map((x) => [x, `stack-${x}`])
					  )
					: null
		}
	}, [props.chartData, chartInterval])

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
		<div className={`grid grid-cols-2 ${valuesExist ? 'xl:grid-cols-3' : ''} relative isolate gap-1`}>
			{valuesExist ? (
				<div className="bg-[var(--cards-bg)] rounded-md flex flex-col gap-6 p-5 col-span-2 w-full xl:col-span-1 overflow-x-auto">
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
										<span>DEX vs CEX dominance</span>
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
			<div className="bg-[var(--cards-bg)] rounded-md flex flex-col col-span-2">
				<>
					<div className="flex gap-2 flex-row items-center flex-wrap justify-between p-3">
						<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
							{GROUP_INTERVALS_LIST.map((dataInterval) => (
								<a
									key={dataInterval}
									onClick={() => changeChartInterval(dataInterval as 'Daily' | 'Weekly' | 'Monthly')}
									data-active={dataInterval === chartInterval}
									className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
								>
									{dataInterval}
								</a>
							))}
						</div>
						{props.chartTypes && (
							<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
								{props.chartTypes.map((dataType) => (
									<Link href={`${router.asPath.split('?')[0]}?dataType=${dataType}`} key={dataType} shallow passHref>
										<a
											data-active={dataType === props.selectedType}
											className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
										>
											{dataType}
										</a>
									</Link>
								))}
							</div>
						)}
						{props.chartData?.[1]?.length > 1 ? (
							<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
								{GROUP_CHART_LIST.map((dataType) => (
									<button
										className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
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
							<BarChart
								title=""
								chartData={barsData}
								customLegendOptions={props.chartData[1]}
								stacks={simpleStack}
								hideDefaultLegend={props.disableDefaultLeged}
								groupBy={chartInterval.toLowerCase()}
								/* stackColors={barChartColors} */
							/>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
