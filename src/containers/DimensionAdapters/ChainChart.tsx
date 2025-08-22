import * as React from 'react'
import { useMutation } from '@tanstack/react-query'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import { ILineAndBarChartProps } from '~/components/ECharts/types'
import { formatTooltipChartDate, formatTooltipValue } from '~/components/ECharts/useDefaults'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Tooltip } from '~/components/Tooltip'
import { oldBlue } from '~/constants/colors'
import { download, firstDayOfMonth, getNDistinctColors, lastDayOfWeek, slug, toNiceCsvDate } from '~/utils'
import { ADAPTER_DATA_TYPES, ADAPTER_TYPES } from './constants'
import { getAdapterChainOverview } from './queries'
import { IAdapterByChainPageData, IChainsByAdapterPageData } from './types'

const INTERVALS_LIST = ['Daily', 'Weekly', 'Monthly'] as const
const CHART_TYPES = ['Volume', 'Dominance'] as const

const LineAndBarChart = React.lazy(
	() => import('~/components/ECharts/LineAndBarChart')
) as React.FC<ILineAndBarChartProps>

const downloadBreakdownChart = async ({
	adapterType,
	dataType,
	chain
}: {
	adapterType: string
	dataType?: `${ADAPTER_DATA_TYPES}`
	chain: string
}) => {
	const data = await getAdapterChainOverview({
		adapterType: adapterType as `${ADAPTER_TYPES}`,
		chain,
		excludeTotalDataChart: true,
		excludeTotalDataChartBreakdown: false,
		dataType
	})
	const rows: any = [['Timestamp', 'Date', ...data.protocols.map((protocol) => protocol.name)]]

	for (const item of data.totalDataChartBreakdown) {
		const row = [item[0], toNiceCsvDate(item[0])]
		for (const protocol of data.protocols) {
			row.push(item[1][protocol.name] ?? '')
		}
		rows.push(row)
	}

	download(
		`${slug(chain)}-${adapterType}-${new Date().toISOString().split('T')[0]}.csv`,
		rows.map((r) => r.join(',')).join('\n')
	)

	return null
}

const INTERVALS_LIST_ADAPTER_BY_CHAIN = ['Daily', 'Weekly', 'Monthly', 'Cumulative'] as const

export const AdapterByChainChart = ({
	chartData,
	adapterType,
	dataType,
	chain,
	chartName
}: Pick<IAdapterByChainPageData, 'chartData' | 'adapterType' | 'dataType' | 'chain'> & { chartName: string }) => {
	const [chartInterval, setChartInterval] = React.useState<(typeof INTERVALS_LIST_ADAPTER_BY_CHAIN)[number]>('Daily')

	const { charts } = React.useMemo(() => {
		if (chartInterval !== 'Daily') {
			const data = {}

			let cumulative = 0
			for (const [date, value] of chartData) {
				const finalDate =
					chartInterval === 'Weekly'
						? Number(lastDayOfWeek(date)) * 1e3
						: chartInterval === 'Monthly'
							? Number(firstDayOfMonth(date)) * 1e3
							: date
				data[finalDate] = data[finalDate] || 0
				data[finalDate] += value

				if (chartInterval === 'Cumulative') {
					data[finalDate] += cumulative
					cumulative += value
				}
			}

			const finalData = []

			for (const date in data) {
				finalData.push([+date, data[date]])
			}

			return {
				charts: {
					[chartName]: {
						data: finalData,
						type: (chartInterval === 'Cumulative' ? 'line' : 'bar') as 'bar' | 'line',
						name: chartName,
						stack: chartName,
						color: oldBlue
					}
				}
			}
		}

		return {
			charts: {
				[chartName]: {
					data: chartData,
					type: 'bar' as const,
					name: chartName,
					stack: chartName,
					color: oldBlue
				}
			}
		}
	}, [chartData, chartInterval, chartName])

	const { mutate: downloadBreakdownChartMutation, isPending: isDownloadingBreakdownChart } = useMutation({
		mutationFn: downloadBreakdownChart
	})

	return (
		<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-2">
				<div className="flex w-fit flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-(--text-form)">
					{INTERVALS_LIST_ADAPTER_BY_CHAIN.map((dataInterval) => (
						<Tooltip
							content={dataInterval}
							render={<button />}
							className="shrink-0 px-2 py-1 text-sm font-medium whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:text-(--link-text)"
							onClick={() => setChartInterval(dataInterval)}
							data-active={dataInterval === chartInterval}
							key={`${dataInterval}-${chartName}-${chain}`}
						>
							{dataInterval.slice(0, 1).toUpperCase()}
						</Tooltip>
					))}
				</div>
				<CSVDownloadButton
					onClick={() => {
						downloadBreakdownChartMutation({
							adapterType,
							chain,
							dataType
						})
					}}
					isLoading={isDownloadingBreakdownChart}
					smol
					className="h-[30px] border border-(--form-control-border) bg-transparent! text-(--text-form)! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
				/>
			</div>
			<React.Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
				<LineAndBarChart charts={charts} groupBy={chartInterval.toLowerCase() as 'daily' | 'weekly' | 'monthly'} />
			</React.Suspense>
		</div>
	)
}

