import * as React from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { ApplyFilters, Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton } from '~/components/Select/AriakitSelect'
import { Dropdown, Item, Stats } from './shared'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
}

export function FiltersByChain({ chainList = [], selectedChains }: IFiltersByChainProps) {
	const router = useRouter()

	const combobox = useComboboxState({ list: chainList })

	const [chains, setChains] = React.useState<string[]>([])

	React.useEffect(() => {
		if (selectedChains) {
			setChains(selectedChains)
		}
	}, [selectedChains])

	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox
	const select = useSelectState({
		...selectProps,
		value: chains,
		setValue: (v) => setChains(v),
		gutter: 8
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const filterChains = () => {
		router.push(
			{
				pathname: '/yields',
				query: {
					...router.query,
					chain: select.value.length === chainList.length ? 'All' : select.value
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAll = () => {
		select.setValue(select.value.length === chainList.length ? [] : chainList)
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
