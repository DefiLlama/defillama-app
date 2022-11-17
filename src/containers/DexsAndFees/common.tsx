import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import * as React from 'react'
import { IJSON } from '~/api/categories/adaptors/types'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, PanelHiddenMobile } from '~/components'
import { Denomination, Filters, FiltersWrapper } from '~/components/ECharts/ProtocolChart/ProtocolChart'
import { IBarChartProps } from '~/components/ECharts/types'
import { formattedNum } from '~/utils'
import { IDexChartsProps } from './OverviewItem'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
}) as React.FC<IBarChartProps>

export interface IMainBarChartProps {
	type: string
	total24h: number | null
	change_1d: number | null
	change_1m: number | null
	chartData: IBarChartProps['chartData'] | null
}
export const MainBarChart: React.FC<IDexChartsProps> = (props) => {
	const dataType =
		props.type === 'dexs' || props.type === 'options' || props.type === 'aggregators' ? 'volume' : props.type
	const simpleStack =
		props.chartData[1].includes('Fees') || props.chartData[1].includes('Premium volume')
			? props.chartData[1].reduce((acc, curr) => ({ ...acc, [curr]: curr }), {})
			: undefined

	return (
		<ChartAndValuesWrapper>
			{props.data.total24h || props.data.change_1d || props.data.change_1m ? (
				<BreakpointPanels>
					{!Number.isNaN(props.data.total24h) && (
						<BreakpointPanel>
							<h1>Total {dataType} (24h)</h1>
							<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>
								{formattedNum(props.data.total24h, true)}
							</p>
						</BreakpointPanel>
					)}
					{!Number.isNaN(props.data.change_1d) && (
						<PanelHiddenMobile>
							<h2>Change (24h)</h2>
							{props.data.change_1d > 0 ? (
								<p style={{ '--tile-text-color': '#3cfd99' } as React.CSSProperties}> {props.data.change_1d || 0}%</p>
							) : (
								<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {props.data.change_1d || 0}%</p>
							)}
						</PanelHiddenMobile>
					)}
					{!Number.isNaN(props.data.change_1m) && (
						<PanelHiddenMobile>
							<h2>Change (30d)</h2>
							<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {props.data.change_1m || 0}%</p>
						</PanelHiddenMobile>
					)}
				</BreakpointPanels>
			) : (
				<></>
			)}
			<BreakpointPanel id="chartWrapper">
				{props.brokenDown && props.chartTypes && (
					<Filters color={'blue'}>
						{props.chartTypes.map((dataType) => (
							<Link href={`/options?dataType=${dataType}`} key={dataType} shallow passHref>
								<Denomination active={dataType === props.selectedType}>{dataType}</Denomination>
							</Link>
						))}
					</Filters>
				)}
				{props.chartData && props.chartData.length > 0 && (
					<StackedBarChart
						title=""
						chartData={props.chartData[0]}
						customLegendOptions={props.chartData[1] as string[]}
						stacks={simpleStack}
						hidedefaultlegend={props.brokenDown}
						/* stackColors={stackedBarChartColors} */
					/>
				)}
			</BreakpointPanel>
		</ChartAndValuesWrapper>
	)
}
