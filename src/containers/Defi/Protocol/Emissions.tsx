import { omit, sum } from 'lodash'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import styled from 'styled-components'
import { useGeckoId, useGetProtocolEmissions, usePriceChart } from '~/api/categories/protocols/client'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import OptionToggle from '~/components/OptionToggle'
import { ChartsWrapper, LazyChart, Section } from '~/layout/ProtocolAndPool'
import { capitalizeFirstLetter, formatUnlocksEvent, formattedNum } from '~/utils'

const AreaChart = dynamic(() => import('~/components/ECharts/UnlocksChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export interface IEmission {
	categories: { documented: Array<string>; realtime: Array<string> }
	categoriesBreakdown: Record<string, string[]>
	chartData: { documented: Array<{ [label: string]: number }>; realtime: Array<{ [label: string]: number }> }
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
}

const MAX_LENGTH_EVENTS_LIST = 5

export function Emissions({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) {
	return (
		<Section id="emissions" style={{ paddingLeft: 0, gridColumn: '1 / -1' }}>
			{!isEmissionsPage && <h3>Emissions</h3>}
			<ChartContainer data={data} isEmissionsPage={isEmissionsPage} />
		</Section>
	)
}
const ChartContainer = ({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) => {
	const [dataType, setDataType] = useState<'documented' | 'realtime'>('documented')
	const [isTreasuryIncluded, setIsTreasuryIncluded] = useState(false)
	const [isPriceEnabled, setIsPriceEnabled] = useState(false)
	const { id: geckoId } = useGeckoId(data.token ?? '')
	const priceChart = usePriceChart(data.geckoId ?? geckoId)

	const normilizePriceChart = Object.fromEntries(
		Object.entries(priceChart.data || {}).map(([name, chart]: [string, Array<[number, number]>]) => [
			name,
			Object.fromEntries((chart || []).map(([date, price]) => [Math.floor(date / 1e3), price]))
		])
	)

	const cutEventsList = !isEmissionsPage && data.events?.length > MAX_LENGTH_EVENTS_LIST
	const styles = isEmissionsPage ? {} : { background: 'none', padding: 0, border: 'none' }
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
					data.stackColors[dataType]['Market Cap'] = '#5ffe21'
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

	const pieChartData = data.pieChartData?.[dataType]
		?.map((pieChartItem) => {
			if (data?.categoriesBreakdown?.noncirculating?.includes(pieChartItem.name)) {
				if (isTreasuryIncluded) return pieChartItem
				else return null
			}
			return pieChartItem
		})
		.filter(Boolean)

	return (
		<>
			<div style={{ gap: '8px', display: 'flex' }}>
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
			{data.chartData?.realtime?.length > 0 && (
				<Filters style={{ marginLeft: 'auto' }}>
					<Denomination as="button" active={dataType === 'documented'} onClick={() => setDataType('documented')}>
						Documented
					</Denomination>
					<Denomination as="button" active={dataType === 'realtime'} onClick={() => setDataType('realtime')}>
						Realtime
					</Denomination>
				</Filters>
			)}

			<ChartsWrapper style={styles}>
				{data.pieChartData?.[dataType] && data.stackColors[dataType] && (
					<LazyChart>
						<PieChart
							title="Allocation"
							chartData={pieChartData}
							stackColors={data.stackColors[dataType]}
							usdFormat={false}
						/>
					</LazyChart>
				)}
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
			</ChartsWrapper>

			{data.tokenAllocation?.[dataType]?.current || data.tokenAllocation?.[dataType]?.final ? (
				<SmolSection>
					<h4>Token Allocation</h4>

					{data.tokenAllocation?.[dataType]?.current && (
						<p>{`Current: ${Object.entries(data.tokenAllocation[dataType].current)
							.map(([cat, perc]) => `${capitalizeFirstLetter(cat)} - ${perc}%`)
							.join(', ')}`}</p>
					)}
					{data.tokenAllocation?.[dataType]?.final && (
						<p>{`Final: ${Object.entries(data.tokenAllocation[dataType].final)
							.map(([cat, perc]) => `${capitalizeFirstLetter(cat)} - ${perc}%`)
							.join(', ')}`}</p>
					)}
				</SmolSection>
			) : null}

			{data.futures?.openInterest || data.futures?.fundingRate ? (
				<SmolSection>
					<h4>Futures</h4>
					{data.futures.openInterest ? <p>{`Open Interest: $${formattedNum(data.futures.openInterest)}`}</p> : null}
					{data.futures.fundingRate ? <p>{`Funding Rate: ${data.futures.fundingRate}%`}</p> : null}
				</SmolSection>
			) : null}

			{data.sources?.length > 0 && (
				<SmolSection>
					<h4>Sources</h4>
					<List>
						{data.sources.map((source) => (
							<li key={source}>
								<a target="_blank" rel="noreferrer noopener" href={source}>
									{source}
								</a>
							</li>
						))}
					</List>
				</SmolSection>
			)}

			{data.notes?.length > 0 && (
				<SmolSection>
					<h4>Notes</h4>
					<List>
						{data.notes.map((note) => (
							<li key={note}>{note}</li>
						))}
					</List>
				</SmolSection>
			)}

			{data.events?.length > 0 && (
				<SmolSection>
					<h4>Events</h4>
					<List>
						{(cutEventsList ? data.events.slice(0, MAX_LENGTH_EVENTS_LIST) : data.events).map((event) => (
							<li key={JSON.stringify(event)}>
								{formatUnlocksEvent({
									description: event.description,
									noOfTokens: event.noOfTokens ?? [],
									timestamp: event.timestamp,
									price: data.tokenPrice.price,
									symbol: data.tokenPrice.symbol
								})}
							</li>
						))}
						{cutEventsList && <li key="more">...</li>}
					</List>
				</SmolSection>
			)}
		</>
	)
}

export const UnlocksCharts = ({ protocolName }: { protocolName: string }) => {
	const { data, loading } = useGetProtocolEmissions(protocolName)

	if (loading) {
		return <p style={{ margin: '180px 0', textAlign: 'center' }}>Loading...</p>
	}

	if (!data) {
		return <p style={{ margin: '180px 0', textAlign: 'center' }}></p>
	}

	return <ChartContainer data={data} />
}

const List = styled.ul`
	margin: 0;
	margin-top: -8px;
	padding: 0;
	list-style: none;
	display: flex;
	flex-direction: column;
	gap: 8px;

	li,
	a {
		overflow-wrap: break-word;
	}

	a {
		text-decoration: underline;
	}
`

const SmolSection = styled.div`
	display: flex;
	flex-direction: column;
	gap: 16px;
	padding: 0 24px;
	margin-bottom: 24px;
`
