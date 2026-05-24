import type { ChartConfiguration, ChartDataSeries } from '~/containers/LlamaAI/types'
import { adaptCandlestickData } from '~/containers/LlamaAI/utils/chartAdapters/candlestick'
import {
	adaptCartesianChartData,
	createCategoryTooltipFormatter,
	createTimeTooltipFormatter,
	type AdaptedLlamaAICartesianChart,
	type LlamaAICartesianChartProps,
	type LlamaAICartesianDatasetRow,
	type LlamaAICartesianSeriesConfig,
	type LlamaAICartesianSeriesMeta
} from '~/containers/LlamaAI/utils/chartAdapters/cartesian'
import { adaptHBarChartData, type AdaptedHBarChartData } from '~/containers/LlamaAI/utils/chartAdapters/hbar'
import { adaptPieChartData, type AdaptedPieChartData } from '~/containers/LlamaAI/utils/chartAdapters/pie'
import { adaptScatterChartData, type AdaptedScatterChartData } from '~/containers/LlamaAI/utils/chartAdapters/scatter'

export type {
	AdaptedLlamaAICartesianChart,
	LlamaAICartesianChartProps,
	LlamaAICartesianDatasetRow,
	LlamaAICartesianSeriesConfig,
	LlamaAICartesianSeriesMeta
}

export type AdaptedChartData =
	| AdaptedLlamaAICartesianChart
	| AdaptedPieChartData
	| AdaptedScatterChartData
	| AdaptedHBarChartData

export { adaptCandlestickData, createCategoryTooltipFormatter, createTimeTooltipFormatter }

export function adaptChartData(config: ChartConfiguration, rawData: ChartDataSeries): AdaptedChartData {
	switch (config.type) {
		case 'pie':
			return adaptPieChartData(config, rawData)
		case 'scatter':
			return adaptScatterChartData(config, rawData)
		case 'hbar':
			return adaptHBarChartData(config, rawData)
		case 'line':
		case 'area':
		case 'bar':
		case 'combo':
			return adaptCartesianChartData(config, rawData)
		default:
			return adaptCartesianChartData(config, rawData)
	}
}