export const ChainsByAdapterChart = ({
	chartData,
	allChains,
	type
}: Pick<IChainsByAdapterPageData, 'chartData' | 'allChains'> & { type: string }) => {
	const [chartType, setChartType] = React.useState<(typeof CHART_TYPES)[number]>('Volume')
	const [chartInterval, setChartInterval] = React.useState<(typeof INTERVALS_LIST)[number]>('Daily')

	const [selectedChains, setSelectedChains] = React.useState<string[]>(allChains)

	const { charts, chartOptions } = React.useMemo(() => {
		return getChartDataByChainAndInterval({ chartData, chartInterval, chartType, selectedChains })
	}, [chartData, chartInterval, selectedChains, chartType])

	return (
		<div className="col-span-2 flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
			<>
				<div className="flex flex-row flex-wrap items-center justify-end gap-2 p-2">
					<div className="mr-auto flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
						{INTERVALS_LIST.map((dataInterval) => (
							<a
								key={`${dataInterval}-${type}`}
								onClick={() => setChartInterval(dataInterval)}
								data-active={dataInterval === chartInterval}
								className="shrink-0 cursor-pointer px-3 py-[6px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
							>
								{dataInterval}
							</a>
						))}
					</div>
					<div className="flex flex-nowrap items-center overflow-x-auto rounded-md border border-(--form-control-border) text-xs font-medium text-(--text-form)">
						{CHART_TYPES.map((dataType) => (
							<button
								className="shrink-0 px-3 py-[6px] whitespace-nowrap hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) data-[active=true]:bg-(--old-blue) data-[active=true]:text-white"
								data-active={dataType === chartType}
								key={`${dataType}-${type}`}
								onClick={() => setChartType(dataType)}
							>
								{dataType}
							</button>
						))}
					</div>
					<SelectWithCombobox
						allValues={allChains}
						selectedValues={selectedChains}
						setSelectedValues={setSelectedChains}
						selectOnlyOne={(newChain) => {
							setSelectedChains([newChain])
						}}
						label="Chains"
						clearAll={() => setSelectedChains([])}
						toggleAll={() => setSelectedChains(allChains)}
						labelType="smol"
						triggerProps={{
							className:
								'flex items-center justify-between gap-2 px-2 py-[6px] text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
						}}
						portal
					/>
					<CSVDownloadButton
						onClick={() => {
							const rows: any = [['Timestamp', 'Date', ...allChains]]

							for (const date in chartData) {
								const row: any = [date, toNiceCsvDate(date)]
								for (const chain of allChains) {
									row.push(chartData[date][chain] ?? '')
								}
								rows.push(row)
							}

							download(
								`${type}-chains-${new Date().toISOString().split('T')[0]}.csv`,
								rows.map((r) => r.join(',')).join('\n')
							)
						}}
						smol
						className="h-[30px] border border-(--form-control-border) bg-transparent! text-(--text-form)! hover:bg-(--link-hover-bg)! focus-visible:bg-(--link-hover-bg)!"
					/>
				</div>
			</>

			{chartType === 'Dominance' ? (
				<React.Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
					<LineAndBarChart charts={charts} valueSymbol="%" expandTo100Percent chartOptions={chartOptions} />
				</React.Suspense>
			) : (
				<React.Suspense fallback={<div className="m-auto flex min-h-[360px] items-center justify-center" />}>
					<LineAndBarChart
						charts={charts}
						chartOptions={chartOptions}
						groupBy={chartInterval.toLowerCase() as 'daily' | 'weekly' | 'monthly'}
					/>
				</React.Suspense>
			)}
		</div>
	)
}

