import Link from 'next/link'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useGeckoId, useGetProtocolEmissions, usePriceChart } from '~/api/categories/protocols/client'
import { CSVDownloadButton } from '~/components/ButtonStyled/CsvButton'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LazyChart } from '~/components/LazyChart'
import { LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { UpcomingEvent } from '~/containers/ProtocolOverview/Emissions/UpcomingEvent'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { capitalizeFirstLetter, firstDayOfMonth, formattedNum, lastDayOfWeek, slug, tokenIconUrl } from '~/utils'
import Pagination from './Pagination'
import { IEmission } from './types'

const getExtendedColors = (baseColors: Record<string, string>, isPriceEnabled: boolean) => {
	const extended = { ...baseColors }
	if (isPriceEnabled) {
		extended['Market Cap'] = '#0c5dff'
		extended['Price'] = '#ff4e21'
	}
	return extended
}

const AreaChart = lazy(() => import('~/components/ECharts/UnlocksChart')) as React.FC<IChartProps>

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

export function Emissions({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) {
	return (
		<div className="col-span-full flex flex-col gap-2 xl:col-span-1">
			{!isEmissionsPage && <h3>Emissions</h3>}
			<ChartContainer data={data} isEmissionsPage={isEmissionsPage} />
		</div>
	)
}

const standardGroupColors = {
	noncirculating: '#546fc6',
	insiders: '#90cc74',
	publicSale: '#fac759',
	privateSale: '#fd8353',
	farming: '#ed6666',
	airdrop: '#73c0de',
	liquidity: '#39a371'
}

function processGroupedChartData(
	chartData: Array<{ date: string } & { [label: string]: number }>,
	categoriesBreakdown: Record<string, string[]>
) {
	return chartData.map((entry) => {
		const groupedEntry: { date: string } & Record<string, number | string> = {
			date: entry.date,
			...(entry['Price'] && { Price: entry['Price'] }),
			...(entry['Market Cap'] && { 'Market Cap': entry['Market Cap'] })
		}

		for (const group in categoriesBreakdown) {
			const categories = categoriesBreakdown[group]
			groupedEntry[group] = categories.reduce((sum, category) => {
				let actualKey: string | undefined
				const lowerCategory = category.toLowerCase()
				for (const key in entry) {
					if (key.toLowerCase() === lowerCategory) {
						actualKey = key
						break
					}
				}
				const value = actualKey ? Number(entry[actualKey]) || 0 : 0
				return sum + value
			}, 0)
		}

		return groupedEntry
	})
}

const DATA_TYPES = ['documented', 'realtime'] as const
type DataType = (typeof DATA_TYPES)[number]

const TIME_GROUPINGS = ['D', 'W', 'M', 'Q', 'Y'] as const
type TimeGrouping = (typeof TIME_GROUPINGS)[number]

function getQuarterStart(timestamp: number): number {
	const date = new Date(timestamp)
	const quarter = Math.floor(date.getMonth() / 3)
	return new Date(date.getFullYear(), quarter * 3, 1).getTime() / 1000
}

function getYearStart(timestamp: number): number {
	const date = new Date(timestamp)
	return new Date(date.getFullYear(), 0, 1).getTime() / 1000
}

function groupChartDataByTime(
	chartData: Array<{ date: string } & Record<string, number | string>>,
	groupBy: TimeGrouping
): Array<{ date: string } & Record<string, number | string>> {
	if (groupBy === 'D') return chartData

	const grouped: Record<string, Record<string, number>> = {}

	for (const entry of chartData) {
		const timestamp = +entry.date * 1000
		let groupKey: number

		switch (groupBy) {
			case 'W':
				groupKey = lastDayOfWeek(timestamp)
				break
			case 'M':
				groupKey = firstDayOfMonth(timestamp)
				break
			case 'Q':
				groupKey = getQuarterStart(timestamp)
				break
			case 'Y':
				groupKey = getYearStart(timestamp)
				break
			default:
				groupKey = +entry.date
		}

		if (!grouped[groupKey]) {
			grouped[groupKey] = {}
		}

		for (const key in entry) {
			if (key === 'date') continue
			const value = Number(entry[key]) || 0
			grouped[groupKey][key] = value
		}
	}

	return Object.entries(grouped)
		.map(([date, values]) => ({ date, ...values }))
		.sort((a, b) => +a.date - +b.date)
}

function sortStacksByVolatility(
	stacks: string[],
	chartData: Array<{ date: string } & Record<string, number | string>>
): string[] {
	if (!chartData || chartData.length < 2) return stacks

	const volatility: Record<string, number> = {}

	for (const stack of stacks) {
		const values = chartData.map((d) => Number(d[stack]) || 0)
		const min = Math.min(...values)
		const max = Math.max(...values)
		volatility[stack] = max - min
	}

	return [...stacks].sort((a, b) => volatility[b] - volatility[a])
}

const unlockedPieChartRadius = ['50%', '70%'] as [string, string]

const unlockedPieChartStackColors = {
	Unlocked: '#0c5dff',
	Locked: '#ff4e21'
}

const EMPTY_STRING_LIST: string[] = []
const EMPTY_STACK_COLORS: Record<string, string> = {}
const EMPTY_ALLOCATION: Record<string, number> = {}
const EMPTY_TOKEN_ALLOCATION = { current: EMPTY_ALLOCATION, final: EMPTY_ALLOCATION }
const EMPTY_CHART_DATA: any[] = []

const chunkArray = <T,>(items: T[], size = 1): T[][] => {
	if (!Number.isFinite(size) || size < 1) return []
	const result: T[][] = []
	for (let i = 0; i < items.length; i += size) {
		result.push(items.slice(i, i + size))
	}
	return result
}

const groupByKey = <T, K extends PropertyKey>(items: T[], getKey: (item: T) => K): Record<K, T[]> => {
	const grouped = {} as Record<K, T[]>
	for (const item of items) {
		const key = getKey(item)
		const existing = grouped[key]
		if (existing) {
			existing.push(item)
		} else {
			grouped[key] = [item]
		}
	}
	return grouped
}

const areArraysEqual = (left: string[], right: string[]) =>
	left.length === right.length && left.every((value, index) => value === right[index])

const sumValuesExcludingKey = (data: Record<string, unknown>, keyToSkip: string) => {
	let total = 0
	for (const [key, value] of Object.entries(data)) {
		if (key === keyToSkip) continue
		const numericValue = typeof value === 'number' ? value : Number(value)
		if (!Number.isNaN(numericValue)) {
			total += numericValue
		}
	}
	return total
}

const ChartContainer = ({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) => {
	const width = useBreakpointWidth()
	const [dataType, setDataType] = useState<DataType>('documented')
	const [isPriceEnabled, setIsPriceEnabled] = useState(false)
	const [allocationMode, setAllocationMode] = useState<'current' | 'standard'>('current')
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])
	const [chartType, setChartType] = useState<'bar' | 'line'>('line')
	const [timeGrouping, setTimeGrouping] = useState<TimeGrouping>('D')

	const categoriesFromData = data.categories?.[dataType] ?? EMPTY_STRING_LIST
	const stackColors = data.stackColors?.[dataType] ?? EMPTY_STACK_COLORS
	const { tokenAllocation, tokenAllocationCurrentChunks, tokenAllocationFinalChunks } = useMemo(() => {
		const allocation = data.tokenAllocation?.[dataType] ?? EMPTY_TOKEN_ALLOCATION
		return {
			tokenAllocation: allocation,
			tokenAllocationCurrentChunks: chunkArray(Object.entries(allocation.current ?? EMPTY_ALLOCATION)),
			tokenAllocationFinalChunks: chunkArray(Object.entries(allocation.final ?? EMPTY_ALLOCATION))
		}
	}, [data.tokenAllocation, dataType])
	const rawChartData = data.chartData?.[dataType] ?? EMPTY_CHART_DATA
	const pieChartData = data.pieChartData?.[dataType] ?? EMPTY_CHART_DATA
	const hallmarks = data.hallmarks?.[dataType] ?? EMPTY_CHART_DATA

	useEffect(() => {
		if (categoriesFromData.length > 0) {
			setSelectedCategories((current) => {
				const newCategories = categoriesFromData.filter((cat) => !['Market Cap', 'Price'].includes(cat))
				if (current.length !== newCategories.length) return newCategories
				return areArraysEqual([...current].sort(), [...newCategories].sort()) ? current : newCategories
			})
		}
	}, [categoriesFromData])
	const { data: geckoId } = useGeckoId(data.token ?? null)

	const priceChart = usePriceChart(data.geckoId ?? geckoId)
	const tokenMaxSupply = priceChart.data?.data.coinData.market_data?.max_supply_infinite
		? Infinity
		: (priceChart.data?.data.coinData.market_data?.max_supply ?? undefined)
	const tokenCircSupply = priceChart.data?.data.coinData.market_data?.circulating_supply ?? undefined
	const tokenPrice = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 1]?.[1]
	const tokenMcap = priceChart.data?.data.mcaps?.[priceChart.data?.data.mcaps?.length - 1]?.[1]
	const tokenVolume = priceChart.data?.data.volumes?.[priceChart.data?.data.volumes?.length - 1]?.[1]
	const ystdPrice = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 2]?.[1]
	const percentChange = tokenPrice && ystdPrice ? +(((tokenPrice - ystdPrice) / ystdPrice) * 100).toFixed(2) : null
	const normilizePriceChart = useMemo(() => {
		const sourceData = priceChart.data?.data || {}
		const result: Record<string, Record<number, number>> = {}
		for (const name in sourceData) {
			const chart = sourceData[name] as Array<[number, number]>
			if (Array.isArray(chart)) {
				const innerResult: Record<number, number> = {}
				for (const [date, price] of chart) {
					innerResult[Math.floor(date / 1e3)] = price
				}
				result[name] = innerResult
			}
		}
		return result
	}, [priceChart.data?.data])

	const groupedEvents = groupByKey(data.events ?? [], (event) => event.timestamp)

	const sortedEvents = useMemo(() => {
		const now = Date.now() / 1e3
		const entries = Object.entries(groupedEvents)

		const upcomingEvents = entries.filter(([ts]) => +ts > now).sort(([a], [b]) => +a - +b) // near to far

		const pastEvents =
			upcomingEvents.length > 0
				? entries.filter(([ts]) => +ts <= now).sort(([a], [b]) => +a - +b) // oldest to newest
				: entries.filter(([ts]) => +ts <= now).sort(([a], [b]) => +b - +a) // newest to oldest

		return upcomingEvents.length > 0 ? [...pastEvents, ...upcomingEvents] : pastEvents
	}, [groupedEvents])

	const upcomingEventIndex = useMemo(() => {
		const index = sortedEvents.findIndex((events) => {
			const event = events[1][0]
			const { timestamp } = event
			return +timestamp > Date.now() / 1e3
		})
		return index === -1 ? 0 : index
	}, [sortedEvents])

	const paginationItems = useMemo(
		() =>
			sortedEvents.map(([ts, events]: any) => (
				<UpcomingEvent
					key={ts}
					{...{
						event: events,
						noOfTokens: events.map((x: any) => x.noOfTokens),
						timestamp: ts,
						price: tokenPrice,
						symbol: data.tokenPrice?.symbol,
						mcap: tokenMcap,
						maxSupply: data.meta?.maxSupply,
						name: data.name,
						tooltipStyles: { position: 'relative', top: 0 },
						isProtocolPage: true
					}}
				/>
			)),
		[sortedEvents, tokenPrice, tokenMcap, data.meta?.maxSupply, data.name, data.tokenPrice?.symbol]
	)

	const chartData = useMemo(() => {
		return rawChartData
			?.map((chartItem) => {
				const date = chartItem.date
				const res = { ...chartItem }

				const mcap = normilizePriceChart?.mcaps?.[date]
				const price = normilizePriceChart?.prices?.[date]

				if (mcap && isPriceEnabled) {
					res['Market Cap'] = mcap
				}

				if (price && isPriceEnabled) {
					res['Price'] = price
				}

				return res
			})
			?.filter((chartItem) => sumValuesExcludingKey(chartItem, 'date') > 0)
	}, [rawChartData, normilizePriceChart, isPriceEnabled])

	const availableCategories =
		allocationMode === 'standard'
			? Object.keys(data.categoriesBreakdown || {})
			: categoriesFromData.filter((cat) => !['Market Cap', 'Price'].includes(cat))

	const displayData = useMemo(() => {
		let result = chartData
		if (allocationMode === 'standard' && data.categoriesBreakdown) {
			result = processGroupedChartData(chartData || ([] as any), data.categoriesBreakdown)
		}
		return groupChartDataByTime(result || [], timeGrouping)
	}, [allocationMode, chartData, data.categoriesBreakdown, timeGrouping])

	useEffect(() => {
		setSelectedCategories(() => {
			if (allocationMode === 'standard' && data.categoriesBreakdown) {
				return Object.keys(data.categoriesBreakdown)
			} else if (categoriesFromData.length > 0) {
				return categoriesFromData.filter((cat) => !['Market Cap', 'Price'].includes(cat))
			}
			return []
		})
	}, [allocationMode, data.categoriesBreakdown, categoriesFromData])

	const groupAllocation = useMemo(() => {
		const finalAllocation = tokenAllocation?.final
		if (!finalAllocation) {
			return []
		}
		let hasFinalAllocation = false
		for (const _ in finalAllocation) {
			hasFinalAllocation = true
			break
		}
		if (!hasFinalAllocation) {
			return []
		}
		const result: { name: string; value: number }[] = []
		for (const name in finalAllocation) {
			const value = Number(finalAllocation[name])
			if (value > 0) {
				result.push({ name, value })
			}
		}
		return result
	}, [tokenAllocation])

	const pieChartDataAllocation = useMemo(
		() =>
			pieChartData
				.map((pieChartItem) => {
					if (!selectedCategories.includes(pieChartItem.name)) {
						return null
					}
					return pieChartItem
				})
				.filter(Boolean),
		[pieChartData, selectedCategories]
	)

	const pieChartDataAllocationMode = allocationMode === 'current' ? pieChartDataAllocation : groupAllocation

	const chartConfig = useMemo(() => {
		let stacks = selectedCategories
		if ((!stacks || stacks.length === 0) && displayData && displayData.length > 0) {
			const first = displayData[0]
			stacks = []
			for (const k in first) {
				if (k !== 'date' && k !== 'Price' && k !== 'Market Cap') {
					stacks.push(k)
				}
			}
		}
		const finalStacks = chartType === 'bar' ? sortStacksByVolatility(stacks, displayData) : stacks
		const extendedColors = getExtendedColors(stackColors, isPriceEnabled)
		return {
			stacks: [...finalStacks, ...(isPriceEnabled ? ['Market Cap', 'Price'] : [])].filter(Boolean),
			customYAxis: isPriceEnabled ? ['Market Cap', 'Price'] : [],
			colors:
				allocationMode === 'standard'
					? { ...standardGroupColors, Price: '#ff4e21', 'Market Cap': '#0c5dff' }
					: extendedColors
		}
	}, [isPriceEnabled, selectedCategories, stackColors, allocationMode, displayData, chartType])

	const unlockedPercent =
		data.meta?.totalLocked != null && data.meta?.maxSupply != null
			? 100 - (data.meta.totalLocked / data.meta.maxSupply) * 100
			: 0

	const unlockedPieChartData = [
		{ name: 'Unlocked', value: unlockedPercent },
		{ name: 'Locked', value: 100 - unlockedPercent }
	]

	const pieChartLegendPosition =
		width < 640
			? { left: 'center', top: 'bottom', orient: 'horizontal' as const }
			: { left: 'right', top: 'center', orient: 'vertical' as const }

	const pieChartLegendTextStyle = {
		fontSize: width < 640 ? 12 : 20
	}

	const hasGroupAllocationData = (() => {
		if (!data.categoriesBreakdown || typeof data.categoriesBreakdown !== 'object') return false
		for (const _ in data.categoriesBreakdown) {
			return true
		}
		return false
	})()

	const prepareCsv = useMemo(() => {
		return () => {
			if (!displayData || displayData.length === 0) {
				return { filename: `${data.name}-unlock-schedule.csv`, rows: [['Date']] }
			}

			const firstRow = displayData[0]
			const columns: string[] = []
			for (const key in firstRow) {
				if (key !== 'date') columns.push(key)
			}
			const headers = ['Date', ...columns]

			const rows: string[][] = [headers]
			for (const item of displayData) {
				const dateTimestamp = typeof item.date === 'string' ? parseInt(item.date, 10) : item.date
				const date = new Date(dateTimestamp * 1000).toISOString().split('T')[0]
				const row: string[] = [date, ...columns.map((col) => String(item[col] || 0))]
				rows.push(row)
			}

			const filename = `${slug(data.name)}-unlock-schedule-${new Date().toISOString().split('T')[0]}.csv`
			return { filename, rows }
		}
	}, [displayData, data.name])

	if (!data) return null

	return (
		<>
			<div className="flex w-full flex-col items-center gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3 sm:flex-row sm:justify-between">
				{isEmissionsPage ? (
					<h1 className="flex items-center gap-2 text-xl font-semibold">
						<TokenLogo logo={tokenIconUrl(data.name)} />
						<span>{data.name}</span>
					</h1>
				) : null}
				<div className="flex w-full flex-wrap justify-center gap-2 sm:w-auto sm:justify-end">
					{hasGroupAllocationData && (
						<Switch
							label="Group Allocation"
							value="group-allocation"
							onChange={() => setAllocationMode((prev) => (prev === 'current' ? 'standard' : 'current'))}
							help="Group token allocations into standardized categories."
							checked={allocationMode === 'standard'}
						/>
					)}

					<Switch
						label="Bar Chart"
						value="bar-chart"
						onChange={() => setChartType((prev) => (prev === 'bar' ? 'line' : 'bar'))}
						checked={chartType === 'bar'}
					/>

					{normilizePriceChart?.prices ? (
						<Switch
							label="Show Price and Market Cap"
							value="show=price-and-mcap"
							onChange={() => setIsPriceEnabled((prev) => !prev)}
							checked={isPriceEnabled}
						/>
					) : null}
				</div>
			</div>

			{data?.tokenPrice?.price || data?.meta?.circSupply || data?.meta?.maxSupply || tokenMcap || tokenVolume ? (
				<div className="flex w-full flex-col items-center gap-4 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<h1 className="text-center text-xl font-semibold">Token Overview</h1>
					<div className="grid w-full grid-cols-1 place-content-center gap-4 text-center md:grid-cols-2 lg:grid-cols-3">
						{data?.tokenPrice?.price ? (
							<div className="flex flex-col items-center">
								<span className="text-(--text-label)">Price</span>
								<div className="flex items-center gap-2">
									<span className="text-lg font-medium">${formattedNum(data.tokenPrice.price)}</span>
									{percentChange !== null && (
										<span
											className="text-sm"
											style={{
												color: percentChange > 0 ? 'rgba(18, 182, 0, 0.7)' : 'rgba(211, 0, 0, 0.7)'
											}}
										>
											{percentChange > 0 && '+'}
											{percentChange}%
										</span>
									)}
								</div>
							</div>
						) : null}

						{tokenCircSupply ? (
							<div className="flex flex-col items-center">
								<span className="text-(--text-label)">Circulating Supply</span>
								<span className="text-lg font-medium">
									{formattedNum(tokenCircSupply)} {data.tokenPrice.symbol}
								</span>
							</div>
						) : null}

						{tokenMaxSupply ? (
							<div className="flex flex-col items-center">
								<span className="text-(--text-label)">Max Supply</span>
								<span className="text-lg font-medium">
									{tokenMaxSupply != Infinity ? formattedNum(tokenMaxSupply) : '∞'} {data.tokenPrice.symbol}
								</span>
							</div>
						) : null}

						{tokenMcap ? (
							<div className="flex flex-col items-center">
								<span className="text-(--text-label)">Market Cap</span>
								<span className="text-lg font-medium">${formattedNum(tokenMcap)}</span>
							</div>
						) : null}

						{tokenVolume ? (
							<div className="flex flex-col items-center">
								<span className="text-(--text-label)">Volume (24h)</span>
								<span className="text-lg font-medium">${formattedNum(tokenVolume)}</span>
							</div>
						) : null}
					</div>
				</div>
			) : null}

			{data.chartData?.realtime?.length > 0 ? (
				<TagGroup
					selectedValue={dataType}
					setValue={(period) => setDataType(period as DataType)}
					values={DATA_TYPES}
					className="ml-auto"
				/>
			) : null}

			<div className="flex flex-col gap-2">
				{categoriesFromData.length > 0 && rawChartData.length > 0 && (
					<LazyChart className="relative min-h-[408px] rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<div className="m-2 flex items-center justify-end gap-2">
							<h1 className="mr-auto text-lg font-bold">Schedule</h1>
							<TagGroup
								selectedValue={timeGrouping}
								setValue={(v) => setTimeGrouping(v as TimeGrouping)}
								values={TIME_GROUPINGS}
							/>
							<CSVDownloadButton prepareCsv={prepareCsv} smol />
							<SelectWithCombobox
								allValues={availableCategories}
								selectedValues={selectedCategories}
								setSelectedValues={setSelectedCategories}
								label="Categories"
								labelType="smol"
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium'
								}}
							/>
						</div>
						<Suspense fallback={<></>}>
							<AreaChart
								customYAxis={chartConfig.customYAxis}
								stacks={chartConfig.stacks}
								chartData={displayData}
								hallmarks={hallmarks}
								stackColors={chartConfig.colors}
								isStackedChart
								chartType={chartType}
								expandTo100Percent={chartType === 'bar'}
							/>
						</Suspense>
					</LazyChart>
				)}

				<div className="grid min-h-[398px] grid-cols-2 gap-2">
					{data.pieChartData?.[dataType] && data.stackColors[dataType] && (
						<LazyChart className="relative col-span-full flex min-h-[398px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<Suspense fallback={<></>}>
								<PieChart
									showLegend
									title="Allocation"
									chartData={pieChartDataAllocationMode}
									stackColors={chartConfig.colors}
									valueSymbol={data.tokenPrice?.symbol ?? ''}
									legendPosition={pieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
									toRight={200}
								/>
							</Suspense>
						</LazyChart>
					)}

					{unlockedPercent > 0 && (
						<LazyChart className="relative col-span-full flex min-h-[398px] flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) pt-2 xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<Suspense fallback={<></>}>
								<PieChart
									showLegend
									title={`Unlocked ${unlockedPercent.toFixed(2)}%`}
									legendPosition={pieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
									radius={unlockedPieChartRadius}
									chartData={unlockedPieChartData}
									stackColors={unlockedPieChartStackColors}
									valueSymbol="%"
								/>
							</Suspense>
						</LazyChart>
					)}
				</div>
			</div>

			<div>
				{data.token && tokenAllocationCurrentChunks.length > 0 && tokenAllocationFinalChunks.length > 0 ? (
					<div className="flex h-full w-full flex-col items-center justify-start rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h1 className="text-center text-xl font-semibold">Token Allocation</h1>
						<div className="flex w-full flex-col gap-2 text-base">
							<h4 className="text-base text-(--text-form)">Current</h4>

							<div className="flex flex-wrap justify-between">
								{tokenAllocationCurrentChunks.map((currentChunk) =>
									currentChunk.map(([cat, perc]) => (
										<p className="text-base" key={cat}>{`${capitalizeFirstLetter(cat)} - ${perc}%`}</p>
									))
								)}
							</div>
							<hr className="border-(--form-control-border)" />

							<h4 className="text-base text-(--text-form)">Final</h4>

							<div className="flex flex-wrap justify-between">
								{tokenAllocationFinalChunks.map((currentChunk) =>
									currentChunk.map(([cat, perc]) => (
										<p className="text-base" key={cat}>{`${capitalizeFirstLetter(cat)} - ${perc}%`}</p>
									))
								)}
							</div>
						</div>
					</div>
				) : null}
			</div>

			{data.events?.length > 0 ? (
				<div className="flex w-full flex-col items-center justify-start rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<h1 className="text-center text-xl font-semibold">Unlock Events</h1>

					<Pagination startIndex={upcomingEventIndex} items={paginationItems} />
				</div>
			) : null}

			<div className="flex flex-wrap gap-2 *:flex-1">
				{data.sources?.length > 0 ? (
					<div className="flex h-full w-full flex-col items-center justify-start rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h1 className="text-center text-xl font-medium">Sources</h1>
						<ul className="mt-4 w-full list-disc space-y-2 pl-4 text-base">
							{data.sources.map((source, i) => (
								<li key={source}>
									<Link
										href={source}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-2 text-base font-medium"
									>
										<span>
											{i + 1} {new URL(source).hostname}
										</span>
										<Icon name="external-link" height={16} width={16} />
									</Link>
								</li>
							))}
						</ul>
					</div>
				) : null}
				{data.notes?.length > 0 ? (
					<div className="flex h-full w-full flex-col items-center justify-start rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h1 className="text-center text-xl font-medium">Notes</h1>
						<ul className="mt-4 w-full list-disc space-y-2 pl-4 text-base">
							{data.notes.map((note) => (
								<li key={note}>{note}</li>
							))}
						</ul>
					</div>
				) : null}
				{data.futures?.openInterest || data.futures?.fundingRate ? (
					<div className="flex h-full w-full flex-col items-center justify-start rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h1 className="text-center text-xl font-medium">Futures</h1>
						<div className="flex w-full flex-col gap-2 text-base">
							{data.futures.openInterest ? <p>{`Open Interest: $${formattedNum(data.futures.openInterest)}`}</p> : null}

							<>{data.futures.fundingRate ? <p>{`Funding Rate: ${data.futures.fundingRate}%`}</p> : null}</>
						</div>
					</div>
				) : null}
			</div>
		</>
	)
}

export const UnlocksCharts = ({ protocolName }: { protocolName: string }) => {
	const { data = null, isLoading, error } = useGetProtocolEmissions(slug(protocolName))

	if (isLoading) {
		return (
			<div className="flex min-h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<LocalLoader />
			</div>
		)
	}

	if (!data) {
		return (
			<div className="flex min-h-[408px] items-center justify-center rounded-md border border-(--cards-border) bg-(--cards-bg)">
				<p>{error instanceof Error ? error.message : 'Failed to fetch'}</p>
			</div>
		)
	}

	return <ChartContainer data={data as any} />
}
