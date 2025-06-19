import dynamic from 'next/dynamic'
import { CHART_TYPES } from '../types'
import { LoadingSpinner } from './LoadingSpinner'
import { Icon } from '~/components/Icon'

const AreaChart = dynamic(() => import('~/components/ECharts/AreaChart'), {
	ssr: false
})

const BarChart = dynamic(() => import('~/components/ECharts/BarChart'), {
	ssr: false
})

const MultiSeriesChart = dynamic(() => import('~/components/ECharts/MultiSeriesChart'), {
	ssr: false
})

const GENERIC_CHART_TYPE_CONFIG: Record<string, { chartType: 'bar' | 'area'; color: string }> = {
	bar: { chartType: 'bar', color: '#4f46e5' },
	area: { chartType: 'area', color: '#16a34a' }
}

interface MultiPlotSeries {
	data: [number, number][]
	chartType: string
	name: string
	color?: string
}

interface ChartPreviewProps {
	data?: [number, number][]
	chartType?: string
	isLoading?: boolean
	hasError?: boolean
	itemName?: string
	customColor?: string
	multiSeries?: MultiPlotSeries[]
	interpreterOutput?: any
	highlights?: any
}

export function ChartPreview({
	data,
	chartType,
	isLoading,
	hasError,
	itemName,
	customColor,
	multiSeries,
	interpreterOutput,
	highlights
}: ChartPreviewProps) {
	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<LoadingSpinner size="sm" />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-[var(--text3)]">
				<Icon name="alert-triangle" height={16} width={16} className="mb-1 text-[#F2994A]" />
				<p className="text-xs">Error loading preview</p>
			</div>
		)
	}

	if (multiSeries && multiSeries.length > 0) {
		const series = multiSeries.map((s) => {
			let color = s.color
			if (!color) {
				const chartTypeDetails = CHART_TYPES[s.chartType]
				if (chartTypeDetails) {
					color = chartTypeDetails.color
				} else if (GENERIC_CHART_TYPE_CONFIG[s.chartType]) {
					color = GENERIC_CHART_TYPE_CONFIG[s.chartType].color
				} else {
					color = GENERIC_CHART_TYPE_CONFIG['bar'].color
				}
			}
			return {
				name: s.name,
				type: s.chartType === 'bar' ? 'bar' : ('line' as 'bar' | 'line'),
				color,
				data: s.data
			}
		})
		return (
			<MultiSeriesChart
				series={series}
				valueSymbol="$"
				height="320px"
				hideDataZoom
				hideDownloadButton
				title=""
				highlights={highlights}
			/>
		)
	}

	if (!data || !chartType || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-[var(--text3)]">
				<p className="text-xs">No data available</p>
			</div>
		)
	}

	let chartTypeDetails = CHART_TYPES[chartType]
	if (!chartTypeDetails) {
		chartTypeDetails = GENERIC_CHART_TYPE_CONFIG[chartType]
	}
	if (!chartTypeDetails) {
		chartTypeDetails = GENERIC_CHART_TYPE_CONFIG['bar']
	}
	const color = customColor || chartTypeDetails.color

	if (chartTypeDetails.chartType === 'bar') {
		return (
			<BarChart
				chartData={data}
				valueSymbol="$"
				height="320px"
				color={color}
				hideDataZoom
				hideDownloadButton
				title=""
				containerClassName="h-[320px]"
			/>
		)
	} else {
		return (
			<AreaChart
				chartData={data}
				valueSymbol="$"
				color={color}
				height="320px"
				hideDataZoom
				hideDownloadButton
				title=""
				containerClassName="h-[320px]"
			/>
		)
	}
}
