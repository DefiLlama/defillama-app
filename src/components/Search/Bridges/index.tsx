import { useState } from 'react'
import styled from 'styled-components'
import { ListWrapper } from '~/components/Filters/protocols/Desktop'
import OptionToggle from '~/components/OptionToggle'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetBridgesSearchList } from './hooks'

interface IBridgesSearchProps extends ICommonSearchProps {
	onlyChains?: boolean
	onToggleClick?: (enabled: boolean) => void
}


interface IBridgesSearchSelectProps extends ICommonSearchProps {
	onlyChains?: boolean
	formValueToEdit?: any
	formProperty: string
	placeholder: string
	click?: (item: string) => void
}

export function BridgesSearch(props: IBridgesSearchProps) {
	const { data, loading } = useGetBridgesSearchList()

	return <DesktopSearch {...props} data={data} loading={loading} />
}

export function BridgesSearchWithBreakdown(props: IBridgesSearchProps) {
	const [isToggleEnabled, setIsToggleEnabled] = useState(false)
	const { data, loading } = useGetBridgesSearchList()

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
								name="Bridge breakdown"
								toggle={() => {
									setIsToggleEnabled((prev) => {
										props.onToggleClick(!prev)
										return !prev
									})
								}}
								help="Break down 'All' volume chart by bridge"
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

export function BridgesSearchSelect(props: IBridgesSearchSelectProps) {
	const { data, loading } = useGetBridgesSearchList()

	const itemClick = (item) => {
		props.formValueToEdit[props.formProperty] = item.name
		props.click(item.name)
	}
	
	return <DesktopSearch {...props} data={data} loading={loading} data-alwaysdisplay={true} placeholder={props.placeholder} onItemClick={itemClick}/>
}

export const ListItem = styled.li`
	&:not(:first-child) {
		margin-left: 20px;
	}
`
