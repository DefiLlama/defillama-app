import * as React from 'react'
import { MenuButtonArrow, useComboboxState, useMenuState } from 'ariakit'
import styled from 'styled-components'
import { Name } from '~/layout/ProtocolAndPool'
import FormattedName from '~/components/FormattedName'
import { Button as DropdownButton, Popover } from '~/components/DropdownMenu'
import { Item, List } from '~/components/Combobox'
import { useSetPopoverStyles } from '../Popover/utils'
import { Button } from 'ariakit'

const OptionWrapper = styled.div`
	display: flex;
	gap: 10px;
`

interface IProps {
	options: string[]
	selectedChart: string
	onClick: (e: any) => void
}

export function ChartSelector({ options, selectedChart, onClick }: IProps) {
	const defaultList = options

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ defaultList, gutter: 8, animated: true, renderCallback })

	const menu = useMenuState(combobox)

	const onItemClick = (chartType: string) => {
		onClick(chartType)
	}

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue('')
	}

	return (
		<div>
			<DropdownButton state={menu} style={{ fontWeight: 600 }}>
				<Name>
					<FormattedName text={selectedChart} maxCharacters={20} fontSize={'16px'} fontWeight={600} />
				</Name>
				<MenuButtonArrow />
			</DropdownButton>
			<Popover state={menu} composite={false} modal={!isLarge}>
				<List state={combobox}>
					{combobox.matches.map((value, i) => (
						<ChartButtonLink value={value} key={value + i} onItemClick={onItemClick} />
					))}
				</List>
			</Popover>
		</div>
	)
}

const ChartButtonLink = ({ value, onItemClick }) => {
	return (
		<Button onClick={(e) => onItemClick(value)}>
			<Item value={value} focusOnHover setValueOnClick={false} role="link">
				<OptionWrapper>{value}</OptionWrapper>
			</Item>
		</Button>
	)
}
