import { ChartData, DEFAULT_ASSETS_LIST } from '~/utils/liquidations'
import TokenLogo from '~/components/TokenLogo'
import { ProtocolName, Symbol } from '~/components/ProtocolAndPool'
import FormattedName from '~/components/FormattedName'
import styled from 'styled-components'
import { StackBySwitch } from './StackBySwitch'
import React, { useMemo } from 'react'

import { MenuButtonArrow, useComboboxState, useMenuState } from 'ariakit'
import { Button, Popover } from '~/components/DropdownMenu'
import { Input, Item, List } from '~/components/Combobox'
import Link from 'next/link'
import { ISearchItem } from '../Search/BaseSearch'
import { DownloadButton } from './DownloadButton'

const LiquidationsHeaderWrapper = styled.div`
	flex: 1;
	isolation: isolate;
	z-index: 1;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	align-items: center;
	gap: 10px;
	position: relative;
	margin-top: 1rem;

	@media (min-width: 80rem) {
		flex-direction: row;
		align-items: flex-start;
	}
`
const ButtonsGroup = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10px;

	@media (min-width: 80rem) {
		align-items: flex-end;
	}
`

export const LiquidationsHeader = (props: ChartData) => {
	return (
		<LiquidationsHeaderWrapper>
			<AssetSelector symbol={props.symbol} options={DEFAULT_ASSETS_LIST} />
			<ButtonsGroup>
				<StackBySwitch />
				<DownloadButton symbol={props.symbol} />
			</ButtonsGroup>
		</LiquidationsHeaderWrapper>
	)
}

interface IProps {
	options: ISearchItem[]
	symbol: string
}

export function AssetSelector({ options, symbol }: IProps) {
	const defaultList = options.map(({ name, symbol }) => `${name} - ${symbol}`)
	const combobox = useComboboxState({ defaultList, gutter: 8 })
	const menu = useMenuState(combobox)

	// Resets combobox value when menu is closed
	if (!menu.mounted && combobox.value) {
		combobox.setValue('')
	}

	const selectedAsset = useMemo(
		() => options.find((x) => x.symbol.toLowerCase() === symbol.toLowerCase()),
		[symbol, options]
	)

	return (
		<div>
			<Button state={menu} style={{ fontWeight: 600 }}>
				<ProtocolName>
					<TokenLogo logo={selectedAsset.logo} size={24} />
					<FormattedName text={selectedAsset.name} maxCharacters={20} fontWeight={700} />
					<Symbol>({selectedAsset.symbol})</Symbol>
				</ProtocolName>
				<MenuButtonArrow />
			</Button>
			<Popover state={menu} composite={false}>
				<Input state={combobox} placeholder="Search..." />
				{combobox.matches.length > 0 ? (
					<List state={combobox}>
						{combobox.matches.map((value, i) => (
							<AssetButtonLink options={options} value={value} key={value + i} />
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
	return options.find(({ name, symbol }) => `${name} - ${symbol}` === value)
}

const AssetButtonLink = (props: { options: ISearchItem[]; value: string }) => {
	const { options, value } = props
	const matchingOption = getMatchingOption(options, value)
	return (
		<Link href={matchingOption.route} passHref>
			<Item value={value} focusOnHover setValueOnClick={false} role="link">
				<MatchingOptionWrapper>
					<TokenLogo logo={matchingOption.logo} size={20} />
					{matchingOption.name} ({matchingOption.symbol})
				</MatchingOptionWrapper>
			</Item>
		</Link>
	)
}

const MatchingOptionWrapper = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	gap: 10px;
`
