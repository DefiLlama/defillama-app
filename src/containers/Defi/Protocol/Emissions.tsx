import dynamic from 'next/dynamic'
import styled from 'styled-components'
import type { IChartProps } from '~/components/ECharts/types'
import { Section } from '~/layout/ProtocolAndPool'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
}) as React.FC<IChartProps>

export interface IEmission {
	categories: Array<string>
	chartData: Array<{ [label: string]: number }>
	sources: Array<string>
	notes: Array<string>
	hallmarks: Array<[number, string]>
}

export function Emissions({ data, isEmissionsPage }: { data: IEmission; isEmissionsPage?: boolean }) {
	return (
		<Section id="emissions">
			{!isEmissionsPage && <h3>Emissions</h3>}
			<span style={{ minHeight: '360px' }}>
				<AreaChart
					title=""
					stacks={data.categories}
					chartData={data.chartData}
					hideDefaultLegend
					hallmarks={data.hallmarks}
					isStackedChart
				/>
			</span>

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
