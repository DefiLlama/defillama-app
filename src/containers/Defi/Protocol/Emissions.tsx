import dynamic from 'next/dynamic'
import styled from 'styled-components'
import type { IChartProps, IPieChartProps } from '~/components/ECharts/types'
import { ChartsWrapper, LazyChart, Section } from '~/layout/ProtocolAndPool'
import { formatUnlocksEvent } from '~/utils'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

const PieChart = dynamic(() => import('~/components/ECharts/PieChart'), {
	ssr: false
}) as React.FC<IPieChartProps>

export interface IEmission {
	categories: Array<string>
	chartData: Array<{ [label: string]: number }>
	sources: Array<string>
	notes: Array<string>
	events: Array<{ description: string; timestamp: string; noOfTokens: number[] }>
	hallmarks: Array<[number, string]>
	tokenPrice: { price?: number | null; symbol?: string | null }
	pieChartData: Array<{
		name: string
		value: number
	}>
	stackColors: { [stack: string]: string }
}

const MAX_LENGTH_EVENTS_LIST = 5

export function Emissions({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) {
	const cutEventsList = !isEmissionsPage && data.events?.length > MAX_LENGTH_EVENTS_LIST
	return (
		<Section id="emissions" style={{ paddingLeft: 0, gridColumn: '1 / -1' }}>
			{!isEmissionsPage && <h3>Emissions</h3>}

			<ChartsWrapper>
				<LazyChart>
					<PieChart title="Allocation" chartData={data.pieChartData} stackColors={data.stackColors} />
				</LazyChart>

				<LazyChart>
					<AreaChart
						title="Vesting Schedule"
						stacks={data.categories}
						chartData={data.chartData}
						hideDefaultLegend
						hallmarks={data.hallmarks}
						stackColors={data.stackColors}
						isStackedChart
					/>
				</LazyChart>
			</ChartsWrapper>

			{data.sources?.length > 0 && (
				<>
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
				</>
			)}

			{data.notes?.length > 0 && (
				<>
					<h4>Notes</h4>
					<List>
						{data.notes.map((note) => (
							<li key={note}>{note}</li>
						))}
					</List>
				</>
			)}

			{data.events?.length > 0 && (
				<>
					<h4>Events</h4>
					<List>
						{(cutEventsList ? data.events.slice(0, MAX_LENGTH_EVENTS_LIST) : data.events).map((event) => (
							<li key={event.description}>
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
				</>
			)}
		</Section>
	)
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
