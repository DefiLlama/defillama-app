import { chunk, groupBy, omit, sum, isEqual } from 'lodash'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState, useCallback } from 'react'
import useWindowSize from '~/hooks/useWindowSize'
import { useGeckoId, useGetProtocolEmissions, usePriceChart } from '~/api/categories/protocols/client'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { UpcomingEvent } from '~/containers/ProtocolOverview/Emissions/UpcomingEvent'
import { TokenLogo } from '~/components/TokenLogo'
import { LazyChart } from '~/components/LazyChart'
import { capitalizeFirstLetter, formattedNum, slug, tokenIconUrl } from '~/utils'
import Pagination from './Pagination'
import { IEmission } from './types'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

const getExtendedCategories = (baseCategories: string[], isPriceEnabled: boolean) => {
	const extended = [...baseCategories]
	if (isPriceEnabled) {
		if (!extended.includes('Market Cap')) extended.push('Market Cap')
		if (!extended.includes('Price')) extended.push('Price')
	}
	return extended
}

const getExtendedColors = (baseColors: Record<string, string>, isPriceEnabled: boolean) => {
	const extended = { ...baseColors }
	if (isPriceEnabled) {
		extended['Market Cap'] = '#0c5dff'
		extended['Price'] = '#ff4e21'
	}
	return extended
}

const AreaChart = dynamic(() => import('~/components/ECharts/UnlocksChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export function Emissions({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) {
	return (
		<div className="flex flex-col gap-1 col-span-full xl:col-span-1">
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

		Object.entries(categoriesBreakdown).forEach(([group, categories]) => {
			groupedEntry[group] = categories.reduce((sum, category) => {
				const actualKey = Object.keys(entry).find((key) => key.toLowerCase() === category.toLowerCase())
				const value = actualKey ? Number(entry[actualKey]) || 0 : 0
				return sum + value
			}, 0)
		})

		return groupedEntry
	})
}

