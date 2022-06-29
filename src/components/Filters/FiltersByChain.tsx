import * as React from 'react'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { ApplyFilters, Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton } from '~/components/Select/AriakitSelect'
import { Dropdown, Item, Stats } from './shared'

interface IFiltersByChainProps {
	chains: string[]
	setChainsToFilter: React.Dispatch<React.SetStateAction<string[]>>
}

export function FiltersByChain({ chains = [], setChainsToFilter }: IFiltersByChainProps) {
	const combobox = useComboboxState({ list: chains })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox
	const select = useSelectState({
		...selectProps,
		defaultValue: chains,
		gutter: 8
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const filterChains = () => {
		setChainsToFilter(select.value)
	}

	const toggleAll = () => {
		select.setValue(select.value.length === chains.length ? [] : chains)
	}

	return (
		<>
			<FilterButton state={select}>
				Filter by Chain
				<MenuButtonArrow />
			</FilterButton>
			<Dropdown state={select}>
				<Input state={combobox} placeholder="Search..." />

				{combobox.matches.length > 0 ? (
					<>
						<Stats>
							<p>{`${select.value.length} selected`}</p>
							<button onClick={toggleAll}>toggle all</button>
						</Stats>
						<List state={combobox} className="filter-by-list">
							{combobox.matches.map((value, i) => (
								<Item value={value} key={value + i} focusOnHover>
									<span>{value}</span>
									<Checkbox checked={select.value.includes(value) ? true : false} />
								</Item>
							))}
						</List>
					</>
				) : (
					<p id="no-results">No results</p>
				)}

				<ApplyFilters onClick={filterChains}>Apply Filters</ApplyFilters>
			</Dropdown>
		</>
	)
}
