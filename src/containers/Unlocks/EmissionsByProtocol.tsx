import Link from 'next/link'
import { useRouter } from 'next/router'
import { lazy, memo, Suspense, useEffect, useMemo, useState } from 'react'
import { useGeckoId, usePriceChart } from '~/api/client'
import { ChartExportButtons } from '~/components/ButtonStyled/ChartExportButtons'
import type { IMultiSeriesChart2Props, IPieChartProps, MultiSeriesChart2Dataset } from '~/components/ECharts/types'
import { Icon } from '~/components/Icon'
import { LoadingDots, LocalLoader } from '~/components/Loaders'
import { SelectWithCombobox } from '~/components/Select/SelectWithCombobox'
import { Switch } from '~/components/Switch'
import { TagGroup } from '~/components/TagGroup'
import { TokenLogo } from '~/components/TokenLogo'
import { useGetProtocolEmissions } from '~/containers/Unlocks/queries.client'
import { useBreakpointWidth } from '~/hooks/useBreakpointWidth'
import { useGetChartInstance } from '~/hooks/useGetChartInstance'
import { capitalizeFirstLetter, firstDayOfMonth, formattedNum, lastDayOfWeek, slug, tokenIconUrl } from '~/utils'
import { readSingleQueryValue } from '~/utils/routerQuery'
import Pagination from './Pagination'
import { UpcomingEvent } from './UpcomingEvent'

export interface TokenData {
	circSupply: number
	events: Event[]
	gecko_id: string
	maxSupply: number
	mcap: number
	name: string
	protocolId: string
	sources: string[]
	token: string
	totalLocked: number
	unlocksPerDay: number
}

export type EmissionsDataset = { source: Array<Record<string, number | null>>; dimensions: string[] }
export type EmissionsChartConfig = Array<{
	type: 'line'
	name: string
	encode: { x: 'timestamp'; y: string }
	color: string | undefined
	stack: string
}>

export interface IEmission {
	categories: { documented: Array<string>; realtime: Array<string> }
	categoriesBreakdown: Record<string, string[]>
	chartData: {
		documented: Array<{ timestamp: number; [label: string]: number }>
		realtime: Array<{ timestamp: number; [label: string]: number }>
	}
	/** Pre-built MultiSeriesChart2 datasets keyed by data type. */
	datasets: { documented: EmissionsDataset; realtime: EmissionsDataset }
	/** Pre-built MultiSeriesChart2 chart configs keyed by data type. */
	chartsConfigs: { documented: EmissionsChartConfig; realtime: EmissionsChartConfig }
	sources: Array<string>
	notes: Array<string>
	events: Array<{ description: string; timestamp: string; noOfTokens: number[] }>
	hallmarks: { documented: Array<[number, string]>; realtime: Array<[number, string]> }
	tokenPrice: { price?: number | null; symbol?: string | null }
	tokenAllocation: {
		documented: { current: { [category: string]: number }; final: { [category: string]: number } }
		realtime: { current: { [category: string]: number }; final: { [category: string]: number } }
	}
	futures: { openInterest: number; fundingRate: number }
	pieChartData: {
		documented: Array<{
			name: string
			value: number
		}>
		realtime: Array<{
			name: string
			value: number
		}>
	}
	stackColors: { documented: { [stack: string]: string }; realtime: { [stack: string]: string } }
	token?: string
	geckoId?: string
	name: string
	meta: TokenData
}

const getExtendedColors = (baseColors: Record<string, string>, isPriceEnabled: boolean) => {
	const extended = { ...baseColors }
	if (isPriceEnabled) {
		extended['Market Cap'] = '#0c5dff'
		extended['Price'] = '#ff4e21'
	}
	return extended
}

const MultiSeriesChart2 = lazy(
	() => import('~/components/ECharts/MultiSeriesChart2')
) as React.FC<IMultiSeriesChart2Props>

const PieChart = lazy(() => import('~/components/ECharts/PieChart')) as React.FC<IPieChartProps>

type ScheduleChartProps = Pick<
	IMultiSeriesChart2Props,
	| 'dataset'
	| 'charts'
	| 'hallmarks'
	| 'expandTo100Percent'
	| 'solidChartAreaStyle'
	| 'valueSymbol'
	| 'onReady'
	| 'hideDefaultLegend'
