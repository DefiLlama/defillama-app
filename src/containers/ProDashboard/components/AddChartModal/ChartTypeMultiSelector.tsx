import { useMemo } from 'react'
import { CHART_TYPES } from '../../types'
import { LoadingSpinner } from '../LoadingSpinner'

interface ChartTypeMultiSelectorProps {
	selectedChartTypes: string[]
	availableChartTypes: string[]
	chartTypes: string[]
	isLoading: boolean
	onChange: (chartTypes: string[]) => void
}

export function ChartTypeMultiSelector({
	selectedChartTypes,
	availableChartTypes,
	chartTypes,
	isLoading,
	onChange
}: ChartTypeMultiSelectorProps) {
	const chartTypeOptions = useMemo(
		() =>
			chartTypes
				.filter((key) => availableChartTypes.includes(key))
				.map((key) => ({
					value: key,
					label: CHART_TYPES[key]?.title
				})),
		[chartTypes, availableChartTypes]
	)

	const handleToggleChart = (chartType: string) => {
		if (selectedChartTypes.includes(chartType)) {
			onChange(selectedChartTypes.filter((type) => type !== chartType))
		} else {
			onChange([...selectedChartTypes, chartType])
		}
	}

	return (
		<div className="mb-3 md:mb-4">
			<div className="flex items-center justify-between mb-3">
				<label className="text-sm font-medium pro-text2">Select Chart Types</label>
				<div className="flex items-center gap-2">
					{selectedChartTypes.length > 0 && (
						<>
							<button
								onClick={() => onChange([])}
								className="text-xs pro-text3 hover:text-(--primary1) transition-colors"
							>
								Clear all
							</button>
							<span className="text-xs pro-text2 font-medium">
								{selectedChartTypes.length} / {chartTypeOptions.length}
							</span>
						</>
					)}
				</div>
			</div>
			<div className="border pro-border pro-bg2 h-[320px] flex flex-col">
				{isLoading ? (
					<div className="flex items-center justify-center flex-1">
						<LoadingSpinner size="sm" />
					</div>
				) : (
					<div className="flex-1 overflow-y-auto thin-scrollbar p-3">
						<div className="grid grid-cols-2 gap-2">
							{chartTypeOptions.map((option) => {
								const isSelected = selectedChartTypes.includes(option.value)
								return (
									<button
										key={option.value}
										onClick={() => handleToggleChart(option.value)}
										className={`flex items-center gap-2 px-3 py-2.5 border transition-all duration-200 ${
											isSelected
												? 'border-(--primary1) bg-(--primary1)/10 text-(--primary1)'
												: 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 pro-text2'
										}`}
									>
										<div
											className={`w-4 h-4 border-2 flex items-center justify-center transition-all shrink-0 ${
												isSelected ? 'border-(--primary1) bg-(--primary1)' : 'border-gray-300 dark:border-gray-600'
											}`}
										>
											{isSelected && (
												<svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 8" fill="none">
													<path
														d="M1 4L3.5 6.5L9 1"
														stroke="currentColor"
														strokeWidth="2"
														strokeLinecap="round"
														strokeLinejoin="round"
													/>
												</svg>
											)}
										</div>
										<span className="text-xs font-medium truncate">{option.label}</span>
									</button>
								)
							})}
						</div>
					</div>
				)}
			</div>
		</div>
	)
}
