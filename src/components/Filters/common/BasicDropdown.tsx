import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { SelectButton, ComboboxSelectPopover, ItemsSelected, SecondaryLabel } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { ComboboxSelectContent } from './ComboboxSelectContent'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IFiltersByRoundsProps {
	options: string[]
	selectedOptions: string[]
	pathname: string
	label: string
	urlKey: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function BasicDropdown({
	options = [],
	selectedOptions,
	pathname,
	variant = 'primary',
	label,
	urlKey,
	subMenu
}: IFiltersByRoundsProps) {
	const router = useRouter()

	const { [urlKey]: round, ...queries } = router.query

	const addRound = (newRound) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					[urlKey]: newRound
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: options })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedOptions,
		setValue: addRound,
		gutter: 8,
		animated: true,
		renderCallback
	})

	const toggleAllOptions = () => {
		if (!round || round === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						[urlKey]: 'None'
					}
				},
				undefined,
				{ shallow: true }
			)
		} else {
			router.push(
				{
					pathname,
					query: {
						...queries,
						[urlKey]: 'All'
					}
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const clearAllOptions = () => {
		selectState.up(1)
		router.push(
			{
				pathname,
				query: {
					...queries,
					[urlKey]: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const selectOnlyOne = (option: string) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					[urlKey]: option
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

	const isSelected = selectedOptions.length > 0 && selectedOptions.length !== options.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (round || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label={label} selectState={selectState}>
				<ComboboxSelectContent
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					selectOnlyOne={selectOnlyOne}
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
								<span>${label}: </span>
								<span data-selecteditems>
									{selectedOptions.length > 2
										? `${selectedOptions[0]} + ${selectedOptions.length - 1} others`
										: selectedOptions.join(', ')}
								</span>
							</>
						) : (
							label
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by {label}</span>
						{isSelected && <ItemsSelected>{selectedOptions.length}</ItemsSelected>}
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
					options={options}
					selectedOptions={selectedOptions}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					selectOnlyOne={selectOnlyOne}
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
