import { CHART_TYPES } from '../types'
import { LoadingSpinner } from './LoadingSpinner'
import { Icon } from '~/components/Icon'
import { lazy, Suspense } from 'react'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart'))

const BarChart = lazy(() => import('~/components/ECharts/BarChart'))

interface ChartPreviewProps {
	data: [number, number][] | undefined
	chartType: string
	isLoading?: boolean
	hasError?: boolean
	itemName: string
}

export function ChartPreview({ data, chartType, isLoading, hasError, itemName }: ChartPreviewProps) {
	const chartTypeDetails = CHART_TYPES[chartType]

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<LoadingSpinner size="sm" />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-(--text3)">
				<Icon name="alert-triangle" height={16} width={16} className="mb-1 text-[#F2994A]" />
				<p className="text-xs">Error loading preview</p>
			</div>
		)
	}

	if (!data || data.length === 0) {
		return (
			<div className="flex items-center justify-center h-full text-(--text3)">
				<p className="text-xs">No data available</p>
			</div>
		)
	}

	if (chartTypeDetails.chartType === 'bar') {
		return (
			<Suspense fallback={<></>}>
				<BarChart
					chartData={data}
					valueSymbol="$"
					height="320px"
					color={chartTypeDetails.color}
					hideDataZoom
					hideDownloadButton
					title=""
					containerClassName="h-[320px]"
				/>
			</Suspense>
		)
	} else {
		return (
			<Suspense fallback={<></>}>
				<AreaChart
					chartData={data}
					valueSymbol="$"
					color={chartTypeDetails.color}
					height="320px"
					hideDataZoom
					hideDownloadButton
					title=""
					containerClassName="h-[320px]"
				/>
			</Suspense>
		)
	}
}
