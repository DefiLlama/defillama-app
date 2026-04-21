import { formatChartValue, formatTooltipValue } from '~/components/ECharts/formatters'
import { formattedNum } from '~/utils'
import type { ChartConfig, NumberFormat } from '../chartConfig'

export interface ValueFormatter {
	axis: (value: number) => string
	tooltip: (value: number) => string
	valueSymbol: string
}

export function makeValueFormatter(format: NumberFormat): ValueFormatter {
	switch (format) {
		case 'currency':
			return {
				axis: (v) => formatChartValue(v, '$'),
				tooltip: (v) => formatTooltipValue(v, '$'),
				valueSymbol: '$'
			}
		case 'percent':
			return {
				axis: (v) => formatChartValue(v, '%'),
				tooltip: (v) => formatTooltipValue(v, '%'),
				valueSymbol: '%'
			}
		case 'humanized':
			return {
				axis: (v) => formattedNum(v, false),
				tooltip: (v) => formattedNum(v, false),
				valueSymbol: ''
			}
		case 'auto':
		default:
			return {
				axis: (v) => formatChartValue(v, ''),
				tooltip: (v) => formatTooltipValue(v, ''),
				valueSymbol: ''
			}
	}
}

export function formatterFromConfig(config: ChartConfig): ValueFormatter {
	return makeValueFormatter(config.numberFormat)
}
