import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { CHART_TYPES } from '../types'
import { ChartPreview } from './ChartPreview'

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
			<div className="pro-text3 flex h-full min-h-[150px] items-center justify-center text-center">
				<div>
					<Icon name="bar-chart-2" height={36} width={36} className="mx-auto mb-1" />
					<div className="text-xs">Select charts to see preview</div>
				</div>
			</div>
		)
	}

	const currentChartType = validCharts[currentIndex]
	const currentChartData = chartData.get(currentChartType)

	return (
		<div className="flex h-full flex-col">
			<div className="pro-bg1 flex items-center justify-between px-2 py-1">
				<button
					onClick={handlePrevious}
					disabled={validCharts.length <= 1}
					className="pro-hover-bg p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
				>
					<Icon name="chevron-left" height={20} width={20} />
				</button>
				<div className="pro-text2 text-center text-sm">
					<span className="font-medium">{CHART_TYPES[currentChartType]?.title}</span>
					<span className="pro-text3 ml-2 text-xs">
						({currentIndex + 1} of {validCharts.length})
					</span>
				</div>
				<button
					onClick={handleNext}
					disabled={validCharts.length <= 1}
					className="pro-hover-bg p-1 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
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
							className={`h-1.5 w-1.5 rounded-full transition-colors ${
								index === currentIndex ? 'bg-(--primary)' : 'pro-bg3'
							}`}
						/>
					))}
				</div>
			)}
		</div>
	)
}
