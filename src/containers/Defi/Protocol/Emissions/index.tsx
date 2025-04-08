import { chunk, groupBy, omit, sum } from 'lodash'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { useGeckoId, useGetProtocolEmissions, usePriceChart } from '~/api/categories/protocols/client'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { OptionToggle } from '~/components/OptionToggle'
import { UpcomingEvent } from '~/containers/Defi/Protocol/Emissions/UpcomingEvent'
import { TokenLogo } from '~/components/TokenLogo'
import { LazyChart } from '~/components/LazyChart'
import { capitalizeFirstLetter, formattedNum, tokenIconUrl } from '~/utils'
import Pagination from './Pagination'
import { IEmission } from './types'
import { Icon } from '~/components/Icon'

const AreaChart = dynamic(() => import('~/components/ECharts/UnlocksChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export function Emissions({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) {
	return (
		<div className="section-in-grid" id="emissions" style={{ paddingLeft: 0, gridColumn: '1 / -1' }}>
			{!isEmissionsPage && <h3>Emissions</h3>}
			<ChartContainer data={data} isEmissionsPage={isEmissionsPage} />
		</div>
	)
}

const ChartContainer = ({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) => {
	const [dataType, setDataType] = useState<'documented' | 'realtime'>('documented')
	const [isTreasuryIncluded, setIsTreasuryIncluded] = useState(false)
	const [isPriceEnabled, setIsPriceEnabled] = useState(false)
	const { data: geckoId } = useGeckoId(data.token ?? null)

	const priceChart = usePriceChart(data.geckoId ?? geckoId)

	const tokenPrice = priceChart.data?.prices?.[priceChart.data?.prices?.length - 1]?.[1]
	const tokenMcap = priceChart.data?.mcaps?.[priceChart.data?.mcaps?.length - 1]?.[1]
	const tokenVolume = priceChart.data?.volumes?.[priceChart.data?.volumes?.length - 1]?.[1]
	const ystdPrice = priceChart.data?.prices?.[priceChart.data?.prices?.length - 2]?.[1]
	const percentChange = tokenPrice && ystdPrice ? +(((tokenPrice - ystdPrice) / ystdPrice) * 100).toFixed(2) : null
	const normilizePriceChart = Object.fromEntries(
		Object.entries(priceChart.data || {})
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
			return pieChartItem
		})
		.filter(Boolean)
	const unlockedPercent = 100 - (data.meta.totalLocked / data.meta.maxSupply) * 100

	return (
		<>
			<div style={{ display: 'flex', justifyContent: isEmissionsPage ? 'space-between' : 'flex-end' }}>
				{isEmissionsPage ? (
					<h1 className="flex items-center gap-2 text-xl">
						<TokenLogo logo={tokenIconUrl(data.name)} />
						<span>{data.name}</span>
					</h1>
				) : null}
				<div style={{ gap: '8px', display: 'flex', justifyContent: 'flex-end', padding: '8px' }}>
					<OptionToggle
						name="Include Treasury"
						toggle={() => setIsTreasuryIncluded((prev) => !prev)}
						help="Include Non-Circulating Supply in the chart."
						enabled={isTreasuryIncluded}
					/>
					{normilizePriceChart?.prices ? (
						<OptionToggle
							name="Show Price and Market Cap"
							toggle={() => setIsPriceEnabled((prev) => !prev)}
							enabled={isPriceEnabled}
						/>
					) : null}
				</div>
			</div>

			{data?.tokenPrice?.price || data?.meta?.circSupply || data?.meta?.maxSupply ? (
				<div className="flex flex-col items-center p-4 w-full rounded-xl border border-black/10 dark:border-white/10 bg-[var(--bg7)] mb-4">
					<h1 className="text-center text-xl font-medium mb-4">Token Overview</h1>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-center w-full place-content-center">
						{data?.tokenPrice?.price ? (
							<div className="flex flex-col items-center">
								<span className="text-[var(--text3)]">Price</span>
								<div className="flex items-center">
									<span className="text-lg font-medium">${formattedNum(data.tokenPrice.price)}</span>
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
					</div>
				</div>
			) : null}

			{data.chartData?.realtime?.length > 0 && (
				<div className="flex items-center gap-1 p-1 rounded-xl overflow-x-auto w-full max-w-fit bg-[rgba(33,114,229,0.2)] ml-auto">
					<button
						data-active={dataType === 'documented'}
						className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
						onClick={() => setDataType('documented')}
					>
						Documented
					</button>
					<button
						data-active={dataType === 'realtime'}
						className="rounded-xl flex-shrink-0 py-[6px] px-2 data-[active=true]:bg-white/50 dark:data-[active=true]:bg-white/10"
						onClick={() => setDataType('realtime')}
					>
						Realtime
					</button>
				</div>
			)}

			<div className="flex flex-col rounded-xl bg-[var(--bg6)]">
				{data.categories?.[dataType] && data.chartData?.[dataType] && data.stackColors?.[dataType] && (
					<LazyChart>
						<AreaChart
							customYAxis={isPriceEnabled ? ['Market Cap', 'Price'] : []}
							title="Schedule"
							stacks={data.categories[dataType]}
							chartData={chartData}
							hideDefaultLegend
							hallmarks={data.hallmarks[dataType]}
							stackColors={data.stackColors[dataType]}
							isStackedChart
						/>
					</LazyChart>
				)}

				<div className="grid grid-cols-2 ">
					{data.pieChartData?.[dataType] && data.stackColors[dataType] && (
						<LazyChart>
							<PieChart
								showLegend
								title="Allocation"
								chartData={pieChartDataAllocation}
								stackColors={data.stackColors[dataType]}
								usdFormat={false}
							/>
						</LazyChart>
					)}

					{unlockedPercent > 0 && (
						<LazyChart>
							<PieChart
								formatTooltip={({ value, data: { name } }) => `${name}: ${value?.toFixed(2)}%`}
								showLegend
								radius={['50%', '70%']}
								title={`Unlocked ${unlockedPercent.toFixed(2)}%`}
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
				{tokenPrice ? (
					<div
						className="flex flex-col items-center justify-start p-4 w-full rounded-md border border-black/10 dark:border-white/10 bg-[var(--bg7)] h-full"
						style={!isEmissionsPage ? { background: 'none', border: 'none', marginTop: '8px' } : {}}
					>
						<h1 className="text-base text-[var(--text3)] mr-auto">Price</h1>
						<div style={{ alignSelf: 'start', display: 'flex', gap: '6px', textAlign: 'center' }}>
							<h2 className="text-center text-xl font-medium">{tokenPrice ? `$${formattedNum(tokenPrice)}` : 'N/A'}</h2>
							<p
								style={{
									color: percentChange > 0 ? 'rgba(18, 182, 0, 0.7)' : 'rgba(211, 0, 0, 0.7)'
								}}
								className="text-sm mt-1"
							>
								{percentChange > 0 && '+'}
								{percentChange}%
							</p>
						</div>
						<div className="flex flex-col text-base gap-2 mt-2 w-full">
							<p className="flex justify-between flex-wrap">
								<span>Market Cap</span>
								<span className="text-base text-[var(--text3)]">
									{tokenMcap ? `$${formattedNum(tokenMcap)}` : 'N/A'}
								</span>
							</p>
							<hr className="border-black/10 dark:border-white/10" />
							<p className="flex justify-between flex-wrap">
								<span>Volume (24h)</span>
								<span className="text-base text-[var(--text3)]">
									{tokenVolume ? `$${formattedNum(tokenVolume)}` : 'N/A'}
								</span>
							</p>
							{data?.meta?.circSupply ? (
								<>
									<hr className="border-black/10 dark:border-white/10" />
									<p className="flex justify-between flex-wrap">
										<span>Circulating Supply</span>
										<span className="text-base text-[var(--text3)]">{formattedNum(data.meta.circSupply)}</span>
									</p>
								</>
							) : null}
						</div>
					</div>
				) : null}

				{data.token &&
				Object.entries(data.tokenAllocation?.[dataType]?.current || {}).length &&
				Object.entries(data.tokenAllocation?.[dataType]?.final || {}).length ? (
					<div
						className="flex flex-col items-center justify-start p-4 w-full rounded-md border border-black/10 dark:border-white/10 bg-[var(--bg7)] h-full"
						style={!isEmissionsPage ? { background: 'none', border: 'none', marginTop: '8px' } : {}}
					>
						<h1 className="text-center text-xl font-medium">Token Allocation</h1>
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
							<hr className="border-black/10 dark:border-white/10" />

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
				<div
					className="flex flex-col items-center justify-start p-4 w-full rounded-md border border-black/10 dark:border-white/10 bg-[var(--bg7)] h-full"
					style={!isEmissionsPage ? { background: 'none', border: 'none', marginTop: '8px' } : {}}
				>
					<h1 className="text-center text-xl font-medium">Upcoming Events</h1>

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
					<div
						className="flex flex-col items-center justify-start p-4 w-full rounded-md border border-black/10 dark:border-white/10 bg-[var(--bg7)] h-full"
						style={!isEmissionsPage ? { background: 'none', border: 'none', marginTop: '8px' } : {}}
					>
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
					<div
						className="flex flex-col items-center justify-start p-4 w-full rounded-md border border-black/10 dark:border-white/10 bg-[var(--bg7)] h-full"
						style={!isEmissionsPage ? { background: 'none', border: 'none', marginTop: '8px' } : {}}
					>
						<h1 className="text-center text-xl font-medium">Notes</h1>
						<div className="flex flex-col text-base gap-2 w-full">
							{data.notes.map((note) => (
								<p key={note}>{note}</p>
							))}
						</div>
					</div>
				) : null}
				{data.futures?.openInterest || data.futures?.fundingRate ? (
					<div
						className="flex flex-col items-center justify-start p-4 w-full rounded-md border border-black/10 dark:border-white/10 bg-[var(--bg7)] h-full"
						style={!isEmissionsPage ? { background: 'none', border: 'none', marginTop: '8px' } : {}}
					>
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
