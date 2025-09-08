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
		<div className="flex h-full flex-col">
			<div className="mb-2 flex flex-shrink-0 items-center justify-between">
				<label className="pro-text2 text-xs font-medium">Select Chart Types</label>
				<div className="flex items-center gap-1">
					{selectedChartTypes.length > 0 && (
						<>
							<button
								onClick={() => onChange([])}
								className="pro-text3 hover:text-pro-blue-400 text-[10px] transition-colors"
							>
								Clear
							</button>
							<span className="pro-text2 text-[10px] font-medium">
								{selectedChartTypes.length}/{chartTypeOptions.length}
							</span>
						</>
					)}
				</div>
			</div>
			<div className="flex min-h-0 flex-1 flex-col rounded-md border border-(--cards-border) bg-(--cards-bg)">
				{isLoading ? (
					<div className="flex flex-1 items-center justify-center">
						<LoadingSpinner size="sm" />
					</div>
				) : (
					<div className="thin-scrollbar overflow-y-auto p-2">
						<div className="grid grid-cols-3 gap-1">
							{chartTypeOptions.map((option) => {
								const isSelected = selectedChartTypes.includes(option.value)
								return (
									<button
										key={option.value}
										onClick={() => handleToggleChart(option.value)}
										className={`flex items-center gap-1 rounded-md border px-2 py-1.5 transition-all duration-200 ${
											isSelected
												? 'border-pro-blue-100 bg-pro-blue-300/20 text-pro-blue-400 dark:border-pro-blue-300/20 dark:bg-pro-blue-300/20 dark:text-pro-blue-200'
												: 'pro-border pro-text2 pro-hover-bg hover:pro-text1'
										}`}
										title={option.label}
									>
										<div
											className={`flex h-3 w-3 shrink-0 items-center justify-center border transition-all ${
												isSelected
													? 'border-pro-blue-100 bg-pro-blue-400 dark:border-pro-blue-300/20 dark:bg-pro-blue-300/20'
													: 'pro-border'
											}`}
										>
											{isSelected && (
												<svg className="h-2 w-2 text-white" viewBox="0 0 10 8" fill="none">
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
