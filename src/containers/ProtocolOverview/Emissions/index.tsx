import { chunk, groupBy, omit, sum } from 'lodash'
import dynamic from 'next/dynamic'
import { useEffect, useMemo, useState } from 'react'
import useWindowSize from '~/hooks/useWindowSize'
import { useGeckoId, useGetProtocolEmissions, usePriceChart } from '~/api/categories/protocols/client'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { UpcomingEvent } from '~/containers/ProtocolOverview/Emissions/UpcomingEvent'
import { TokenLogo } from '~/components/TokenLogo'
import { LazyChart } from '~/components/LazyChart'
import { capitalizeFirstLetter, formattedNum, tokenIconUrl } from '~/utils'
import Pagination from './Pagination'
import { IEmission } from './types'
import { Icon } from '~/components/Icon'
import { Switch } from '~/components/Switch'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

const AreaChart = dynamic(() => import('~/components/ECharts/UnlocksChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export function Emissions({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) {
	return (
		<div className="flex flex-col gap-1 col-span-full xl:col-span-1" id="emissions">
			{!isEmissionsPage && <h3>Emissions</h3>}
			<ChartContainer data={data} isEmissionsPage={isEmissionsPage} />
		</div>
	)
}

const ChartContainer = ({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) => {
	const { width } = useWindowSize()
	const [dataType, setDataType] = useState<'documented' | 'realtime'>('documented')
	const [isTreasuryIncluded, setIsTreasuryIncluded] = useState(false)
	const [isPriceEnabled, setIsPriceEnabled] = useState(false)
	const [selectedCategories, setSelectedCategories] = useState<string[]>([])

	useEffect(() => {
		if (data?.categories?.[dataType]) {
			setSelectedCategories(
				data.categories[dataType].filter(
					(cat) =>
						!['Market Cap', 'Price'].includes(cat) &&
						!(data.categoriesBreakdown?.noncirculating?.includes(cat) && !isTreasuryIncluded)
				)
			)
		}
	}, [data, dataType, isTreasuryIncluded])
	const { data: geckoId } = useGeckoId(data.token ?? null)

	const priceChart = usePriceChart(data.geckoId ?? geckoId)

	const tokenPrice = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 1]?.[1]
	const tokenMcap = priceChart.data?.data.mcaps?.[priceChart.data?.data.mcaps?.length - 1]?.[1]
	const tokenVolume = priceChart.data?.data.volumes?.[priceChart.data?.data.volumes?.length - 1]?.[1]
	const ystdPrice = priceChart.data?.data.prices?.[priceChart.data?.data.prices?.length - 2]?.[1]
	const percentChange = tokenPrice && ystdPrice ? +(((tokenPrice - ystdPrice) / ystdPrice) * 100).toFixed(2) : null
	const normilizePriceChart = Object.fromEntries(
		Object.entries(priceChart.data?.data || {})
			.map(([name, chart]: [string, Array<[number, number]>]) =>
				Array.isArray(chart)
					? [name, Object.fromEntries(chart.map(([date, price]) => [Math.floor(date / 1e3), price]))]
					: null
			)
			.filter(Boolean)
	)

	const groupedEvents = groupBy(data.events, (event) => event.timestamp)
	const sortedEvents = Object.entries(groupedEvents).sort(([a], [b]) => +a - +b)
	const upcomingEventIndex = useMemo(() => {
		const index = sortedEvents.findIndex((events) => {
			const event = events[1][0]
			const { timestamp } = event
			return +timestamp > Date.now() / 1e3
		})
		return index === -1 ? 0 : index
	}, [sortedEvents])

	if (!data) return null

	const chartData = data.chartData?.[dataType]
		?.map((chartItem) => {
			const date = chartItem.date
			const res = Object.entries(chartItem).reduce((acc, [key, value]) => {
				if (data?.categoriesBreakdown?.noncirculating?.includes(key)) {
					if (isTreasuryIncluded) acc[key] = value
					else return acc
				}
				acc[key] = value
				return acc
			}, {})

			const mcap = normilizePriceChart?.mcaps?.[date]
			const price = normilizePriceChart?.prices?.[date]
			if (mcap && isPriceEnabled) {
				res['Market Cap'] = mcap

				if (!data.categories?.[dataType]?.includes('Market Cap')) {
					data.categories[dataType].push('Market Cap')
					data.stackColors[dataType]['Market Cap'] = '#0c5dff'
				}
			}
			if (price && isPriceEnabled) {
				res['Price'] = price
				if (!data.categories?.[dataType]?.includes('Price')) {
					data.categories[dataType].push('Price')
					data.stackColors[dataType]['Price'] = '#ff4e21'
				}
			}

			return res
		})
		.filter((chartItem) => sum(Object.values(omit(chartItem, 'date'))) > 0)

	const pieChartDataAllocation = data.pieChartData?.[dataType]
		?.map((pieChartItem) => {
			if (data?.categoriesBreakdown?.noncirculating?.includes(pieChartItem.name)) {
				if (isTreasuryIncluded) return pieChartItem
				else return null
			}
			if (!selectedCategories.includes(pieChartItem.name)) {
				return null
			}
			return pieChartItem
		})
		.filter(Boolean)
	const unlockedPercent = 100 - (data.meta.totalLocked / data.meta.maxSupply) * 100

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
					<Switch
						label="Include Treasury"
						value="include-treasury"
						onChange={() => setIsTreasuryIncluded((prev) => !prev)}
						help="Include Non-Circulating Supply in the chart."
						checked={isTreasuryIncluded}
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

						{data?.meta?.circSupply ? (
							<div className="flex flex-col items-center">
								<span className="text-[var(--text3)]">Circulating Supply</span>
								<span className="text-lg font-medium">
									{formattedNum(data.meta.circSupply)} {data.tokenPrice.symbol}
								</span>
							</div>
						) : null}

						{data?.meta?.maxSupply ? (
							<div className="flex flex-col items-center">
								<span className="text-[var(--text3)]">Max Supply</span>
								<span className="text-lg font-medium">
									{formattedNum(data.meta.maxSupply)} {data.tokenPrice.symbol}
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
				{data.categories?.[dataType] && data.chartData?.[dataType] && data.stackColors?.[dataType] && (
					<LazyChart className="bg-[var(--cards-bg)] rounded-md min-h-[384px] p-3 relative">
						<div className="absolute right-4 z-10">
							<SelectWithCombobox
								allValues={data.categories[dataType].filter(
									(cat) =>
										!['Market Cap', 'Price'].includes(cat) &&
										!(data.categoriesBreakdown?.noncirculating?.includes(cat) && !isTreasuryIncluded)
								)}
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
								toggleAll={() =>
									setSelectedCategories(
										data.categories[dataType].filter(
											(cat) =>
												!['Market Cap', 'Price'].includes(cat) &&
												!(data.categoriesBreakdown?.noncirculating?.includes(cat) && !isTreasuryIncluded)
										)
									)
								}
								labelType="smol"
								triggerProps={{
									className:
										'flex items-center justify-between gap-2 p-2 text-xs rounded-md cursor-pointer flex-nowrap relative border border-[#E6E6E6] dark:border-[#2F3336] text-[#666] dark:text-[#919296] hover:bg-[var(--link-hover-bg)] focus-visible:bg-[var(--link-hover-bg)] font-medium'
								}}
							/>
						</div>
						<AreaChart
							customYAxis={isPriceEnabled ? ['Market Cap', 'Price'] : []}
							title="Schedule"
							stacks={[...selectedCategories, ...(isPriceEnabled ? ['Market Cap', 'Price'] : [])].filter(Boolean)}
							chartData={chartData}
							hallmarks={data.hallmarks[dataType]}
							stackColors={data.stackColors[dataType]}
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
								chartData={pieChartDataAllocation}
								stackColors={data.stackColors[dataType]}
								usdFormat={false}
								legendPosition={
									!width
										? { left: 'right', orient: 'vertical' }
										: width < 640
										? { left: 'center', top: 'bottom', orient: 'horizontal' }
										: { left: 'right', top: 'center', orient: 'vertical' }
								}
								legendTextStyle={{ fontSize: !width ? 20 : width < 640 ? 12 : 20 }}
							/>
						</LazyChart>
					)}

					{unlockedPercent > 0 && (
						<LazyChart className="relative col-span-full p-3 min-h-[384px] bg-[var(--cards-bg)] rounded-md flex flex-col xl:col-span-1 xl:[&:last-child:nth-child(2n_-_1)]:col-span-full">
							<PieChart
								formatTooltip={({ value, data: { name } }) => `${name}: ${value?.toFixed(2)}%`}
								showLegend
								radius={['50%', '70%']}
								title={`Unlocked ${unlockedPercent.toFixed(2)}%`}
								legendPosition={
									!width
										? { left: 'right', orient: 'vertical' }
										: width < 640
										? { left: 'center', top: 'bottom', orient: 'horizontal' }
										: { left: 'right', top: 'center', orient: 'vertical' }
								}
								legendTextStyle={{ fontSize: !width ? 20 : width < 640 ? 12 : 20 }}
								chartData={[
									{ name: 'Unlocked', value: unlockedPercent },
									{ name: 'Locked', value: 100 - unlockedPercent }
								]}
								stackColors={{ Unlocked: '#0c5dff', Locked: '#ff4e21' }}
								usdFormat={false}
								customLabel={{
									show: true,
									position: 'center',
									fontSize: 16,
									formatter: ({ percent }) => {
										return `${percent.toFixed(0)}%`
									}
								}}
							/>
						</LazyChart>
					)}
				</div>
			</div>

			<div>
				{data.token &&
				Object.entries(data.tokenAllocation?.[dataType]?.current || {}).length &&
				Object.entries(data.tokenAllocation?.[dataType]?.final || {}).length ? (
					<div className="flex flex-col items-center justify-start p-3 w-full bg-[var(--cards-bg)] rounded-md h-full">
						<h1 className="text-center text-xl font-semibold">Token Allocation</h1>
						<div className="flex flex-col text-base gap-2 w-full">
							<h4 style={{ fontSize: '16px' }}>Current</h4>

							<div className="flex justify-between flex-wrap">
								{chunk(Object.entries(data.tokenAllocation[dataType].current)).map((currentChunk) =>
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
								{chunk(Object.entries(data.tokenAllocation[dataType].final)).map((currentChunk) =>
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
					<h1 className="text-center text-xl font-semibold">Upcoming Events</h1>

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
	const { data, isLoading } = useGetProtocolEmissions(protocolName)

	if (isLoading) {
		return <p className="my-[180px] text-center">Loading...</p>
	}

	if (!data) {
		return <p className="my-[180px] text-center"></p>
	}

	return <ChartContainer data={data} />
}