>

const ScheduleChart = memo(function ScheduleChart(props: ScheduleChartProps) {
	return (
		<Suspense fallback={<div className="min-h-[360px]" />}>
			<MultiSeriesChart2 {...props} />
		</Suspense>
	)
})

type InitialTokenMarketData = {
	price?: number | null
	prevPrice?: number | null
	priceChangePercent?: number | null
	mcap?: number | null
	volume24h?: number | null
	circSupply?: number | null
	maxSupply?: number | null
	maxSupplyInfinite?: boolean | null
}

export function EmissionsByProtocol({
	data,
	isEmissionsPage,
	initialTokenMarketData,
	disableClientTokenStatsFetch
}: {
	data: IEmission
	isEmissionsPage?: boolean
	initialTokenMarketData?: InitialTokenMarketData | null
	disableClientTokenStatsFetch?: boolean
}) {
	return (
		<div className="col-span-full flex flex-col gap-2 xl:col-span-1">
			{!isEmissionsPage && <h3>Emissions</h3>}
			<ChartContainer
				data={data}
				isEmissionsPage={isEmissionsPage}
				initialTokenMarketData={initialTokenMarketData}
				disableClientTokenStatsFetch={disableClientTokenStatsFetch}
			/>
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
	chartData: Array<{ timestamp: number; [label: string]: number }>,
	categoriesBreakdown: Record<string, string[]>
) {
	return chartData.map((entry) => {
		const groupedEntry: { timestamp: number } & Record<string, number> = {
			timestamp: entry.timestamp,
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

function getQuarterStart(timestampMs: number): number {
	const date = new Date(timestampMs)
	const quarter = Math.floor(date.getUTCMonth() / 3)
	return Date.UTC(date.getUTCFullYear(), quarter * 3, 1)
}

function getYearStart(timestampMs: number): number {
	const date = new Date(timestampMs)
	return Date.UTC(date.getUTCFullYear(), 0, 1)
}

function groupChartDataByTime(
	chartData: Array<{ timestamp: number } & Record<string, number>>,
	groupBy: TimeGrouping
): Array<{ timestamp: number } & Record<string, number>> {
	if (groupBy === 'D') return chartData

	// Most series (unlock amounts, allocations) are additive within a time bucket, but
	// some series (e.g. Price/Market Cap) are not and should not be summed.
	const NON_ADDITIVE_STRATEGIES: Record<string, 'avg' | 'last'> = {
		Price: 'avg',
		'Market Cap': 'avg'
	}

	const grouped: Record<number, Record<string, number>> = {}
	const avgSums: Record<number, Record<string, number>> = {}
	const avgCounts: Record<number, Record<string, number>> = {}
	const lastValues: Record<number, Record<string, number>> = {}
	const lastTimestamps: Record<number, Record<string, number>> = {}

	for (const entry of chartData) {
		const ts = entry.timestamp
		let groupKey: number

		switch (groupBy) {
			case 'W':
				groupKey = lastDayOfWeek(ts / 1000) * 1e3
				break
			case 'M':
				groupKey = firstDayOfMonth(ts / 1000) * 1e3
				break
			case 'Q':
				groupKey = getQuarterStart(ts)
				break
			case 'Y':
				groupKey = getYearStart(ts)
				break
			default:
				groupKey = ts
		}

		if (!grouped[groupKey]) {
			grouped[groupKey] = {}
		}

		for (const key in entry) {
			if (key === 'timestamp') continue
			const value = entry[key]
			if (!Number.isFinite(value)) continue

			const strategy = NON_ADDITIVE_STRATEGIES[key]
			if (strategy === 'avg') {
				if (!avgSums[groupKey]) avgSums[groupKey] = {}
				if (!avgCounts[groupKey]) avgCounts[groupKey] = {}
				avgSums[groupKey][key] = (avgSums[groupKey][key] ?? 0) + value
				avgCounts[groupKey][key] = (avgCounts[groupKey][key] ?? 0) + 1
				continue
			}

			if (strategy === 'last') {
				if (!lastValues[groupKey]) lastValues[groupKey] = {}
				if (!lastTimestamps[groupKey]) lastTimestamps[groupKey] = {}

				const prevTs = lastTimestamps[groupKey][key]
				if (prevTs == null || ts >= prevTs) {
					lastTimestamps[groupKey][key] = ts
					lastValues[groupKey][key] = value
				}
				continue
			}

			// Additive series: sum within the bucket.
			grouped[groupKey][key] = (grouped[groupKey][key] ?? 0) + value
		}
	}

	// Merge non-additive results into the grouped output.
	for (const groupKey in avgSums) {
		const sums = avgSums[groupKey]
		const counts = avgCounts[groupKey]
		for (const key in sums) {
			const count = counts?.[key] ?? 0
			if (count > 0) grouped[groupKey][key] = sums[key] / count
		}
	}

	for (const groupKey in lastValues) {
		const values = lastValues[groupKey]
		for (const key in values) {
			grouped[groupKey][key] = values[key]
		}
	}

	const result: Array<{ timestamp: number } & Record<string, number>> = []
	for (const groupKey in grouped) {
		result.push({ timestamp: +groupKey, ...grouped[groupKey] })
	}
	return result.sort((a, b) => a.timestamp - b.timestamp)
}

function sortStacksByVolatility(
	stacks: string[],
	chartData: Array<{ timestamp: number } & Record<string, number>>
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
const allocationPieChartRadius = ['0%', '82%'] as [string, string]
const allocationPieChartLegendToRight = 260

const unlockedPieChartStackColors = {
	Unlocked: '#0c5dff',
	Locked: '#ff4e21'
}

const sortPieChartDataDesc = <T extends { name: string; value: number }>(items: T[]) =>
	items.toSorted(
		(a, b) => (Number(b.value) || 0) - (Number(a.value) || 0) || String(a.name).localeCompare(String(b.name))
	)

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

const ChartContainer = ({
	data,
	isEmissionsPage,
	initialTokenMarketData,
	disableClientTokenStatsFetch
}: {
	data: IEmission
	isEmissionsPage?: boolean
	initialTokenMarketData?: InitialTokenMarketData | null
	disableClientTokenStatsFetch?: boolean
}) => {
	const width = useBreakpointWidth()
	const router = useRouter()

	const dataTypeParam = readSingleQueryValue(router.query.dataType)
	const dataType: DataType =
		dataTypeParam && (DATA_TYPES as readonly string[]).includes(dataTypeParam)
			? (dataTypeParam as DataType)
			: 'documented'

	const chartType: 'bar' | 'line' = readSingleQueryValue(router.query.chartType) === 'bar' ? 'bar' : 'line'
	const allocationMode: 'current' | 'standard' =
		readSingleQueryValue(router.query.groupAllocation) === 'true' ? 'standard' : 'current'
	const isPriceAndMcapRequested = readSingleQueryValue(router.query.priceMcap) === 'true'

	const timeGroupingParam = readSingleQueryValue(router.query.groupBy)
	const timeGrouping: TimeGrouping =
		timeGroupingParam && (TIME_GROUPINGS as readonly string[]).includes(timeGroupingParam)
			? (timeGroupingParam as TimeGrouping)
			: 'D'

	const setQueryParams = (updates: Record<string, string | undefined>) => {
		const nextQuery: Record<string, any> = { ...router.query }
		for (const [key, value] of Object.entries(updates)) {
			if (value === undefined) {
				delete nextQuery[key]
			} else {
				nextQuery[key] = value
			}
		}
		router.push({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
	}
	const setQueryParam = (key: string, value: string | undefined) => setQueryParams({ [key]: value })

	const [selectedCategories, setSelectedCategories] = useState<string[]>([])

	const { chartInstance: exportChartInstance, handleChartReady } = useGetChartInstance()

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
	const { data: geckoId } = useGeckoId(data.geckoId ? null : (data.token ?? null))

	const shouldPrefetchTokenStats = !(disableClientTokenStatsFetch ?? false)
	const resolvedGeckoId = data.geckoId ?? geckoId
	const shouldFetchPriceChart = shouldPrefetchTokenStats || isPriceAndMcapRequested
	const priceChart = usePriceChart(shouldFetchPriceChart ? resolvedGeckoId : undefined)

	const isPriceChartReady =
		Boolean(priceChart.data?.data?.prices?.length) && Boolean(priceChart.data?.data?.mcaps?.length)
	const isPriceAndMcapActive = isPriceAndMcapRequested && isPriceChartReady
	const isPriceAndMcapLoading =
		isPriceAndMcapRequested && !isPriceAndMcapActive && (priceChart.isLoading || priceChart.isFetching)

	const tokenMaxSupplyFromChart = priceChart.data?.data.coinData.market_data?.max_supply_infinite
		? Infinity
		: (priceChart.data?.data.coinData.market_data?.max_supply ?? undefined)
	const tokenCircSupplyFromChart = priceChart.data?.data.coinData.market_data?.circulating_supply ?? undefined
	const tokenPriceFromChart = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 1]?.[1]
	const tokenMcapFromChart = priceChart.data?.data.mcaps?.[priceChart.data?.data.mcaps?.length - 1]?.[1]
	const tokenVolumeFromChart = priceChart.data?.data.volumes?.[priceChart.data?.data.volumes?.length - 1]?.[1]
	const ystdPrice = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 2]?.[1]

	const tokenPrice = tokenPriceFromChart ?? initialTokenMarketData?.price ?? data?.tokenPrice?.price ?? undefined
	const tokenMcap = tokenMcapFromChart ?? initialTokenMarketData?.mcap ?? data?.meta?.mcap ?? undefined
	const tokenVolume = tokenVolumeFromChart ?? initialTokenMarketData?.volume24h ?? undefined
	const tokenCircSupply =
		tokenCircSupplyFromChart ?? initialTokenMarketData?.circSupply ?? data?.meta?.circSupply ?? undefined
	const tokenMaxSupply =
		initialTokenMarketData?.maxSupplyInfinite === true
			? Infinity
			: (tokenMaxSupplyFromChart ?? initialTokenMarketData?.maxSupply ?? data?.meta?.maxSupply ?? undefined)

	const percentChangeFromChart =
		tokenPrice != null && ystdPrice != null ? +(((tokenPrice - ystdPrice) / ystdPrice) * 100).toFixed(2) : null
	const percentChange = percentChangeFromChart ?? initialTokenMarketData?.priceChangePercent ?? null

	const priceChartForOverlay = isPriceAndMcapActive ? priceChart.data?.data : null
	const normilizePriceChart = useMemo(() => {
		if (!priceChartForOverlay) return null
		const sourceData = priceChartForOverlay || {}
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
	}, [priceChartForOverlay])

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
		// Keep chart data independent from the price query unless the overlay is enabled.
		// This prevents the schedule chart from re-rendering when price data finishes loading.
		if (!isPriceAndMcapActive) {
			return rawChartData?.filter((chartItem) => sumValuesExcludingKey(chartItem, 'timestamp') > 0)
		}

		return rawChartData
			?.map((chartItem) => {
				const dateSec = Math.floor(chartItem.timestamp / 1e3)
				const res = { ...chartItem }

				const mcap = normilizePriceChart?.mcaps?.[dateSec]
				const price = normilizePriceChart?.prices?.[dateSec]

				if (mcap) res['Market Cap'] = mcap
				if (price) res['Price'] = price

				return res
			})
			?.filter((chartItem) => sumValuesExcludingKey(chartItem, 'timestamp') > 0)
	}, [rawChartData, isPriceAndMcapActive, normilizePriceChart])

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
		return sortPieChartDataDesc(result)
	}, [tokenAllocation])

	const pieChartDataAllocation = useMemo(() => {
		const filtered: Array<{ name: string; value: number }> = []
		for (const item of pieChartData as Array<{ name: string; value: number }>) {
			if (!item) continue
			if (!selectedCategories.includes(item.name)) continue
			filtered.push(item)
		}
		return sortPieChartDataDesc(filtered)
	}, [pieChartData, selectedCategories])

	const pieChartDataAllocationMode = allocationMode === 'current' ? pieChartDataAllocation : groupAllocation

	const allocationPieStackColors = useMemo(
		() => (allocationMode === 'standard' ? standardGroupColors : stackColors),
		[allocationMode, stackColors]
	)

	const chartConfig = useMemo(() => {
		let stacks = selectedCategories
		if ((!stacks || stacks.length === 0) && displayData && displayData.length > 0) {
			const first = displayData[0]
			stacks = []
			for (const k in first) {
				if (k !== 'timestamp' && k !== 'Price' && k !== 'Market Cap') {
					stacks.push(k)
				}
			}
		}
		const finalStacks = chartType === 'bar' ? sortStacksByVolatility(stacks, displayData) : stacks
		return {
			stacks: [...finalStacks, ...(isPriceAndMcapActive ? ['Market Cap', 'Price'] : [])].filter(Boolean),
			customYAxis: isPriceAndMcapActive ? ['Market Cap', 'Price'] : [],
			colors:
				allocationMode === 'standard'
					? isPriceAndMcapActive
						? { ...standardGroupColors, Price: '#ff4e21', 'Market Cap': '#0c5dff' }
						: standardGroupColors
					: isPriceAndMcapActive
						? getExtendedColors(stackColors, true)
						: stackColors
		}
	}, [isPriceAndMcapActive, selectedCategories, stackColors, allocationMode, displayData, chartType])

	const dataset = useMemo<MultiSeriesChart2Dataset>(() => {
		const stacks = chartConfig.stacks
		const dimensions = ['timestamp', ...stacks]

		// In bar (expand-to-100%) mode we need to normalize values per row.
		// In line mode the displayData rows already contain all needed keys, so pass through directly.
		if (chartType !== 'bar') {
			return { source: displayData as unknown as MultiSeriesChart2Dataset['source'], dimensions }
		}

		const overlaySet = new Set(chartConfig.customYAxis)
		const source = new Array(displayData.length)
		for (let i = 0; i < displayData.length; i++) {
			const entry = displayData[i]
			const row: Record<string, number | null> = { timestamp: entry.timestamp }
			// Sum only non-overlay (unlock category) series for percentage calculation.
			// Overlay series like Price / Market Cap use separate Y-axes with dollar values
			// and must not participate in the normalization.
			let sum = 0
			for (const s of stacks) {
				if (!overlaySet.has(s)) sum += Number(entry[s]) || 0
			}
			for (const s of stacks) {
				const raw = Number(entry[s]) || 0
				if (overlaySet.has(s)) {
					// Preserve original dollar value for overlay series
					row[s] = raw
				} else {
					row[s] = sum > 0 ? (raw / sum) * 100 : 0
				}
			}
			source[i] = row
		}
		return { source, dimensions }
	}, [displayData, chartConfig.stacks, chartConfig.customYAxis, chartType])

	const charts = useMemo<IMultiSeriesChart2Props['charts']>(() => {
		const stacks = chartConfig.stacks
		const colors = chartConfig.colors
		const customYAxis = chartConfig.customYAxis
		return stacks.map((name) => {
			const yIdx = customYAxis?.indexOf(name) ?? -1
			const isOverlay = yIdx !== -1
			return {
				type: isOverlay ? 'line' : chartType,
				name,
				encode: { x: 'timestamp', y: name },
				color: colors[name],
				...(!isOverlay ? { stack: 'A' } : {}),
				...(isOverlay ? { yAxisIndex: yIdx + 1, valueSymbol: '$', hideAreaStyle: true } : {})
			}
		})
	}, [chartConfig.stacks, chartConfig.colors, chartConfig.customYAxis, chartType])

	const unlockedPercent =
		data.meta?.totalLocked != null && data.meta?.maxSupply != null
			? 100 - (data.meta.totalLocked / data.meta.maxSupply) * 100
			: 0

	const unlockedPieChartData = useMemo(
		() =>
			sortPieChartDataDesc([
				{ name: 'Unlocked', value: unlockedPercent },
				{ name: 'Locked', value: 100 - unlockedPercent }
			]),
		[unlockedPercent]
	)

	const getDesktopPieLegendPosition = (itemsCount: number) => {
		// When there are only a few legend items, center it vertically.
		// When there are many, constrain height so the legend can scroll.
		return itemsCount <= 8
			? { right: 12, top: 'middle' as const, orient: 'vertical' as const }
			: { right: 12, top: 12, bottom: 12, orient: 'vertical' as const }
	}

	const pieChartLegendTextStyle = useMemo(() => ({ fontSize: width < 640 ? 12 : 14 }), [width])

	const allocationPieChartLegendPosition = useMemo(() => {
		return width < 640
			? { left: 'center', bottom: 0, orient: 'horizontal' as const }
			: getDesktopPieLegendPosition(pieChartDataAllocationMode.length)
	}, [width, pieChartDataAllocationMode.length])

	const unlockedPieChartLegendPosition = useMemo(() => {
		return width < 640
			? { left: 'center', bottom: 0, orient: 'horizontal' as const }
			: getDesktopPieLegendPosition(unlockedPieChartData.length)
	}, [width, unlockedPieChartData.length])

	const allocationExportButtons = useMemo(
		() => ({
			png: true,
			csv: true,
			filename: `${slug(data.name)}-allocation`,
			pngTitle: `${data.name} Allocation`
		}),
		[data.name]
	)

	const unlockedExportButtons = useMemo(
		() => ({
			png: true,
			csv: true,
			filename: `${slug(data.name)}-unlocked`,
			pngTitle: `${data.name} Unlocked ${unlockedPercent.toFixed(2)}%`
		}),
		[data.name, unlockedPercent]
	)

	const hasGroupAllocationData = (() => {
		if (!data.categoriesBreakdown || typeof data.categoriesBreakdown !== 'object') return false
		for (const _ in data.categoriesBreakdown) {
			return true
		}
		return false
	})()

	if (!data) return null

	return (
		<>
			{isEmissionsPage ? (
				<div className="flex w-full items-center gap-3 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<TokenLogo logo={tokenIconUrl(data.name)} />
					<h1 className="text-xl font-semibold">{data.name}</h1>

					{tokenPrice != null ? (
						<>
							<span className="mx-1 h-5 w-px bg-(--cards-border)" />
							<span className="text-base font-semibold">${formattedNum(tokenPrice)}</span>
							{percentChange !== null ? (
								<span
									className="text-sm font-medium"
									style={{
										color: percentChange > 0 ? 'rgba(18, 182, 0, 0.7)' : 'rgba(211, 0, 0, 0.7)'
									}}
								>
									{percentChange > 0 && '+'}
									{percentChange}%
								</span>
							) : null}
						</>
					) : null}
				</div>
			) : null}

			{data?.tokenPrice?.price || data?.meta?.circSupply || data?.meta?.maxSupply || tokenMcap || tokenVolume ? (
				<div className="flex min-h-[46px] w-full flex-wrap items-center gap-x-6 gap-y-2 rounded-md border border-(--cards-border) bg-(--cards-bg) px-4 py-3">
					{tokenCircSupply ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">Circ. Supply</span>
							<span className="text-sm font-medium">
								{formattedNum(tokenCircSupply)} {data.tokenPrice.symbol}
							</span>
						</div>
					) : null}

					{tokenMaxSupply ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">Max Supply</span>
							<span className="text-sm font-medium">
								{tokenMaxSupply != Infinity ? formattedNum(tokenMaxSupply) : '∞'} {data.tokenPrice.symbol}
							</span>
						</div>
					) : null}

					{tokenMcap ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">MCap</span>
							<span className="text-sm font-medium">${formattedNum(tokenMcap)}</span>
						</div>
					) : null}

					{tokenVolume ? (
						<div className="flex items-baseline gap-1.5">
							<span className="text-sm text-(--text-label)">Vol 24h</span>
							<span className="text-sm font-medium">${formattedNum(tokenVolume)}</span>
						</div>
					) : null}
				</div>
			) : null}

			{data.chartData?.realtime?.length > 0 ? (
				<TagGroup
					selectedValue={dataType}
					setValue={(period) => setQueryParam('dataType', period === 'documented' ? undefined : period)}
					values={DATA_TYPES}
					className="ml-auto"
				/>
			) : null}

			<div className="flex flex-col gap-2">
				{categoriesFromData.length > 0 && rawChartData.length > 0 && (
					<div className="relative rounded-md border border-(--cards-border) bg-(--cards-bg)">
						<div className="flex flex-wrap items-center justify-end gap-2 p-2">
							<h3 className="mr-auto text-base font-semibold">Schedule</h3>
							{hasGroupAllocationData ? (
								<Switch
									label="Group Allocation"
									value="group-allocation"
									onChange={() => setQueryParam('groupAllocation', allocationMode === 'current' ? 'true' : undefined)}
									help="Group token allocations into standardized categories."
									checked={allocationMode === 'standard'}
								/>
							) : null}
							<Switch
								label="Bar Chart"
								value="bar-chart"
								onChange={() => setQueryParam('chartType', chartType === 'line' ? 'bar' : undefined)}
								checked={chartType === 'bar'}
							/>
							{resolvedGeckoId ? (
								<Switch
									label="Price & MCap"
									value="show=price-and-mcap"
									onChange={() => setQueryParam('priceMcap', isPriceAndMcapRequested ? undefined : 'true')}
									checked={isPriceAndMcapRequested}
									isLoading={isPriceAndMcapLoading}
								/>
							) : null}
							<TagGroup
								selectedValue={timeGrouping}
								setValue={(v) => setQueryParam('groupBy', v === 'D' ? undefined : v)}
								values={TIME_GROUPINGS}
							/>
							<SelectWithCombobox
								allValues={availableCategories}
								selectedValues={selectedCategories}
								setSelectedValues={setSelectedCategories}
								label="Categories"
								labelType="smol"
								variant="filter"
							/>
							<ChartExportButtons
								chartInstance={exportChartInstance}
								filename={`${slug(data.name)}-unlock-schedule`}
								title={`${data.name} Unlock Schedule`}
							/>
						</div>
						{isPriceAndMcapLoading ? (
							<div className="flex min-h-[360px] items-center justify-center">
								<p className="flex items-center gap-1">
									Loading
									<LoadingDots />
								</p>
							</div>
						) : (
							<ScheduleChart
								dataset={dataset}
								charts={charts}
								hallmarks={hallmarks}
								expandTo100Percent={chartType === 'bar'}
								solidChartAreaStyle
								valueSymbol={data.tokenPrice?.symbol ?? ''}
								onReady={handleChartReady}
								hideDefaultLegend={false}
							/>
						)}
					</div>
				)}

				<div className="grid grid-cols-2 gap-2">
					{data.pieChartData?.[dataType] && data.stackColors[dataType] && (
						<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<Suspense fallback={<div className="min-h-[398px]" />}>
								<PieChart
									showLegend
									title="Allocation"
									chartData={pieChartDataAllocationMode}
									stackColors={allocationPieStackColors}
									valueSymbol={data.tokenPrice?.symbol ?? ''}
									legendPosition={allocationPieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
									// Give the allocation chart a wider legend column so labels
									// can render without ellipsis, and the pie can sit further left.
									toRight={allocationPieChartLegendToRight}
									// Slightly larger pie to better utilize available canvas.
									radius={allocationPieChartRadius}
									exportButtons={allocationExportButtons}
								/>
							</Suspense>
						</div>
					)}

					{unlockedPercent > 0 && (
						<div className="relative col-span-full flex flex-col rounded-md border border-(--cards-border) bg-(--cards-bg) xl:col-span-1 xl:[&:last-child:nth-child(2n-1)]:col-span-full">
							<Suspense fallback={<div className="min-h-[398px]" />}>
								<PieChart
									showLegend
									title={`Unlocked ${unlockedPercent.toFixed(2)}%`}
									legendPosition={unlockedPieChartLegendPosition}
									legendTextStyle={pieChartLegendTextStyle}
									radius={unlockedPieChartRadius}
									chartData={unlockedPieChartData}
									stackColors={unlockedPieChartStackColors}
									valueSymbol="%"
									exportButtons={unlockedExportButtons}
								/>
							</Suspense>
						</div>
					)}
				</div>
			</div>

			{data.token && tokenAllocationCurrentChunks.length > 0 && tokenAllocationFinalChunks.length > 0 ? (
				<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<h3 className="text-base font-semibold">Token Allocation</h3>
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{(['current', 'final'] as const).map((phase) => {
							const entries = phase === 'current' ? tokenAllocation.current : tokenAllocation.final
							if (!entries) return null
							const sorted = Object.entries(entries).sort(([, a], [, b]) => b - a)
							return (
								<div key={phase} className="flex flex-col gap-1.5">
									<span className="text-xs font-medium tracking-wide text-(--text-label) uppercase">{phase}</span>
									{sorted.map(([cat, perc]) => (
										<div key={cat} className="flex flex-col gap-0.5">
											<div className="flex items-baseline justify-between text-sm">
												<span>{capitalizeFirstLetter(cat)}</span>
												<span className="font-medium tabular-nums">{perc}%</span>
											</div>
											<div className="h-1.5 w-full overflow-hidden rounded-full bg-(--cards-border)">
												<div
													className="h-full rounded-full"
													style={{
														width: `${Math.min(perc, 100)}%`,
														backgroundColor: stackColors[cat] ?? stackColors[capitalizeFirstLetter(cat)] ?? '#6b7280'
													}}
												/>
											</div>
										</div>
									))}
								</div>
							)
						})}
					</div>
				</div>
			) : null}

			{data.events?.length > 0 ? (
				<div className="flex w-full flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
					<h3 className="text-base font-semibold">Unlock Events</h3>
					<Pagination startIndex={upcomingEventIndex} items={paginationItems} />
				</div>
			) : null}

			<div className="flex flex-wrap gap-2 *:flex-1">
				{data.sources?.length > 0 ? (
					<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h3 className="text-base font-semibold">Sources</h3>
						<ul className="list-disc space-y-1 pl-4 text-sm">
							{data.sources.map((source) => (
								<li key={source}>
									<Link
										href={source}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-sm font-medium text-(--link-text) hover:underline"
									>
										<span>{new URL(source).hostname}</span>
										<Icon name="external-link" height={14} width={14} />
									</Link>
								</li>
							))}
						</ul>
					</div>
				) : null}
				{data.notes?.length > 0 ? (
					<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h3 className="text-base font-semibold">Notes</h3>
						<ul className="list-disc space-y-1 pl-4 text-sm text-(--text-secondary)">
							{data.notes.map((note) => (
								<li key={note}>{note}</li>
							))}
						</ul>
					</div>
				) : null}
				{data.futures?.openInterest || data.futures?.fundingRate ? (
					<div className="flex flex-col gap-2 rounded-md border border-(--cards-border) bg-(--cards-bg) p-3">
						<h3 className="text-base font-semibold">Futures</h3>
						<div className="flex flex-col gap-1 text-sm">
							{data.futures.openInterest ? <p>{`Open Interest: $${formattedNum(data.futures.openInterest)}`}</p> : null}
							{data.futures.fundingRate ? <p>{`Funding Rate: ${data.futures.fundingRate}%`}</p> : null}
						</div>
					</div>
				) : null}
			</div>
		</>
	)
}

export const UnlocksCharts = ({
	protocolName,
	initialData,
	initialTokenMarketData,
	disableClientTokenStatsFetch,
	isEmissionsPage
}: {
	protocolName: string
	initialData?: IEmission | null
	initialTokenMarketData?: InitialTokenMarketData | null
	disableClientTokenStatsFetch?: boolean
	isEmissionsPage?: boolean
}) => {
	const shouldFetch = !initialData
	const { data = null, isLoading, error } = useGetProtocolEmissions(shouldFetch ? slug(protocolName) : null)

	if (shouldFetch && isLoading) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center">
				<LocalLoader />
			</div>
		)
	}

	const resolvedData = initialData ?? data
	if (!resolvedData) {
		return (
			<div className="flex flex-1 flex-col items-center justify-center">
				<p className="p-2">{error instanceof Error ? error.message : 'Failed to fetch'}</p>
			</div>
		)
	}

	return (
		<ChartContainer
			data={resolvedData as any}
			isEmissionsPage={isEmissionsPage}
			initialTokenMarketData={initialTokenMarketData}
			disableClientTokenStatsFetch={disableClientTokenStatsFetch}
		/>
	)
}
