import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { Checkbox } from '~/components'
import { Input, List } from '~/components/Combobox'
import { FilterButton } from '~/components/Select/AriakitSelect'
import { Dropdown, Item, Stats } from '../shared'

interface IYieldProjectsProps {
	projectList: { name: string; slug: string }[]
	selectedProjects: string[]
}

export function YieldProjects({ projectList = [], selectedProjects }: IYieldProjectsProps) {
	const router = useRouter()

	const addProject = (project) => {
		router.push(
			{
				pathname: '/yields',
				query: {
					...router.query,
					project
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: projectList.map((p) => p.slug) })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const select = useSelectState({
		...selectProps,
		value: selectedProjects,
		setValue: addProject,
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
					project: 'All'
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
					project: []
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<>
			<FilterButton state={select}>
				<span>Filter by Project</span>
				<MenuButtonArrow />
			</FilterButton>
			<Dropdown state={select}>
				<Input state={combobox} placeholder="Search..." />

				{combobox.matches.length > 0 ? (
					<>
						<Stats>
							<button onClick={clear}>clear</button>

							<button onClick={toggleAll}>toggle all</button>
						</Stats>
						<List state={combobox} className="filter-by-list">
							{combobox.matches.map((value, i) => (
								<Item value={value} key={value + i} focusOnHover>
									<span>{projectList.find((p) => p.slug === value)?.name ?? value}</span>
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
