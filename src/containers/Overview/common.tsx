import dynamic from 'next/dynamic'
import { BreakpointPanel, BreakpointPanels, ChartAndValuesWrapper, PanelHiddenMobile } from '~/components'
import { IStackedBarChartProps } from '~/components/ECharts/BarChart/Stacked'
import { formattedNum } from '~/utils'

const StackedBarChart = dynamic(() => import('~/components/ECharts/BarChart/Stacked'), {
	ssr: false
}) as React.FC<IStackedBarChartProps>

export interface IMainBarChartProps {
	type: string
	total24h: number | null
	change_1d: number | null
	change_1m: number | null
	chartData: IStackedBarChartProps['chartData'] | null
}
export const MainBarChart: React.FC<IMainBarChartProps> = (props) => {
	const dataType =
		props.type === 'volumes' || props.type === 'options' || props.type === 'aggregators' ? 'volume' : props.type
	return (
		<ChartAndValuesWrapper>
			<BreakpointPanels>
				<BreakpointPanel>
					<h1>Total {dataType} (24h)</h1>
					<p style={{ '--tile-text-color': '#4f8fea' } as React.CSSProperties}>{formattedNum(props.total24h, true)}</p>
				</BreakpointPanel>
				<PanelHiddenMobile>
					<h2>Change (24h)</h2>
					<p style={{ '--tile-text-color': '#fd3c99' } as React.CSSProperties}> {props.change_1d || 0}%</p>
				</PanelHiddenMobile>
				<PanelHiddenMobile>
					<h2>Change (30d)</h2>
					<p style={{ '--tile-text-color': '#46acb7' } as React.CSSProperties}> {props.change_1m || 0}%</p>
				</PanelHiddenMobile>
			</BreakpointPanels>
			<BreakpointPanel id="chartWrapper">
				{props.chartData && props.chartData.length > 0 && <StackedBarChart chartData={props.chartData} />}
			</BreakpointPanel>
		</ChartAndValuesWrapper>
	)
}
