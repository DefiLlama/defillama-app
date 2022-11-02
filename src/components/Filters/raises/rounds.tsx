import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { SelectButton, ComboboxSelectPopover, SelectItem, ItemsSelected, FilterFnsGroup } from '../shared'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IFiltersByRoundsProps {
	rounds: string[]
	selectedRounds: string[]
	pathname: string
}

export function Rounds({ rounds = [], selectedRounds, pathname }: IFiltersByRoundsProps) {
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

	const select = useSelectState({
		...selectProps,
		value: selectedRounds,
		setValue: addRound,
		gutter: 8,
		animated: true,
		renderCallback
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const toggleAll = () => {
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

	const clear = () => {
		select.up(1)
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

	const focusItemRef = useRef(null)

	return (
		<>
			<SelectButton state={select}>
				<span>Filter by Rounds</span>
				<MenuButtonArrow />
				{selectedRounds.length > 0 && selectedRounds.length !== rounds.length && (
					<ItemsSelected>{selectedRounds.length}</ItemsSelected>
				)}
			</SelectButton>
			<ComboboxSelectPopover state={select} modal={!isLarge} composite={false} initialFocusRef={focusItemRef}>
				<Input state={combobox} placeholder="Search for rounds..." autoFocus />

				{combobox.matches.length > 0 ? (
					<>
						<FilterFnsGroup>
							<button onClick={clear}>Clear</button>

							<button onClick={toggleAll}>Toggle all</button>
						</FilterFnsGroup>
						<List state={combobox} className="filter-by-list">
							{combobox.matches.map((value, i) => (
								<SelectItem
									value={value}
									key={value + i}
									ref={i === 0 && selectedRounds.length === rounds.length ? focusItemRef : null}
									focusOnHover
								>
									<span data-name>{value}</span>
									<Checkbox checked={select.value.includes(value) ? true : false} />
								</SelectItem>
							))}
						</List>
					</>
				) : (
					<p id="no-results">No results</p>
				)}
			</ComboboxSelectPopover>
		</>
	)
}
