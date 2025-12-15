import { lazy, Suspense } from 'react'
import { Icon } from '~/components/Icon'
import { CHART_TYPES } from '../types'
import { LoadingSpinner } from './LoadingSpinner'

const AreaChart = lazy(() => import('~/components/ECharts/AreaChart'))

const BarChart = lazy(() => import('~/components/ECharts/BarChart'))

interface ChartPreviewProps {
	data: [number, number][] | undefined
	chartType: string
	color?: string
	isLoading?: boolean
	hasError?: boolean
	itemName: string
}

export function ChartPreview({ data, chartType, color, isLoading, hasError, itemName }: ChartPreviewProps) {
	const chartTypeDetails = CHART_TYPES[chartType]

	const userMetricTypes = ['users', 'activeUsers', 'newUsers', 'txs', 'gasUsed']
	const percentMetricTypes = ['medianApy']
	const valueSymbol = userMetricTypes.includes(chartType) ? '' : percentMetricTypes.includes(chartType) ? '%' : '$'

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<LoadingSpinner size="sm" />
			</div>
		)
	}

	if (hasError) {
		return (
			<div className="flex h-full flex-col items-center justify-center text-(--text-tertiary)">
				<Icon name="alert-triangle" height={16} width={16} className="mb-1 text-[#F2994A]" />
				<p className="text-xs">Error loading preview</p>
			</div>
		)
	}

	if (!data || data.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-(--text-tertiary)">
				<p className="text-xs">No data available</p>
			</div>
		)
	}

	if (chartTypeDetails.chartType === 'bar') {
		return (
			<Suspense fallback={<></>}>
				<BarChart
					chartData={data}
					valueSymbol={valueSymbol}
					height="240px"
					color={color || chartTypeDetails.color}
					hideDataZoom
					hideDownloadButton
					title=""
					containerClassName="h-[240px]"
				/>
			</Suspense>
		)
	} else {
		return (
			<Suspense fallback={<></>}>
				<AreaChart
					chartData={data}
					valueSymbol={valueSymbol}
					color={color || chartTypeDetails.color}
					height="240px"
					hideDataZoom
					hideDownloadButton
					title=""
					containerClassName="h-[240px]"
				/>
			</Suspense>
		)
	}
}