const ChartContainer = ({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) => {
	const { width } = useWindowSize()
	const [dataType, setDataType] = useState<'documented' | 'realtime'>('documented')
	const [isPriceEnabled, setIsPriceEnabled] = useState(false)
	const [allocationMode, setAllocationMode] = useState<'current' | 'standard'>('current')
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])

	const categoriesFromData = useMemo(() => data.categories?.[dataType] || [], [data.categories, dataType])
	const stackColors = useMemo(() => data.stackColors?.[dataType] || {}, [data.stackColors, dataType])
	const tokenAllocation = useMemo(
		() => data.tokenAllocation?.[dataType] || { current: {}, final: {} },
		[data.tokenAllocation, dataType]
	)
	const rawChartData = useMemo(() => data.chartData?.[dataType] || [], [data.chartData, dataType])
	const pieChartData = useMemo(() => data.pieChartData?.[dataType] || [], [data.pieChartData, dataType])
	const hallmarks = useMemo(() => data.hallmarks?.[dataType] || [], [data.hallmarks, dataType])

	useEffect(() => {
		if (categoriesFromData.length > 0) {
			setSelectedCategories((current) => {
				const newCategories = categoriesFromData.filter((cat) => !['Market Cap', 'Price'].includes(cat))
				return isEqual([...current].sort(), [...newCategories].sort()) ? current : newCategories
			})
		}
	}, [categoriesFromData])
	const { data: geckoId } = useGeckoId(data.token ?? null)

	const priceChart = usePriceChart(data.geckoId ?? geckoId)
	const tokenMaxSupply = priceChart.data?.data.coinData.market_data?.max_supply_infinite
		? Infinity
		: priceChart.data?.data.coinData.market_data?.max_supply ?? undefined
	const tokenCircSupply = priceChart.data?.data.coinData.market_data?.circulating_supply ?? undefined
	const tokenPrice = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 1]?.[1]
	const tokenMcap = priceChart.data?.data.mcaps?.[priceChart.data?.data.mcaps?.length - 1]?.[1]
	const tokenVolume = priceChart.data?.data.volumes?.[priceChart.data?.data.volumes?.length - 1]?.[1]
	const ystdPrice = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 2]?.[1]
	const percentChange = tokenPrice && ystdPrice ? +(((tokenPrice - ystdPrice) / ystdPrice) * 100).toFixed(2) : null
	const normilizePriceChart = useMemo(
		() =>
			Object.fromEntries(
				Object.entries(priceChart.data?.data || {})
					.map(([name, chart]: [string, Array<[number, number]>]) =>
						Array.isArray(chart)
							? [name, Object.fromEntries(chart.map(([date, price]) => [Math.floor(date / 1e3), price]))]
							: null
					)
					.filter(Boolean)
			),
		[priceChart.data?.data]
	)

	const groupedEvents = useMemo(() => groupBy(data.events, (event) => event.timestamp), [data.events])
	const sortedEvents = useMemo(() => Object.entries(groupedEvents).sort(([a], [b]) => +a - +b), [groupedEvents])
	const upcomingEventIndex = useMemo(() => {
		const index = sortedEvents.findIndex((events) => {
			const event = events[1][0]
			const { timestamp } = event
			return +timestamp > Date.now() / 1e3
		})
		return index === -1 ? 0 : index
	}, [sortedEvents])

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
			?.filter((chartItem) => sum(Object.values(omit(chartItem, 'date'))) > 0)
	}, [rawChartData, normilizePriceChart, isPriceEnabled])

	const availableCategories = useMemo(() => {
		if (allocationMode === 'standard') {
			return Object.keys(data.categoriesBreakdown || {})
		}
		return categoriesFromData.filter((cat) => !['Market Cap', 'Price'].includes(cat))
	}, [allocationMode, data.categoriesBreakdown, categoriesFromData])

	const displayData = useMemo(() => {
		if (allocationMode === 'standard' && data.categoriesBreakdown) {
			return processGroupedChartData(chartData || ([] as any), data.categoriesBreakdown)
		}
		return chartData
	}, [allocationMode, chartData, data.categoriesBreakdown])

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
		if (!finalAllocation || Object.keys(finalAllocation).length === 0) {
			return []
		}
		return Object.entries(finalAllocation)
			.filter(([_, value]) => Number(value) > 0)
			.map(([name, value]) => ({
				name: name,
				value: Number(value)
			}))
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
			stacks = Object.keys(first).filter((k) => k !== 'date' && k !== 'Price' && k !== 'Market Cap')
		}
		const extendedCategories = getExtendedCategories(categoriesFromData, isPriceEnabled)
		const extendedColors = getExtendedColors(stackColors, isPriceEnabled)
		return {
			stacks: [...stacks, ...(isPriceEnabled ? ['Market Cap', 'Price'] : [])].filter(Boolean),
			customYAxis: isPriceEnabled ? ['Market Cap', 'Price'] : [],
			colors:
				allocationMode === 'standard'
					? { ...standardGroupColors, Price: '#ff4e21', 'Market Cap': '#0c5dff' }
					: extendedColors
		}
	}, [categoriesFromData, isPriceEnabled, selectedCategories, stackColors, allocationMode, displayData])

	const unlockedPercent =
		data.meta?.totalLocked != null && data.meta?.maxSupply != null
			? 100 - (data.meta.totalLocked / data.meta.maxSupply) * 100
			: 0

	const unlockedPieChartData = useMemo(
		() => [
			{ name: 'Unlocked', value: unlockedPercent },
			{ name: 'Locked', value: 100 - unlockedPercent }
		],
		[unlockedPercent]
	)

	const unlockedPieChartStackColors = useMemo(
		() => ({
			Unlocked: '#0c5dff',
			Locked: '#ff4e21'
		}),
		[]
	)

	const pieChartLegendPosition = useMemo(() => {
		if (!width) return { left: 'right', orient: 'vertical' as const }
		if (width < 640) return { left: 'center', top: 'bottom', orient: 'horizontal' as const }
		return { left: 'right', top: 'center', orient: 'vertical' as const }
	}, [width])

	const pieChartLegendTextStyle = useMemo(
		() => ({
			fontSize: !width ? 20 : width < 640 ? 12 : 20
		}),
		[width]
	)

	const hasGroupAllocationData = useMemo(() => {
		return (
			data.categoriesBreakdown &&
			typeof data.categoriesBreakdown === 'object' &&
			Object.keys(data.categoriesBreakdown).length > 0
		)
	}, [data.categoriesBreakdown])

	const unlockedPieChartFormatTooltip = useCallback(
		({ value, data: { name } }: { value: number; data: { name: string } }) => `${name}: ${value?.toFixed(2)}%`,
		[]
	)

	const unlockedPieChartRadius = useMemo(() => ['50%', '70%'] as [string, string], [])

	const unlockedPieChartCustomLabel = useMemo(
		() => ({
			show: true,
			position: 'center',
			fontSize: 16,
			formatter: ({ percent }: { percent: number }) => `${percent.toFixed(0)}%`
		}),
		[]
	)

	if (!data) return null

	return (
		<>
			<div className="flex flex-col sm:flex-row gap-4 sm:justify-between items-center w-full bg-[var(--cards-bg)] rounded-md p-3">
				{isEmissionsPage ? (
					<h1 className="flex items-center gap-2 text-xl font-semibold">
						<TokenLogo logo={tokenIconUrl(data.name)} />
						<span>{data.name}</span>
					</h1>
				) : null}
				<div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
					{hasGroupAllocationData && (
						<Switch
							label="Group Allocation"
							value="group-allocation"
							onChange={() => setAllocationMode((prev) => (prev === 'current' ? 'standard' : 'current'))}
							help="Group token allocations into standardized categories."
							checked={allocationMode === 'standard'}
						/>
					)}

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
				<div className="flex flex-col gap-4 items-center p-3 w-full bg-[var(--cards-bg)] rounded-md">
					<h1 className="text-center text-xl font-semibold">Token Overview</h1>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-center w-full place-content-center">
						{data?.tokenPrice?.price ? (
							<div className="flex flex-col items-center">
								<span className="text-[var(--text3)]">Price</span>
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
								<span className="text-[var(--text3)]">Circulating Supply</span>
								<span className="text-lg font-medium">
									{formattedNum(tokenCircSupply)} {data.tokenPrice.symbol}
								</span>
							</div>
						) : null}

						{tokenMaxSupply ? (
							<div className="flex flex-col items-center">
								<span className="text-[var(--text3)]">Max Supply</span>
								<span className="text-lg font-medium">
									{tokenMaxSupply != Infinity ? formattedNum(tokenMaxSupply) : '∞'} {data.tokenPrice.symbol}
								</span>
							</div>
						) : null}

						{tokenMcap ? (
							<div className="flex flex-col items-center">
								<span className="text-[var(--text3)]">Market Cap</span>
								<span className="text-lg font-medium">${formattedNum(tokenMcap)}</span>
							</div>
						) : null}

						{tokenVolume ? (
							<div className="flex flex-col items-center">
								<span className="text-[var(--text3)]">Volume (24h)</span>
								<span className="text-lg font-medium">${formattedNum(tokenVolume)}</span>
							</div>
						) : null}
					</div>
				</div>
			) : null}

			{data.chartData?.realtime?.length > 0 && (
				<div className="text-xs font-medium p-3 ml-auto flex items-center rounded-md overflow-x-auto flex-nowrap border border-[var(--form-control-border)] text-[#666] dark:text-[#919296]">
					<button
						data-active={dataType === 'documented'}
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
						onClick={() => setDataType('documented')}
					>
						Documented
					</button>
					<button
						data-active={dataType === 'realtime'}
						className="flex-shrink-0 py-2 px-3 whitespace-nowrap hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] data-[active=true]:bg-[var(--old-blue)] data-[active=true]:text-white"
						onClick={() => setDataType('realtime')}
					>
						Realtime
					</button>
				</div>
			)}

			<div className="flex flex-col gap-1">
				{categoriesFromData.length > 0 && rawChartData.length > 0 && (
					<LazyChart className="bg-[var(--cards-bg)] rounded-md min-h-[384px] p-3 relative">
						<div className="absolute right-4 z-10">
							<SelectWithCombobox
								allValues={availableCategories}
								selectedValues={selectedCategories}
								setSelectedValues={(newCategories) => {
									if (newCategories.length === 0) return
									setSelectedCategories(newCategories)
								}}
								label="Categories"
								clearAll={() => {
									if (selectedCategories.length > 0) {
										setSelectedCategories([selectedCategories[0]])
									}
								}}
								toggleAll={() => {
									if (allocationMode === 'standard' && data.categoriesBreakdown) {
										setSelectedCategories(Object.keys(data.categoriesBreakdown))
									} else {
										const filteredCategories = categoriesFromData.filter(
											(cat) =>
												!['Market Cap', 'Price'].includes(cat) &&
												!data.categoriesBreakdown?.noncirculating?.includes(cat)
										)
										setSelectedCategories(filteredCategories)
									}
								}}
								labelType="smol"
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium'
								}}
							/>
						</div>
						<AreaChart
							customYAxis={chartConfig.customYAxis}
							title="Schedule"
							stacks={chartConfig.stacks}
							chartData={displayData}
							hallmarks={hallmarks}
							stackColors={chartConfig.colors}
							isStackedChart
						/>
					</LazyChart>
				)}

				<div className="grid grid-cols-2 gap-1">
					{data.pieChartData?.[dataType] && data.stackColors[dataType] && (
						<LazyChart className="relative col-span-full p-3 min-h-[384px] bg-[var(--cards-bg)] rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
							<PieChart
								showLegend
								title="Allocation"
								chartData={pieChartDataAllocationMode}
								stackColors={chartConfig.colors}
								usdFormat={false}
								legendPosition={pieChartLegendPosition}
								legendTextStyle={pieChartLegendTextStyle}
							/>
						</LazyChart>
					)}

					{unlockedPercent > 0 && (
						<LazyChart className="relative col-span-full p-3 min-h-[384px] bg-[var(--cards-bg)] rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
							<PieChart
								formatTooltip={unlockedPieChartFormatTooltip}
								showLegend
								radius={unlockedPieChartRadius}
								title={`Unlocked ${unlockedPercent.toFixed(2)}%`}
								legendPosition={pieChartLegendPosition}
								legendTextStyle={pieChartLegendTextStyle}
								chartData={unlockedPieChartData}
								stackColors={unlockedPieChartStackColors}
								usdFormat={false}
								customLabel={unlockedPieChartCustomLabel}
							/>
						</LazyChart>
					)}
				</div>
			</div>

			<div>
				{data.token &&
				Object.entries(tokenAllocation.current || {}).length &&
				Object.entries(tokenAllocation.final || {}).length ? (
					<div className="flex flex-col items-center justify-start p-3 w-full bg-[var(--cards-bg)] rounded-md h-full">
						<h1 className="text-center text-xl font-semibold">Token Allocation</h1>
						<div className="flex flex-col text-base gap-2 w-full">
							<h4 style={{ fontSize: '16px' }}>Current</h4>

							<div className="flex justify-between flex-wrap">
								{chunk(Object.entries(tokenAllocation.current)).map((currentChunk) =>
									currentChunk.map(([cat, perc], i) => (
										<p className="text-base text-[var(--text3)]" key={cat}>{`${capitalizeFirstLetter(
											cat
										)} - ${perc}%`}</p>
									))
								)}
							</div>
							<hr className="border-[var(--form-control-border)]" />

							<h4 style={{ fontSize: '16px' }}>Final</h4>

							<div className="flex justify-between flex-wrap">
								{chunk(Object.entries(tokenAllocation.final)).map((currentChunk) =>
									currentChunk.map(([cat, perc], i) => (
										<p className="text-base text-[var(--text3)]" key={cat}>{`${capitalizeFirstLetter(
											cat
										)} - ${perc}%`}</p>
									))
								)}
							</div>
						</div>
					</div>
				) : null}
			</div>

			{data.events?.length > 0 ? (
				<div className="flex flex-col items-center justify-start p-3 w-full bg-[var(--cards-bg)] rounded-md h-full">
					<h1 className="text-center text-xl font-semibold">Unlock Events</h1>

					<Pagination
						startIndex={upcomingEventIndex}
						items={sortedEvents.map(([ts, events]: any) => (
							<UpcomingEvent
								key={ts}
								{...{
									event: events,
									noOfTokens: events.map((x) => x.noOfTokens),
									timestamp: ts,
									price: tokenPrice,
									symbol: tokenPrice?.symbol,
									mcap: tokenMcap,
									maxSupply: data.meta.maxSupply,
									name: data.name,
									tooltipStyles: { position: 'relative', top: 0 },
									isProtocolPage: true
								}}
							/>
						))}
					/>
				</div>
			) : null}

			<div className="flex flex-wrap *:flex-1 gap-4">
				{data.sources?.length > 0 ? (
					<div className="flex flex-col items-center justify-start p-3 w-full bg-[var(--cards-bg)] rounded-md h-full">
						<h1 className="text-center text-xl font-medium">Sources</h1>
						<div className="flex flex-col text-base gap-2 w-full">
							{data.sources.map((source, i) => (
								<a
									href={source}
									key={source}
									target="_blank"
									rel="noopener noreferrer"
									className="text-white text-base flex items-center font-medium gap-2"
								>
									<span>
										{i + 1} {new URL(source).hostname}
									</span>
									<Icon name="external-link" height={16} width={16} />
								</a>
							))}
						</div>
					</div>
				) : null}
				{data.notes?.length > 0 ? (
					<div className="flex flex-col items-center justify-start p-3 w-full bg-[var(--cards-bg)] rounded-md h-full">
						<h1 className="text-center text-xl font-medium">Notes</h1>
						<div className="flex flex-col text-base gap-2 w-full">
							{data.notes.map((note) => (
								<p key={note}>{note}</p>
							))}
						</div>
					</div>
				) : null}
				{data.futures?.openInterest || data.futures?.fundingRate ? (
					<div className="flex flex-col items-center justify-start p-3 w-full bg-[var(--cards-bg)] rounded-md h-full">
						<h1 className="text-center text-xl font-medium">Futures</h1>
						<div className="flex flex-col text-base gap-2 w-full">
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
	const { data, isLoading } = useGetProtocolEmissions(slug(protocolName))

	if (isLoading) {
		return <p className="my-[180px] text-center">Loading...</p>
	}

	if (!data) {
		return <p className="my-[180px] text-center"></p>
	}

	return <ChartContainer data={data} />
}
