import { Icon } from '~/components/Icon'
import type { ClassifiedColumn } from '../columnKind'
import type { ChartConfig } from '../chartConfig'
import type { QueryResult } from '../exportResults'
import { AreaChartAdapter } from './adapters/AreaChartAdapter'
import { BarChartAdapter } from './adapters/BarChartAdapter'
import { BubbleChartAdapter } from './adapters/BubbleChartAdapter'
import { CandlestickChartAdapter } from './adapters/CandlestickChartAdapter'
import { HBarChartAdapter } from './adapters/HBarChartAdapter'
import { HistogramChartAdapter } from './adapters/HistogramChartAdapter'
import { LineBarChart } from './adapters/LineBarChart'
import { PieChartAdapter } from './adapters/PieChartAdapter'
import { ScatterChartAdapter } from './adapters/ScatterChartAdapter'
import { TreemapChartAdapter } from './adapters/TreemapChartAdapter'

interface ChartRouterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

export function ChartRouter({ config, result, classified, onReady }: ChartRouterProps) {
	const common = { config, result, classified, onReady }
	switch (config.chartType) {
		case 'line':
			return <LineBarChart {...common} forceType="line" />
		case 'bar':
			return <BarChartAdapter {...common} />
		case 'area':
		case 'areaStacked':
		case 'areaPct':
			return <AreaChartAdapter {...common} />
		case 'hbar':
			return <HBarChartAdapter {...common} />
		case 'scatter':
			return <ScatterChartAdapter {...common} />
		case 'bubble':
			return <BubbleChartAdapter {...common} />
		case 'pie':
		case 'donut':
			return <PieChartAdapter {...common} />
		case 'treemap':
			return <TreemapChartAdapter {...common} />
		case 'histogram':
			return <HistogramChartAdapter {...common} />
		case 'candlestick':
			return <CandlestickChartAdapter {...common} />
		default:
			return (
				<div className="flex h-[220px] items-center justify-center gap-2 rounded-md border border-dashed border-(--divider) text-sm text-(--text-secondary)">
					<Icon name="bar-chart-2" className="h-4 w-4" />
					Unknown chart type
				</div>
			)
	}
}
