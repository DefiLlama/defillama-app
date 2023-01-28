import { useEffect, useState } from 'react'
import styled from 'styled-components'
import { ListWrapper } from '~/components/Filters/protocols/Desktop'
import OptionToggle from '~/components/OptionToggle'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetAdaptorsSearchList } from './hooks'

interface IAdaptorSearchProps extends ICommonSearchProps {
	onlyChains?: boolean
	type: string
	onToggleClick?: (enabled: boolean) => void
	toggleStatus?: boolean
	enableToggle?: boolean
}

export default function AdaptorsSearch(props: IAdaptorSearchProps) {
	const [isToggleEnabled, setIsToggleEnabled] = useState(!!props.toggleStatus)
	const { data, loading } = useGetAdaptorsSearchList(props.type, props.onlyChains)

	useEffect(() => {
		setIsToggleEnabled(props.toggleStatus)
	}, [props.toggleStatus])

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={
				props.enableToggle && (
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
						<ListItem></ListItem>
					</ListWrapper>
				)
			}
		/>
	)
}

export const ListItem = styled.li`
	&:not(:first-child) {
		margin-left: 20px;
	}
`
