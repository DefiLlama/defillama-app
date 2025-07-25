import { useMemo } from 'react'
import { ReactSelect } from '~/components/MultiSelect/ReactSelect'
import { CHART_TYPES } from '../../types'
import { reactSelectStyles } from '../../utils/reactSelectStyles'
import { LoadingSpinner } from '../LoadingSpinner'

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

	const selectedOption = useMemo(
		() => chartTypeOptions.find((option) => option.value === selectedChartType),
		[chartTypeOptions, selectedChartType]
	)

	function MenuList(props: any) {
		const { children, maxHeight } = props
		return (
			<div className="thin-scrollbar" style={{ maxHeight, overflowY: 'auto' }}>
				{children}
			</div>
		)
	}

	return (
		<div className="mb-3 md:mb-4 selector-container">
			<label className="block mb-1.5 md:mb-2 text-sm font-medium pro-text2">Chart Type</label>
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
					className="w-full text-sm md:text-base"
					styles={reactSelectStyles}
					components={{ MenuList }}
					menuPosition="fixed"
					menuShouldScrollIntoView={false}
				/>
			)}
		</div>
	)
}
