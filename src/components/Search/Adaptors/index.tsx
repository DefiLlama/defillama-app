import { useEffect, useState } from 'react'
import { DesktopFeesFilters } from '~/components/Filters/protocols/Desktop'
import { OptionToggle } from '~/components/OptionToggle'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
import type { ICommonSearchProps } from '../types'
import { useGetAdaptorsSearchList } from './hooks'
import { TabletFeesFilters } from '~/components/Filters/protocols/Tablet'
import { useIsClient } from '~/hooks'

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
		<ul className="flex items-center flex-end">
			<li className="ml-5 first-of-type:ml-0">
				<OptionToggle
					isLoading={!props.onToggleClick}
					name="Protocol breakdown"
					toggle={() => {
						setIsToggleEnabled((prev) => {
							props.onToggleClick(!prev)
							return !prev
						})
						return {} //
					}}
					help="Breakdown charts by protocol"
					enabled={isToggleEnabled}
				/>
			</li>
		</ul>
	)
}

const FeesToggles = () => {
	return (
		<>
			<DesktopFeesFilters options={null} />
			<TabletFeesFilters options={null} />
		</>
	)
}
