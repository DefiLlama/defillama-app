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

interface IYieldProjectsProps {
	projectList: { name: string; slug: string }[]
	selectedProjects: string[]
	pathname: string
	label?: string
	query?: 'lendingProtocol' | 'farmProtocol'
	variant?: 'primary' | 'secondary'
}

export function YieldProjects({
	projectList = [],
	selectedProjects,
	pathname,
	label,
	query,
	variant = 'primary'
}: IYieldProjectsProps) {
	const router = useRouter()

	const isFarmingProtocolFilter = query === 'farmProtocol'

	const { project, lendingProtocol, farmProtocol, ...queries } = router.query

	const addProject = (project) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: project
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

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const select = useSelectState({
		...selectProps,
		value: selectedProjects,
		setValue: addProject,
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
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: 'All'
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
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const focusItemRef = useRef(null)

	const isSelected = selectedProjects.length > 0 && selectedProjects.length !== projectList.length

	const selectedProjectNames = isSelected
		? selectedProjects.map((project) => projectList.find((p) => p.slug === project)?.name ?? project)
		: []

	return (
		<>
			<SelectButton state={select}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>Project: </span>
								<span data-selecteditems>
									{selectedProjectNames.length > 2
										? `${selectedProjectNames[0]} + ${selectedProjectNames.length - 1} others`
										: selectedProjectNames.join(', ')}
								</span>
							</>
						) : (
							'Project'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>{label || 'Filter by Project'}</span>
						{isSelected && <ItemsSelected>{selectedProjects.length}</ItemsSelected>}
					</>
				)}

				<MenuButtonArrow />
			</SelectButton>

			<ComboboxSelectPopover state={select} modal={!isLarge} composite={false} initialFocusRef={focusItemRef}>
				<Input state={combobox} placeholder="Search for projects..." autoFocus />

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
									ref={i === 0 && selectedProjects.length === projectList.length ? focusItemRef : null}
									focusOnHover
								>
									<span data-name>{projectList.find((p) => p.slug === value)?.name ?? value}</span>
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
