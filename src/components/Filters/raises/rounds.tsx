import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { SelectButton, ComboboxSelectPopover, SecondaryLabel } from '../common'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { ComboboxSelectContent } from '../common/ComboboxSelectContent'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IFiltersByRoundsProps {
	rounds: string[]
	selectedRounds: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function Rounds({ rounds = [], selectedRounds, pathname, variant = 'primary', subMenu }: IFiltersByRoundsProps) {
	const router = useRouter()

	const { round, ...queries } = router.query

	const addRound = (newRound) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					round: newRound
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: rounds })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedRounds,
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
						round: 'None'
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
						round: 'All'
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
					round: 'None'
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
					round: option
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

	const isSelected = selectedRounds.length > 0 && selectedRounds.length !== rounds.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (round || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label="Rounds" selectState={selectState}>
				<ComboboxSelectContent
					options={rounds}
					selectedOptions={selectedRounds}
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
								<span>Round: </span>
								<span data-selecteditems>
									{selectedRounds.length > 2
										? `${selectedRounds[0]} + ${selectedRounds.length - 1} others`
										: selectedRounds.join(', ')}
								</span>
							</>
						) : (
							'Round'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Round</span>
						{isSelected ? (
							<span className="absolute -top-1 -right-1 text-[10px] rounded-full p-[2px] min-w-1 bg-[var(--bg4)]">
								{selectedRounds.length}
							</span>
						) : null}
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
					options={rounds}
					selectedOptions={selectedRounds}
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
