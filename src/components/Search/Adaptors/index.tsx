import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { DesktopFeesFilters, ListWrapper } from '~/components/Filters/protocols/Desktop'
import { OptionToggle } from '~/components/OptionToggle'
import { DesktopSearch } from '~/components/Search/Base/Desktop'
import type { ICommonSearchProps } from '../types'
import { useGetAdaptorsSearchList } from './hooks'
import { TabletFeesFilters } from '~/components/Filters/protocols/Tablet'

interface IAdaptorSearchProps extends ICommonSearchProps {
	onlyChains?: boolean
	type: string
	onToggleClick?: (enabled: boolean) => void
	toggleStatus?: boolean
	enableToggle?: boolean
}

export function AdaptorsSearch({ type, enableToggle, ...props }: IAdaptorSearchProps) {
	const { data, loading } = useGetAdaptorsSearchList(type, props.onlyChains)

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={enableToggle ? <BreakdownToggle {...props} /> : type === 'fees' ? <FeesToggles /> : null}
		/>
	)
}

const BreakdownToggle = (props) => {
	const [isToggleEnabled, setIsToggleEnabled] = useState(!!props.toggleStatus)

	useEffect(() => {
		setIsToggleEnabled(props.toggleStatus)
	}, [props.toggleStatus])
	return (
		<ListWrapper>
			<ListItem>
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
			</ListItem>
		</ListWrapper>
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

export const ListItem = styled.li`
	&:not(:first-child) {
		margin-left: 20px;
	}
`
