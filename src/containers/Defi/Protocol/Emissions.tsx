import dynamic from 'next/dynamic'
import { useState } from 'react'
import styled from 'styled-components'
import { useGetProtocolEmissions } from '~/api/categories/protocols/client'
import { Denomination, Filters } from '~/components/ECharts/ProtocolChart/Misc'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { ChartsWrapper, LazyChart, Section } from '~/layout/ProtocolAndPool'
import { capitalizeFirstLetter, formatUnlocksEvent, formattedNum } from '~/utils'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export interface IEmission {
	categories: { documented: Array<string>; realtime: Array<string> }
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
	const cutEventsList = !isEmissionsPage && data.events?.length > MAX_LENGTH_EVENTS_LIST
	const styles = isEmissionsPage ? {} : { background: 'none', padding: 0, border: 'none' }

	if (!data) return null

	return (
		<>
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
							chartData={data.pieChartData[dataType]}
							stackColors={data.stackColors[dataType]}
							usdFormat={false}
						/>
					</LazyChart>
				)}
				{data.categories?.[dataType] && data.chartData?.[dataType] && data.stackColors?.[dataType] && (
					<LazyChart>
						<AreaChart
							title="Vesting Schedule"
							stacks={data.categories[dataType]}
							chartData={data.chartData[dataType]}
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
