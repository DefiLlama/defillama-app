import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { SelectButton, ComboboxSelectPopover, ItemsSelected, SecondaryLabel } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { ComboboxSelectContent } from './ComboboxSelectContent'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function FiltersByChain({
	chainList = [],
	selectedChains,
	pathname,
	variant = 'primary',
	subMenu
}: IFiltersByChainProps) {
	const router = useRouter()

	const { chain, ...queries } = router.query

	const addChain = (newChain) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: newChain
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: chainList })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedChains,
		setValue: addChain,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: true })
	})

	const toggleAllOptions = () => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: 'All'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const clearAllOptions = () => {
		selectState.up(1)
		router.push(
			{
				pathname,
				query: {
					...queries,
					chain: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	// Resets combobox value when popover is collapsed
	if (!selectState.mounted && combobox.value) {
		combobox.setValue('')
	}

	const focusItemRef = useRef(null)

	const isSelected = selectedChains.length > 0 && selectedChains.length !== chainList.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (chain || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label="Chains" selectState={selectState}>
				<ComboboxSelectContent
					options={chainList}
					selectedOptions={selectedChains}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					focusItemRef={focusItemRef}
					variant={variant}
					pathname={pathname}
					isOptionToggled={isOptionToggled}
					contentElementId={selectState.contentElement?.id}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<SelectButton state={selectState} data-variant={variant}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>Chain: </span>
								<span data-selecteditems>
									{selectedChains.length > 2
										? `${selectedChains[0]} + ${selectedChains.length - 1} others`
										: selectedChains.join(', ')}
								</span>
							</>
						) : (
							'Chain'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Chain</span>
						{isSelected && <ItemsSelected>{selectedChains.length}</ItemsSelected>}
					</>
				)}

				<MenuButtonArrow />
			</SelectButton>

			<ComboboxSelectPopover
				state={selectState}
				modal={!isLarge}
				composite={false}
				initialFocusRef={focusItemRef}
				data-variant={variant}
			>
				<ComboboxSelectContent
					options={chainList}
					selectedOptions={selectedChains}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					focusItemRef={focusItemRef}
					variant={variant}
					pathname={pathname}
					autoFocus
					isOptionToggled={isOptionToggled}
					contentElementId={selectState.contentElement?.id}
				/>
			</ComboboxSelectPopover>
		</>
	)
}
