import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { ApplyFilters, Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton } from '~/components/Select/AriakitSelect'
import { Dropdown, Item, Stats } from '../shared'

interface IYieldProjectsProps {
	projectList: string[]
	selectedProjects: string[]
}

export function YieldProjects({ projectList = [], selectedProjects }: IYieldProjectsProps) {
	const router = useRouter()

	const [projects, setProjects] = useState<string[]>([])

	useEffect(() => {
		if (selectedProjects) {
			setProjects(selectedProjects)
		}
	}, [selectedProjects])

	const combobox = useComboboxState({ list: projectList })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const select = useSelectState({
		...selectProps,
		value: projects,
		setValue: (v) => setProjects(v),
		gutter: 8
	})

	// Resets combobox value when popover is collapsed
	if (!select.mounted && combobox.value) {
		combobox.setValue('')
	}

	const filterProjects = () => {
		router.push(
			{
				pathname: '/yields',
				query: {
					...router.query,
					project: select.value.length === projectList.length ? 'All' : select.value
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAll = () => {
		select.setValue(select.value.length === projectList.length ? [] : projectList)
	}

	return (
		<>
			<FilterButton state={select}>
				Filter by Project
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

				<ApplyFilters onClick={filterProjects}>Apply Filters</ApplyFilters>
			</Dropdown>
		</>
	)
}
