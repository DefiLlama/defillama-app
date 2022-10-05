import { useState } from 'react'
import styled from 'styled-components'
import { ListWrapper } from '~/components/Filters/protocols/Desktop'
import OptionToggle from '~/components/OptionToggle'
import { DesktopSearch } from '../Base'
import type { ICommonSearchProps } from '../types'
import { useGetDexesSearchList } from './hooks'

interface IDexsSearchProps extends ICommonSearchProps {
	onlyChains?: boolean
	onToggleClick?: (enabled: boolean) => void
}

export default function DexsSearch(props: IDexsSearchProps) {
	const [isToggleEnabled, setIsToggleEnabled] = useState(false)
	const { data, loading } = useGetDexesSearchList(props.onlyChains)

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
								name="DEX breakdown"
								toggle={() => {
									setIsToggleEnabled((prev) => {
										props.onToggleClick(!prev)
										return !prev
									})
									return {} //
								}}
								help="Break down charts by DEX"
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
