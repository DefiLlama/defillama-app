import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton } from '~/components/Select/AriakitSelect'
import { Dropdown, Item, Selected, Stats } from '../shared'

interface IFiltersByCategoryProps {
	categoryList: string[]
	selectedCategories: string[]
	pathname: string
}

export function FiltersByCategory({ categoryList = [], selectedCategories, pathname }: IFiltersByCategoryProps) {
	const router = useRouter()

	const { category, ...queries } = router.query

	const addCategory = (newCategory) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					category: newCategory
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: categoryList })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox
	const select = useSelectState({
		...selectProps,
		value: selectedCategories,
		setValue: addCategory,
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
					category: 'All'
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
					category: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<>
			<FilterButton state={select}>
				<span>Filter by Category</span>
				<MenuButtonArrow />
				{selectedCategories.length > 0 && <Selected>{selectedCategories.length}</Selected>}
			</FilterButton>
			<Dropdown state={select}>
				<Input state={combobox} placeholder="Search for category..." />

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
