import styled from 'styled-components'
import OptionToggle from '~/components/OptionToggle'
import { useLocalStorageContext, useToggleSetting } from '~/contexts/LocalStorage'

export const ListWrapper = styled.ul`
	display: flex;
	padding: 0;
	list-style: none;
`
export const ListItem = styled.li`
	&:not(:first-child) {
		margin-left: 12px;
	}
`

export function SwitchGroup({ options, ...props }) {
	const toggleSetting = useToggleSetting()
	const [state] = useLocalStorageContext()

	return (
		<ListWrapper {...props}>
			{options.map((option) => (
				<ListItem key={option.key}>
					<OptionToggle {...option} toggle={toggleSetting(option.key)} enabled={state[option.key]} />
				</ListItem>
			))}
		</ListWrapper>
	)
}
