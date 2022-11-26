import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import {
	ComboboxSelectPopover,
	SelectItem,
	ItemsSelected,
	FilterFnsGroup,
	SelectButton,
	SecondaryLabel
} from '../shared'
import { useSetPopoverStyles } from '~/components/Popover/utils'

interface IFiltersByCategoryProps {
	categoryList: string[]
	selectedCategories: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
}

export function FiltersByCategory({
	categoryList = [],
	selectedCategories,
	pathname,
	variant = 'primary'
}: IFiltersByCategoryProps) {
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

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		...selectProps,
		value: selectedCategories,
		setValue: addCategory,
		gutter: 8,
		animated: true,
		renderCallback
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

	const focusItemRef = useRef(null)

	const isSelected = selectedCategories.length > 0 && selectedCategories.length !== categoryList.length

	return (
		<>
			<SelectButton state={select}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>Category: </span>
								<span data-selecteditems>
									{selectedCategories.length > 2
										? `${selectedCategories[0]} + ${selectedCategories.length - 1} others`
										: selectedCategories.join(', ')}
								</span>
							</>
						) : (
							'Category'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Category</span>
						{isSelected && <ItemsSelected>{selectedCategories.length}</ItemsSelected>}
					</>
				)}

				<MenuButtonArrow />
			</SelectButton>

			<ComboboxSelectPopover state={select} modal={!isLarge} composite={false} initialFocusRef={focusItemRef}>
				<Input state={combobox} placeholder="Search for category..." autoFocus />

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
									ref={i === 0 && selectedCategories.length === categoryList.length ? focusItemRef : null}
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
