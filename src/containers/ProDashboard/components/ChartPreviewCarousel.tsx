import { useState, useMemo } from 'react'
import { ChartPreview } from './ChartPreview'
import { Icon } from '~/components/Icon'
import { CHART_TYPES } from '../types'

interface ChartPreviewCarouselProps {
	selectedChartTypes: string[]
	chartData: Map<string, any>
	itemName: string
}

export function ChartPreviewCarousel({ selectedChartTypes, chartData, itemName }: ChartPreviewCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0)

	const validCharts = useMemo(
		() => selectedChartTypes.filter((type) => chartData.has(type)),
		[selectedChartTypes, chartData]
	)

	const handlePrevious = () => {
		setCurrentIndex((prev) => (prev - 1 + validCharts.length) % validCharts.length)
	}

	const handleNext = () => {
		setCurrentIndex((prev) => (prev + 1) % validCharts.length)
	}

	if (validCharts.length === 0) {
		return (
			<div className="flex items-center justify-center h-full min-h-[150px] pro-text3 text-center">
				<div>
					<Icon name="bar-chart-2" height={36} width={36} className="mb-1 mx-auto" />
					<div className="text-xs">Select charts to see preview</div>
				</div>
			</div>
		)
	}

	const currentChartType = validCharts[currentIndex]
	const currentChartData = chartData.get(currentChartType)

	return (
		<div className="h-full flex flex-col">
			<div className="flex items-center justify-between px-2 py-1 pro-bg1">
				<button
					onClick={handlePrevious}
					disabled={validCharts.length <= 1}
					className="p-1 pro-hover-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<Icon name="chevron-left" height={20} width={20} />
				</button>
				<div className="text-sm pro-text2 text-center">
					<span className="font-medium">{CHART_TYPES[currentChartType]?.title}</span>
					<span className="ml-2 text-xs pro-text3">
						({currentIndex + 1} of {validCharts.length})
					</span>
				</div>
				<button
					onClick={handleNext}
					disabled={validCharts.length <= 1}
					className="p-1 pro-hover-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				>
					<Icon name="chevron-right" height={20} width={20} />
				</button>
			</div>
			<div className="flex-1 p-2">
				<ChartPreview
					data={currentChartData?.data}
					chartType={currentChartType}
					isLoading={currentChartData?.isLoading}
					hasError={currentChartData?.isError}
					itemName={itemName}
				/>
			</div>
			{validCharts.length > 1 && (
				<div className="flex justify-center gap-1 py-2">
					{validCharts.map((_, index) => (
						<button
							key={index}
							onClick={() => setCurrentIndex(index)}
							className={`w-1.5 h-1.5 rounded-full transition-colors ${
								index === currentIndex ? 'bg-(--primary)' : 'pro-bg3'
							}`}
						/>
					))}
				</div>
			)}
		</div>
	)
}
