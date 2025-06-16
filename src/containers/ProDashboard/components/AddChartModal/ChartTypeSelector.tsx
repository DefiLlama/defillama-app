import { useMemo } from 'react'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { LoadingSpinner } from '../LoadingSpinner'
import { reactSelectStyles } from '../../utils/reactSelectStyles'
import { CHART_TYPES } from '../../types'

interface ChartTypeSelectorProps {
	selectedChartType: string
	availableChartTypes: string[]
	chartTypes: string[]
	isLoading: boolean
	onChange: (chartType: string) => void
}

export function ChartTypeSelector({
	selectedChartType,
	availableChartTypes,
	chartTypes,
	isLoading,
	onChange
}: ChartTypeSelectorProps) {
	const chartTypeOptions = useMemo(() => 
		chartTypes
			.filter((key) => availableChartTypes.includes(key))
			.map((key) => ({
				value: key,
				label: CHART_TYPES[key]?.title
			})),
		[chartTypes, availableChartTypes]
	)

	const selectedOption = useMemo(() => 
		chartTypeOptions.find((option) => option.value === selectedChartType),
		[chartTypeOptions, selectedChartType]
	)

	return (
		<div className="mb-4">
			<label className="block mb-2 text-sm font-medium pro-text2">Chart Type</label>
			{isLoading ? (
				<div className="flex items-center justify-center h-10">
					<LoadingSpinner size="sm" />
				</div>
			) : (
				<ReactSelect
					options={chartTypeOptions}
					value={selectedOption}
					onChange={(option: any) => onChange(option.value)}
					placeholder="Select chart type..."
					className="w-full"
					styles={reactSelectStyles}
				/>
			)}
		</div>
	)
}