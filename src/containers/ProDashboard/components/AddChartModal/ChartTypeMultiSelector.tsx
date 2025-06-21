import { useMemo } from 'react'
import { LoadingSpinner } from '../LoadingSpinner'
import { CHART_TYPES } from '../../types'

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
			<div className="flex items-center justify-between mb-2">
				<label className="text-sm font-medium pro-text2">Select Chart Types</label>
				{selectedChartTypes.length > 0 && (
					<span className="text-xs pro-text3 bg-[var(--primary1)]/10 text-[var(--primary1)] px-2 py-0.5 rounded-full">
						{selectedChartTypes.length} selected
					</span>
				)}
			</div>
			{isLoading ? (
				<div className="flex items-center justify-center h-10">
					<LoadingSpinner size="sm" />
				</div>
			) : (
				<div className="grid grid-cols-2 gap-2">
					{chartTypeOptions.map((option) => {
						const isSelected = selectedChartTypes.includes(option.value)
						return (
							<button
								key={option.value}
								onClick={() => handleToggleChart(option.value)}
								className={`flex items-center gap-3 px-3 py-2.5 border  transition-all duration-200 ${
									isSelected
										? 'border-[var(--primary1)] bg-[var(--primary1)]/10 text-[var(--primary1)]'
										: 'border-gray-200 dark:border-gray-700 pro-hover-bg pro-text2 hover:border-gray-300 dark:hover:border-gray-600'
								}`}
							>
								<div
									className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
										isSelected
											? 'border-[var(--primary1)] bg-[var(--primary1)]'
											: 'border-gray-300 dark:border-gray-600'
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
								<span className="text-sm font-medium">{option.label}</span>
							</button>
						)
					})}
				</div>
			)}
		</div>
	)
}
