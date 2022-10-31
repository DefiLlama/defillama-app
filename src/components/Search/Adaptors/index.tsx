import { useState } from 'react'
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
}

export default function AdaptorsSearch(props: IAdaptorSearchProps) {
	const [isToggleEnabled, setIsToggleEnabled] = useState(false)
	const { data, loading } = useGetAdaptorsSearchList(props.type, props.onlyChains)

	return (
		<DesktopSearch
			{...props}
			data={data}
			loading={loading}
			filters={
				props.onToggleClick && (
					<ListWrapper>
						<ListItem>
							<OptionToggle
								name="Protocol breakdown"
								toggle={() => {
									setIsToggleEnabled((prev) => {
										props.onToggleClick(!prev)
										return !prev
									})
									return {} //
								}}
								help="Break down charts by protocol"
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
