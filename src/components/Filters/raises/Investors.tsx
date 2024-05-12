import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { SelectButton, ComboboxSelectPopover, ItemsSelected, SecondaryLabel } from '../common'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'
import { ComboboxSelectContent } from '../common/ComboboxSelectContent'

interface IFiltersByInvestorProps {
	investors: string[]
	selectedInvestors: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function Investors({
	investors = [],
	selectedInvestors,
	pathname,
	variant = 'primary',
	subMenu
}: IFiltersByInvestorProps) {
	const router = useRouter()

	const { investor, ...queries } = router.query

	const addInvestor = (newInvestor) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					investor: newInvestor
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: investors })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedInvestors,
		setValue: addInvestor,
		gutter: 8,
		animated: true,
		renderCallback
	})

	const toggleAllOptions = () => {
		if (!investor || investor === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						investor: 'None'
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
						investor: 'All'
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
					investor: 'None'
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
					investor: option
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

	const isSelected = selectedInvestors.length > 0 && selectedInvestors.length !== investors.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (investor || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label="Investors" selectState={selectState}>
				<ComboboxSelectContent
					options={investors}
					selectedOptions={selectedInvestors}
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
								<span>Investor: </span>
								<span data-selecteditems>
									{selectedInvestors.length > 2
										? `${selectedInvestors[0]} + ${selectedInvestors.length - 1} others`
										: selectedInvestors.join(', ')}
								</span>
							</>
						) : (
							'Investor'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Investors</span>
						{isSelected && <ItemsSelected>{selectedInvestors.length}</ItemsSelected>}
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
					options={investors}
					selectedOptions={selectedInvestors}
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
