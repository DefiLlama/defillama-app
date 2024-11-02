import * as React from 'react'
import { Combobox, ComboboxItem, ComboboxList, useComboboxState } from 'ariakit/combobox'
import { Menu, MenuButton, MenuButtonArrow, useMenuState } from 'ariakit/menu'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import type { ISearchItem } from '~/components/Search/types'

interface IProps {
	options: ISearchItem[]
	currentChain: string
	handleClick: React.Dispatch<any>
}

export function BridgeChainSelector({ options, currentChain, handleClick }: IProps) {
	const defaultList = options.map(({ name }) => `${name.toLowerCase()}`)

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const combobox = useComboboxState({ defaultList, gutter: 8, animated: isLarge ? false : true, renderCallback })

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
		<>
			<MenuButton
				state={menu}
				className="bg-[var(--btn2-bg)] hover:bg-[var(--btn2-hover-bg)] focus-visible:bg-[var(--btn2-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-lg cursor-pointer text-[var(--text1)] flex-nowrap relative md:min-w-[120px] md:max-w-fit"
			>
				{selectedAsset.name}
				<MenuButtonArrow />
			</MenuButton>
			{menu.mounted ? (
				<Menu
					state={menu}
					composite={false}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<Combobox
						state={combobox}
						placeholder="Search..."
						autoFocus
						className="bg-white dark:bg-black rounded-md py-2 px-3 m-3 mb-0"
					/>
					{combobox.matches.length > 0 ? (
						<ComboboxList state={combobox} className="flex flex-col overflow-auto overscroll-contain">
							{combobox.matches.map((value, i) => (
								<ChainButtonLink options={options} value={value} key={value + i} handleClick={handleClick} />
							))}
						</ComboboxList>
					) : (
						<p className="text-[var(--text1)] py-6 px-3 text-center">No results found</p>
					)}
				</Menu>
			) : null}
		</>
	)
}

const getMatchingOption = (options: ISearchItem[], value: string): ISearchItem => {
	return options.find(({ name }) => `${name.toLowerCase()}` === value)
}

const ChainButtonLink = (props: { options: ISearchItem[]; value: string; handleClick: React.Dispatch<any> }) => {
	const { options, value, handleClick } = props
	const matchingOption = getMatchingOption(options, value)

	return (
		<ComboboxItem
			value={value}
			focusOnHover
			setValueOnClick={false}
			onClick={() => handleClick(matchingOption.name)}
			className="flex items-center gap-1 py-2 px-3 flex-shrink-0 hover:bg-[var(--primary1-hover)] focus-visible:bg-[var(--primary1-hover)] cursor-pointer last-of-type:rounded-b-md border-b border-black/10 dark:border-white/10"
		>
			{matchingOption.name}
		</ComboboxItem>
	)
}
