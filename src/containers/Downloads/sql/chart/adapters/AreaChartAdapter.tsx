import type { ClassifiedColumn } from '../../columnKind'
import type { ChartConfig } from '../../chartConfig'
import type { QueryResult } from '../../exportResults'
import { LineBarChart } from './LineBarChart'

interface AreaChartAdapterProps {
	config: ChartConfig
	result: QueryResult
	classified: ClassifiedColumn[]
	onReady?: (instance: any) => void
}

export function AreaChartAdapter({ config, result, classified, onReady }: AreaChartAdapterProps) {
	const stackKey = config.chartType === 'areaStacked' || config.chartType === 'areaPct' ? 'area' : undefined
	return (
		<LineBarChart
			config={stackKey ? { ...config, stackMode: config.chartType === 'areaPct' ? 'expand' : 'stacked' } : config}
			result={result}
			classified={classified}
			onReady={onReady}
			forceType="line"
			forceArea
			forceStack={stackKey}
		/>
	)
}
