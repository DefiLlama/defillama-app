import * as React from 'react'
import { MenuButtonArrow, useComboboxState, useMenuState } from 'ariakit'
import styled from 'styled-components'
import { Name } from '~/layout/ProtocolAndPool'
import { Button, Popover } from '~/components/DropdownMenu'
import { Input, Item, List } from '~/components/Combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import type { ISearchItem } from '~/components/Search/types'
import { Button as AriaButton } from 'ariakit'

interface IProps {
	options: ISearchItem[]
	currentChain: string
	handleClick: React.Dispatch<any>
}

export function BridgeChainSelector({ options, currentChain, handleClick }: IProps) {
	const defaultList = options.map(({ name }) => `${name.toLowerCase()}`)

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ defaultList, gutter: 8, animated: true, renderCallback })

	const menu = useMenuState(combobox)

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue('')
	}

	const selectedAsset = React.useMemo(
		() => options.find((x) => x.name.toLowerCase() === currentChain.toLowerCase()),
		[currentChain, options]
	)

	return (
		<div>
			<Button state={menu}>
				<Name style={{ fontWeight: 400, fontSize: '1rem' }}>{selectedAsset.name}</Name>
				<MenuButtonArrow />
			</Button>
			<Popover state={menu} modal={!isLarge} composite={false}>
				<Input state={combobox} placeholder="Search..." autoFocus />
				{combobox.matches.length > 0 ? (
					<List state={combobox}>
						{combobox.matches.map((value, i) => (
							<ChainButtonLink options={options} value={value} key={value + i} handleClick={handleClick} />
						))}
					</List>
				) : (
					<p id="no-results">No results</p>
				)}
			</Popover>
		</div>
	)
}

const getMatchingOption = (options: ISearchItem[], value: string): ISearchItem => {
	return options.find(({ name }) => `${name.toLowerCase()}` === value)
}

const ChainButtonLink = (props: { options: ISearchItem[]; value: string; handleClick: React.Dispatch<any> }) => {
	const { options, value, handleClick } = props
	const matchingOption = getMatchingOption(options, value)

	return (
		<AriaButton onClick={() => handleClick(matchingOption.name)}>
			<Item value={value} focusOnHover setValueOnClick={false} role="link">
				<MatchingOptionWrapper>{matchingOption.name}</MatchingOptionWrapper>
			</Item>
		</AriaButton>
	)
}

const MatchingOptionWrapper = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10px;
`
