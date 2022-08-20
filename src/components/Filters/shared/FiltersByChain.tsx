import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton } from './Base'
import { Dropdown, DropdownItem, ItemsSelected, FilterFnsGroup } from './Dropdown'

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
	const select = useSelectState({
		...selectProps,
		value: selectedChains,
		setValue: addChain,
		gutter: 8
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const toggleAll = () => {
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

	const clear = () => {
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

	return (
		<>
			<FilterButton state={select}>
				<span>Filter by Chain</span>
				<MenuButtonArrow />
				{selectedChains.length > 0 && <ItemsSelected>{selectedChains.length}</ItemsSelected>}
			</FilterButton>
			<Dropdown state={select}>
				<Input state={combobox} placeholder="Search for chains..." />

				{combobox.matches.length > 0 ? (
					<>
						<FilterFnsGroup>
							<button onClick={clear}>clear</button>

							<button onClick={toggleAll}>toggle all</button>
						</FilterFnsGroup>
						<List state={combobox} className="filter-by-list">
							{combobox.matches.map((value, i) => (
								<DropdownItem value={value} key={value + i} focusOnHover>
									<span>{value}</span>
									<Checkbox checked={select.value.includes(value) ? true : false} />
								</DropdownItem>
							))}
						</List>
					</>
				) : (
					<p id="no-results">No results</p>
				)}
			</Dropdown>
		</>
	)
}
