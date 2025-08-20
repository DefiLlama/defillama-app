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
			<div className="mb-3 flex items-center justify-between">
				<label className="pro-text2 text-sm font-medium">Select Chart Types</label>
				<div className="flex items-center gap-2">
					{selectedChartTypes.length > 0 && (
						<>
							<button
								onClick={() => onChange([])}
								className="pro-text3 text-xs transition-colors hover:text-(--primary)"
							>
								Clear all
							</button>
							<span className="pro-text2 text-xs font-medium">
								{selectedChartTypes.length} / {chartTypeOptions.length}
							</span>
						</>
					)}
				</div>
			</div>
			<div className="pro-border pro-bg2 flex h-[320px] flex-col border">
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<LoadingSpinner size="sm" />
					</div>
				) : (
					<div className="thin-scrollbar flex-1 overflow-y-auto p-3">
						<div className="grid grid-cols-2 gap-2">
							{chartTypeOptions.map((option) => {
								const isSelected = selectedChartTypes.includes(option.value)
								return (
									<button
										key={option.value}
										onClick={() => handleToggleChart(option.value)}
										className={`flex items-center gap-2 border px-3 py-2.5 transition-all duration-200 ${
											isSelected
												? 'border-(--primary) bg-(--primary)/10 text-(--primary)'
												: 'pro-text2 border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
										}`}
									>
										<div
											className={`flex h-4 w-4 shrink-0 items-center justify-center border-2 transition-all ${
												isSelected ? 'border-(--primary) bg-(--primary)' : 'border-gray-300 dark:border-gray-600'
											}`}
										>
											{isSelected && (
												<svg className="h-2.5 w-2.5 text-white" viewBox="0 0 10 8" fill="none">
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
										<span className="truncate text-xs font-medium">{option.label}</span>
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
