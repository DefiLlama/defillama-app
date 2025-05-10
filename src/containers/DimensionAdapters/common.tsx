import * as React from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { IBarChartProps, IChartProps } from '~/components/ECharts/types'
import { firstDayOfMonth, formattedNum, getNDistinctColors, lastDayOfWeek } from '~/utils'
import type { IDexChartsProps } from './types'
import { QuestionHelper } from '~/components/QuestionHelper'
import { useDimensionChartInterval } from '~/contexts/LocalStorage'
import { LocalLoader } from '~/components/LocalLoader'
import { VOLUME_TYPE_ADAPTORS } from '~/api/categories/adaptors'
import { formatTooltipChartDate, formatTooltipValue } from '~/components/ECharts/useDefaults'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

const BarChart2 = dynamic(() => import('~/components/ECharts/BarChart2'), {
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

	const [selectedChains, setSelectedChains] = React.useState<string[]>(props.chartData?.[1] ?? [])

	const { barsData, stackColors, chartOptions } = React.useMemo(() => {
		if (chartType === 'Dominance') {
			return {
				barsData: aggregateDataByInterval(chartInterval, [...props.chartData])(),
				stackColors: {},
				chartOptions: {}
			}
		}
		const topByAllDates = {}
		const uniqTopChains = new Set<string>()
		for (const { date, ...items } of props.chartData[0]) {
			const finalDate =
				chartInterval === 'Daily'
					? +date * 1e3
					: chartInterval === 'Weekly'
					? lastDayOfWeek(+date * 1e3) * 1e3
					: firstDayOfMonth(+date * 1e3) * 1e3
			const topByDate = {}
			let others = 0
			const topItems = []
			for (const chain in items) {
				if (selectedChains.includes(chain)) {
					topItems.push([chain, items[chain]])
				}
			}
			topItems
				.sort((a: [string, number], b: [string, number]) => b[1] - a[1])
				.forEach(([chain, value]: [string, number], index: number) => {
					if (index < 10) {
						topByDate[chain] = topByDate[chain] || {}
						topByDate[chain][finalDate] = value ?? 0
						uniqTopChains.add(chain)
					} else {
						topByDate[chain] = topByDate[chain] || {}
						topByDate[chain][finalDate] = 0
						others += value ?? 0
					}
				})

			for (const chain of selectedChains) {
				topByAllDates[chain] = topByAllDates[chain] || {}
				topByAllDates[chain][finalDate] = topByDate[chain]?.[finalDate] ?? 0
			}

			topByAllDates['Others'] = topByAllDates['Others'] || {}
			topByAllDates['Others'][finalDate] = others
		}

		const finalData = {}
		const zeroesByChain = {}
		for (const chain of [...uniqTopChains, 'Others']) {
			finalData[chain] = finalData[chain] || []
			for (const finalDate in topByAllDates[chain]) {
				finalData[chain].push([+finalDate, topByAllDates[chain][finalDate]])
			}
			zeroesByChain[chain] = Math.max(
				finalData[chain].findIndex((date) => date[1] !== 0),
				0
			)
		}

		let startingZeroDatesToSlice = Object.values(zeroesByChain).reduce((a, b) => Math.min(a as number, b as number))
		for (const chain in finalData) {
			const idx = zeroesByChain[chain]
			startingZeroDatesToSlice = idx
			if (!finalData[chain].length) delete finalData[chain]
		}

		for (const chain in finalData) {
			finalData[chain] = finalData[chain].slice(startingZeroDatesToSlice)
		}

		const allColors = getNDistinctColors(selectedChains.length + 1, '#1f67d2')
		const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
		stackColors[selectedChains[0]] = '#1f67d2'
		stackColors['Others'] = allColors[allColors.length - 1]

		const chartOptions = {
			tooltip: {
				trigger: 'axis',
				confine: true,
				formatter: function (params) {
					let chartdate = formatTooltipChartDate(params[0].value[0], chartInterval.toLowerCase())
					let others = 0
					let othersMarker = ''
					let vals = params
						.sort((a, b) => b.value[1] - a.value[1])
						.reduce((prev, curr) => {
							if (curr.value[1] === 0) return prev
							if (curr.seriesName === 'Others') {
								others += curr.value[1]
								othersMarker = curr.marker
								return prev
							}
							return (prev +=
								'<li style="list-style:none">' +
								curr.marker +
								curr.seriesName +
								'&nbsp;&nbsp;' +
								formatTooltipValue(curr.value[1], '$') +
								'</li>')
						}, '')
					if (others) {
						vals +=
							'<li style="list-style:none">' +
							othersMarker +
							'Others&nbsp;&nbsp;' +
							formatTooltipValue(others, '$') +
							'</li>'
					}
					return chartdate + vals
				}
			}
		}

		return {
			barsData: finalData,
			stackColors,
			chartOptions
		}
	}, [props.chartData, chartInterval, selectedChains, chartType])

	console.log({ barsData, chartInterval, chartType })

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
					<div className="flex gap-2 flex-row items-center flex-wrap justify-end p-3">
						<div className="text-xs font-medium flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] mr-auto">
							{GROUP_INTERVALS_LIST.map((dataInterval) => (
								<a
									key={dataInterval}
									onClick={() => changeChartInterval(dataInterval as 'Daily' | 'Weekly' | 'Monthly')}
									data-active={dataInterval === chartInterval}
									className="cursor-pointer flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
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
							<>
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
								<SelectWithCombobox
									allValues={props.chartData[1]}
									selectedValues={selectedChains}
									setSelectedValues={setSelectedChains}
									label="Chains"
									clearAll={() => setSelectedChains([])}
									toggleAll={() => setSelectedChains(props.chartData[1])}
									labelType="smol"
									triggerProps={{
										className:
											'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[var(--form-control-border)] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium z-10'
									}}
									portal
								/>
							</>
						) : null}
					</div>
				</>
				{props.chartData ? (
					<div className="min-h-[360px]">
						{chartType === 'Dominance' ? (
							<AreaChart title="" chartData={barsData} stacks={props.chartData[1]} expandTo100Percent valueSymbol="%" />
						) : (
							<BarChart2
								chartData={barsData}
								groupBy={chartInterval.toLowerCase()}
								stackColors={stackColors}
								chartOptions={chartOptions}
							/>
						)}
					</div>
				) : null}
			</div>
		</div>
	)
}
