import type { IPieChartProps, IScatterChartProps, IMultiSeriesChart2Props } from '~/components/ECharts/types'
import { oldBlue } from '~/constants/colors'
import type { ChartConfiguration } from '~/containers/LlamaAI/types'
import type { AdaptedChartData } from '~/containers/LlamaAI/utils/chartAdapter'
import {
	buildControlsModel,
	type ChartCapabilities,
	type ChartControlsModel,
	type ChartViewState
} from '~/containers/LlamaAI/utils/chartCapabilities'
import { buildExportModel, type ChartExportModel } from '~/containers/LlamaAI/utils/chartExportModel'
import { resolveStylePolicy, type ChartStylePolicy } from '~/containers/LlamaAI/utils/chartStylePolicy'

interface HBarRendererProps {
	categories: string[]
	values: number[]
	valueSymbol?: string
	color?: string
	colors?: string[]
	logos?: string[]
}

interface BaseChartRenderPlan {
	controls: ChartControlsModel
	exportModel: ChartExportModel | null
	stylePolicy: ChartStylePolicy
	hasData: boolean
	filename: string
}

export type ChartRenderPlan =
	| (BaseChartRenderPlan & {
			rendererKind: 'cartesian'
			rendererProps: IMultiSeriesChart2Props
	  })
	| (BaseChartRenderPlan & {
			rendererKind: 'pie'
			rendererProps: IPieChartProps
	  })
	| (BaseChartRenderPlan & {
			rendererKind: 'scatter'
			rendererProps: IScatterChartProps
	  })
	| (BaseChartRenderPlan & {
			rendererKind: 'hbar'
			rendererProps: HBarRendererProps
	  })

function getChartFilename(title: string) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export function buildRenderPlan(
	config: ChartConfiguration,
	adaptedChart: AdaptedChartData,
	state: ChartViewState,
	capabilities: ChartCapabilities
): ChartRenderPlan {
	// Collapse all policy decisions into one renderer-facing object so the React layer
	// only switches on renderer kind and never re-derives chart semantics.
	const stylePolicy = resolveStylePolicy(adaptedChart, state)
	const exportModel = buildExportModel(config, adaptedChart)
	const controls = buildControlsModel(config.title, state, capabilities)
	const filename = getChartFilename(config.title)

	switch (adaptedChart.chartType) {
		case 'cartesian': {
			const usedLegacyMultiSeriesChart =
				adaptedChart.seriesMeta.length > 1 ||
				(adaptedChart.axisType === 'category' &&
					adaptedChart.seriesMeta.length === 1 &&
					adaptedChart.seriesMeta[0]?.baseType === 'bar')

			return {
				rendererKind: 'cartesian',
				rendererProps: {
					...adaptedChart.props,
					solidChartAreaStyle: stylePolicy.solidAreaFill,
					categoryLogos: state.showLabels ? adaptedChart.props.categoryLogos : undefined,
					// Match legacy LlamaAI behavior only for charts that previously rendered through
					// the old MultiSeriesChart component. Other cartesian charts keep MSC2 defaults.
					hideDefaultLegend: usedLegacyMultiSeriesChart ? false : undefined
				},
				controls,
				exportModel,
				stylePolicy,
				hasData: adaptedChart.rowCount > 0 && (adaptedChart.props.charts?.length ?? 0) > 0,
				filename
			}
		}
		case 'pie':
			return {
				rendererKind: 'pie',
				rendererProps: adaptedChart.props as IPieChartProps,
				controls,
				exportModel,
				stylePolicy,
				hasData: (adaptedChart.props.chartData?.length ?? 0) > 0,
				filename
			}
		case 'scatter':
			return {
				rendererKind: 'scatter',
				rendererProps: {
					...(adaptedChart.props as IScatterChartProps),
					height: '360px',
					showLabels: state.showLabels
				},
				controls,
				exportModel,
				stylePolicy,
				hasData: (adaptedChart.props.chartData?.length ?? 0) > 0,
				filename
			}
		case 'hbar':
			return {
				rendererKind: 'hbar',
				rendererProps: {
					categories: adaptedChart.data.map(([category]) => String(category)),
					values: adaptedChart.data.map(([, value]) => value),
					valueSymbol: adaptedChart.props.valueSymbol,
					color: config.series[0]?.styling?.color || oldBlue,
					colors: adaptedChart.props.colors,
					logos: state.showLabels ? adaptedChart.props.logos : undefined
				},
				controls,
				exportModel,
				stylePolicy,
				hasData: adaptedChart.data.length > 0,
				filename
			}
	}
}
