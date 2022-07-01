import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton } from '~/components/Select/AriakitSelect'
import { Dropdown, Item, Stats } from './shared'

interface IFiltersByChainProps {
	chainList: string[]
	selectedChains: string[]
}

export function FiltersByChain({ chainList = [], selectedChains }: IFiltersByChainProps) {
	const router = useRouter()

	const addChain = (chain) => {
		router.push(
			{
				pathname: '/yields',
				query: {
					...router.query,
					chain
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
				pathname: '/yields',
				query: {
					...router.query,
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
				pathname: '/yields',
				query: {
					...router.query,
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
			</FilterButton>
			<Dropdown state={select}>
				<Input state={combobox} placeholder="Search for chains..." />

				{combobox.matches.length > 0 ? (
					<>
						<Stats>
							<button onClick={clear}>clear</button>

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
			</Dropdown>
		</>
	)
}
