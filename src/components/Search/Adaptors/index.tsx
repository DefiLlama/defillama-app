import { DesktopSearch } from '~/components/Search/Base/Desktop'
import type { ICommonSearchProps } from '../types'
import { useGetAdaptorsSearchList } from './hooks'
import { Select } from '~/components/Select'
import { useFeesFilterState } from '~/components/Filters/useProtocolFilterState'
import { feesOptions } from '~/components/Filters/options'

interface IAdaptorSearchProps extends ICommonSearchProps {
	onlyChains?: boolean
	type: string
	dataType?: string
}

export function AdaptorsSearch({ type, dataType, ...props }: IAdaptorSearchProps) {
	const { data, loading } = useGetAdaptorsSearchList(type, props.onlyChains)

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={type === 'fees' ? <FeesToggles dataType={dataType} /> : null}
		/>
	)
}

const FeesToggles = ({ dataType }: { dataType?: string }) => {
	const { selectedValues, setSelectedValues } = useFeesFilterState()

	return (
		<>
			<Select
				allValues={feesOptions}
				selectedValues={selectedValues}
				setSelectedValues={setSelectedValues}
				selectOnlyOne={(newOption) => {
					setSelectedValues([newOption])
				}}
				label={`Include in ${
					['dailyRevenue', 'dailyHoldersRevenue', 'dailyEarnings'].includes(dataType) ? 'Revenue' : 'Fees'
				}`}
				triggerProps={{
					className:
						'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C]'
				}}
			/>
		</>
	)
}
