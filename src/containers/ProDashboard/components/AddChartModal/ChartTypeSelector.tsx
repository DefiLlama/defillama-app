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
		<div className="selector-container mb-3 md:mb-4">
			<label className="pro-text2 mb-1.5 block text-sm font-medium md:mb-2">Chart Type</label>
			{isLoading ? (
				<div className="flex h-10 items-center justify-center">
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
