import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { SelectButton, ComboboxSelectPopover, SelectItem, ItemsSelected, FilterFnsGroup } from './Base'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
	pathname: string
}

export function FiltersByChain({ chainList = [], selectedChains, pathname }: IFiltersByChainProps) {
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

	const select = useSelectState({
		...selectProps,
		value: selectedChains,
		setValue: addChain,
		gutter: 8,
		animated: true,
		renderCallback
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const toggleAll = () => {
		if (!chain || chain === 'All') {
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
		} else {
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
	}

	const clear = () => {
		select.up(1)
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

	const focusItemRef = useRef(null)

	return (
		<>
			<SelectButton state={select}>
				<span>Filter by Chain</span>
				<MenuButtonArrow />
				{selectedChains.length > 0 && selectedChains.length !== chainList.length && (
					<ItemsSelected>{selectedChains.length}</ItemsSelected>
				)}
			</SelectButton>
			<ComboboxSelectPopover state={select} modal={!isLarge} composite={false} initialFocusRef={focusItemRef}>
				<Input state={combobox} placeholder="Search for chains..." autoFocus />

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
									ref={i === 0 && selectedChains.length === chainList.length ? focusItemRef : null}
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
