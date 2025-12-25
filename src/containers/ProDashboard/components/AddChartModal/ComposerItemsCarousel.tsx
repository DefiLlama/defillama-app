import { useMemo, useState } from 'react'
import { Icon } from '~/components/Icon'
import { useProDashboardCatalog } from '../../ProDashboardAPIContext'
import { CHART_TYPES, ChartConfig } from '../../types'
import { ChartPreview } from '../ChartPreview'

interface ComposerItemsCarouselProps {
	composerItems: ChartConfig[]
}

export function ComposerItemsCarousel({ composerItems }: ComposerItemsCarouselProps) {
	const [currentIndex, setCurrentIndex] = useState(0)
	const { getProtocolInfo } = useProDashboardCatalog()

	const validItems = useMemo(
		() => composerItems.filter((item) => item.data && Array.isArray(item.data) && item.data.length > 0),
		[composerItems]
	)

	const handlePrevious = () => {
		setCurrentIndex((prev) => (prev - 1 + validItems.length) % validItems.length)
	}

	const handleNext = () => {
		setCurrentIndex((prev) => (prev + 1) % validItems.length)
	}

	if (validItems.length === 0) {
		return (
			<div className="pro-text3 flex h-full min-h-[150px] items-center justify-center text-center">
				<div>
					<Icon name="bar-chart-2" height={32} width={32} className="mx-auto mb-2" />
					<div className="text-sm">No chart data available</div>
				</div>
			</div>
		)
	}

	const currentItem = validItems[currentIndex]
	const chartType = CHART_TYPES[currentItem.type]
	const itemName = currentItem.protocol
		? getProtocolInfo(currentItem.protocol)?.name || currentItem.protocol
		: currentItem.chain || ''

	return (
		<div className="flex h-full flex-col">
			<div className="flex items-center justify-between px-2 pb-2">
				<div className="flex items-center gap-2">
					<button
						onClick={handlePrevious}
						disabled={validItems.length <= 1}
						className="pro-hover-bg pro-text2 disabled:pro-text3 flex h-6 w-6 items-center justify-center rounded-md text-xs disabled:cursor-not-allowed"
					>
						<Icon name="chevron-left" height={14} width={14} />
					</button>
					<span className="pro-text2 text-xs">
						{currentIndex + 1} / {validItems.length}
					</span>
					<button
						onClick={handleNext}
						disabled={validItems.length <= 1}
						className="pro-hover-bg pro-text2 disabled:pro-text3 flex h-6 w-6 items-center justify-center rounded-md text-xs disabled:cursor-not-allowed"
					>
						<Icon name="chevron-right" height={14} width={14} />
					</button>
				</div>
				<span className="pro-text1 text-xs font-medium">
					{itemName} - {chartType?.title || currentItem.type}
				</span>
			</div>
			<div className="flex-1">
				<ChartPreview
					chartType={currentItem.type}
					data={(currentItem.data || []).map((d) => [typeof d[0] === 'string' ? Number(d[0]) : d[0], d[1]])}
					color={currentItem.color}
					itemName={itemName}
				/>
			</div>
		</div>
	)
}
