import { useEffect, useState } from 'react'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
import type { ICommonSearchProps } from '../types'
import { useGetAdaptorsSearchList } from './hooks'
import { useIsClient } from '~/hooks'
import { Select } from '~/components/Select'
import { useFeesFilterState } from '~/components/Filters/useProtocolFilterState'
import { feesOptions } from '~/components/Filters/options'
import { Switch } from '~/components/Switch'

interface IAdaptorSearchProps extends ICommonSearchProps {
	onlyChains?: boolean
	type: string
	onToggleClick?: (enabled: boolean) => void
	toggleStatus?: boolean
	enableToggle?: boolean
}

export function AdaptorsSearch({ type, enableToggle, onToggleClick, toggleStatus, ...props }: IAdaptorSearchProps) {
	const { data, loading } = useGetAdaptorsSearchList(type, props.onlyChains)
	const isClient = useIsClient()

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={
				!isClient ? (
					<></>
				) : enableToggle ? (
					<BreakdownToggle onToggleClick={onToggleClick} toggleStatus={toggleStatus} {...props} />
				) : type === 'fees' ? (
					<FeesToggles />
				) : null
			}
		/>
	)
}

const BreakdownToggle = (props) => {
	const [isToggleEnabled, setIsToggleEnabled] = useState(!!props.toggleStatus)

	useEffect(() => {
		setIsToggleEnabled(props.toggleStatus)
	}, [props.toggleStatus])
	return (
		<ul className="flex items-center justify-end">
			<li className="ml-5 first-of-type:ml-0">
				<Switch
					label="Protocol breakdown"
					value="Protocol breakdown"
					onChange={() => {
						setIsToggleEnabled((prev) => {
							props.onToggleClick(!prev)
							return !prev
						})
						return {} //
					}}
					help="Breakdown charts by protocol"
					checked={isToggleEnabled}
					isLoading={!props.onToggleClick}
				/>
			</li>
		</ul>
	)
}

const FeesToggles = () => {
	const { selectedValues, setSelectedValues } = useFeesFilterState()

	return (
		<>
			<Select
				allValues={feesOptions}
				selectedValues={selectedValues}
				setSelectedValues={setSelectedValues}
				label="Include in Fees"
				triggerProps={{
					className:
						'flex items-center gap-2 py-2 px-3 text-xs rounded-md cursor-pointer flex-nowrap bg-[#E2E2E2] dark:bg-[#181A1C]'
				}}
			/>
		</>
	)
}
