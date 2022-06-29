import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { useRouter } from 'next/router'
import { ApplyFilters, Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton, FilterPopover } from '~/components/Select/AriakitSelect'
import { Dropdown, Stats, Item } from '../shared'

interface IYieldProjectsProps {
	projectNameList: string[]
}

export function YieldProjects({ projectNameList }: IYieldProjectsProps) {
	const combobox = useComboboxState({ list: projectNameList })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox
	const select = useSelectState({
		...selectProps,
		defaultValue: projectNameList,
		gutter: 8
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const filterChains = () => {}

	const toggleAll = () => {
		select.setValue(select.value.length === [].length ? [] : projectNameList)
	}

	return (
		<>
			<FilterButton state={select}>
				Filter by Project
				<MenuButtonArrow />
			</FilterButton>
			<FilterPopover state={select}>
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
			</FilterPopover>
		</>
	)
}