const getChartDataByChainAndInterval = ({
	chartData,
	chartInterval,
	chartType,
	selectedChains
}: {
	chartData: Record<string, Record<string, number>>
	chartInterval: 'Daily' | 'Weekly' | 'Monthly'
	chartType?: 'Volume' | 'Dominance'
	selectedChains: string[]
}) => {
	if (chartType === 'Dominance') {
		const sumByDate = {}
		for (const date in chartData) {
			const finalDate = +date * 1e3

			for (const chain in chartData[date]) {
				if (selectedChains.includes(chain)) {
					sumByDate[finalDate] = (sumByDate[finalDate] || 0) + (chartData[date][chain] || 0)
				}
			}
		}

		const dataByChain = {}

		for (const date in chartData) {
			const finalDate = +date * 1e3

			for (const chain of selectedChains) {
				dataByChain[chain] = dataByChain[chain] || []
				dataByChain[chain].push([
					finalDate,
					sumByDate && chartData[date][chain] != null
						? (Number(chartData[date][chain] || 0) / sumByDate[finalDate]) * 100
						: null
				])
			}
		}

		const allColors = getNDistinctColors(selectedChains.length + 1, oldBlue)
		const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
		stackColors['Bitcoin'] = oldBlue
		stackColors['Others'] = allColors[allColors.length - 1]

		const charts = {}

		for (const chain in dataByChain) {
			charts[chain] = {
				data: dataByChain[chain],
				type: 'line',
				name: chain,
				stack: chain,
				color: stackColors[chain]
			}
		}

		return {
			charts,
			chartOptions: {}
		}
	}

	// if (chartInterval === 'Cumulative') {
	// 	const cumulativeByChain = {}
	// 	const dataByChain = {}

	// 	for (const date in chartData) {
	// 		const finalDate = +date * 1e3

	// 		for (const chain in chartData[date]) {
	// 			if (selectedChains.includes(chain)) {
	// 				cumulativeByChain[chain] = (cumulativeByChain[chain] || 0) + (chartData[date][chain] || 0)
	// 				dataByChain[chain] = dataByChain[chain] || []
	// 				dataByChain[chain].push([finalDate, cumulativeByChain[chain]])
	// 			}
	// 		}
	// 	}

	// 	const allColors = getNDistinctColors(selectedChains.length + 1, oldBlue)
	// 	const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
	// 	stackColors[selectedChains[0]] = oldBlue
	// 	stackColors['Others'] = allColors[allColors.length - 1]

	// 	return {
	// 		chartData: dataByChain,
	// 		stackColors,
	// 		chartOptions: {}
	// 	}
	// }

	const topByAllDates = {}

	const uniqTopChains = new Set<string>()
	for (const date in chartData) {
		const finalDate =
			chartInterval === 'Weekly'
				? lastDayOfWeek(+date * 1e3) * 1e3
				: chartInterval === 'Monthly'
					? firstDayOfMonth(+date * 1e3) * 1e3
					: +date * 1e3

		const topByDate = {}
		let others = 0
		const topItems = []
		for (const chain in chartData[date]) {
			if (selectedChains.includes(chain)) {
				topItems.push([chain, chartData[date][chain]])
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
			topByAllDates[chain][finalDate] = (topByAllDates[chain][finalDate] || 0) + (topByDate[chain]?.[finalDate] ?? 0)
		}

		topByAllDates['Others'] = topByAllDates['Others'] || {}
		topByAllDates['Others'][finalDate] = (topByAllDates['Others'][finalDate] || 0) + others
	}

	const finalData = {}
	const zeroesByChain = {}
	for (const chain of [...uniqTopChains, 'Others']) {
		finalData[chain] = finalData[chain] || []
		for (const finalDate in topByAllDates[chain]) {
			finalData[chain].push([+finalDate, topByAllDates[chain][finalDate]])
		}
		if (selectedChains.includes(chain)) {
			zeroesByChain[chain] = Math.max(
				finalData[chain].findIndex((date) => date[1] !== 0),
				0
			)
		}
	}

	let startingZeroDatesToSlice = Object.values(zeroesByChain).sort((a, b) => (a as number) - (b as number))[0]
	for (const chain in finalData) {
		if (!finalData[chain].length) delete finalData[chain]
	}
	for (const chain in finalData) {
		finalData[chain] = finalData[chain].slice(startingZeroDatesToSlice)
	}

	const allColors = getNDistinctColors(selectedChains.length + 1, oldBlue)
	const stackColors = Object.fromEntries(selectedChains.map((_, i) => [_, allColors[i]]))
	stackColors[selectedChains[0]] = oldBlue
	stackColors['Others'] = allColors[allColors.length - 1]

	const charts = {}

	for (const chain in finalData) {
		charts[chain] = {
			data: finalData[chain],
			type: 'bar',
			name: chain,
			stack: 'chain',
			color: stackColors[chain]
		}
	}

	const chartOptions = {
		tooltip: {
			trigger: 'axis',
			confine: true,
			formatter: function (params) {
				let chartdate = formatTooltipChartDate(params[0].value[0], chartInterval.toLowerCase() as any)
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
		charts,
		chartOptions
	}
}
