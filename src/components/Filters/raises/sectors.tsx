import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { SelectButton, ComboboxSelectPopover, SelectItem, ItemsSelected, FilterFnsGroup } from '../shared'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IFiltersBySectorsProps {
	sectors: string[]
	selectedSectors: string[]
	pathname: string
}

export function Sectors({ sectors = [], selectedSectors, pathname }: IFiltersBySectorsProps) {
	const router = useRouter()

	const { sector, ...queries } = router.query

	const addSector = (newSector) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					sector: newSector
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: sectors })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		...selectProps,
		value: selectedSectors,
		setValue: addSector,
		gutter: 8,
		animated: true,
		renderCallback
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const toggleAll = () => {
		if (!sector || sector === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						sector: 'None'
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
						sector: 'All'
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
					sector: 'None'
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
				<span>Filter by Sectors</span>
				<MenuButtonArrow />
				{selectedSectors.length > 0 && selectedSectors.length !== sectors.length && (
					<ItemsSelected>{selectedSectors.length}</ItemsSelected>
				)}
			</SelectButton>
			<ComboboxSelectPopover state={select} modal={!isLarge} composite={false} initialFocusRef={focusItemRef}>
				<Input state={combobox} placeholder="Search for sectors..." autoFocus />

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
									ref={i === 0 && selectedSectors.length === sectors.length ? focusItemRef : null}
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
