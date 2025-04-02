import { feesOptions, protocolsAndChainsOptions } from './options'
import { useFeesFilterState, useProtocolsFilterState, useTvlAndFeesFilterState } from './useProtocolFilterState'
import { Select } from '~/components/Select'

interface IProps {
	options?: { name: string; key: string; help?: string }[]
}

export function TabletProtocolsFilters({ options }: IProps) {
	const tvlOptions = options || protocolsAndChainsOptions

	const { selectedValues, setSelectedValues } = useProtocolsFilterState()

	return (
		<Select
			allValues={tvlOptions}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			label="Include in TVL"
			className="2xl:hidden"
		/>
	)
}

export function TabletFeesFilters({ options }: IProps) {
	const { selectedValues, setSelectedValues } = useFeesFilterState()

	return (
		<Select
			allValues={feesOptions}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			label="Include in Fees"
			className="2xl:hidden"
		/>
	)
}

export function TabletTvlAndFeesFilters({ options }: IProps) {
	const { selectedValues, setSelectedValues } = useTvlAndFeesFilterState({ options })

	return (
		<Select
			allValues={options}
			selectedValues={selectedValues}
			setSelectedValues={setSelectedValues}
			label="Include in Stats"
			className="2xl:hidden"
		/>
	)
}
