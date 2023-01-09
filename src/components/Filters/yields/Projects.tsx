import { useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { ComboboxSelectPopover, ItemsSelected, SelectButton, SecondaryLabel } from '../common'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { ComboboxSelectContent } from '../common/ComboboxSelectContent'
import { slug } from '~/utils'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IYieldProjectsProps {
	projectList: Array<string>
	selectedProjects: Array<string>
	pathname: string
	label?: string
	query?: 'lendingProtocol' | 'farmProtocol'
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function YieldProjects({
	projectList,
	selectedProjects,
	pathname,
	label,
	query,
	variant = 'primary',
	subMenu
}: IYieldProjectsProps) {
	const router = useRouter()

	const isFarmingProtocolFilter = query === 'farmProtocol'

	const { project, lendingProtocol, farmProtocol, ...queries } = router.query

	const slugs = useMemo(() => projectList.map((p) => slug(p)), [projectList])

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

	const combobox = useComboboxState({ list: slugs })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedProjects,
		setValue: addProject,
		gutter: 8,
		renderCallback,
		...(!subMenu && { animated: true })
	})

	// Resets combobox value when popover is collapsed
	if (!selectState.mounted && combobox.value) {
		combobox.setValue('')
	}

	const toggleAllOptions = () => {
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

	const clearAllOptions = () => {
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
		? selectedProjects.map((project) => projectList.find((p) => slug(p) === project) ?? project)
		: []

	const isOptionToggled = (option) =>
		(selectState.value.includes(slug(option)) ? true : false) || (project || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label={label ? label + 's' : 'Projects'} selectState={selectState}>
				<ComboboxSelectContent
					options={projectList}
					selectedOptions={selectedProjects}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					focusItemRef={focusItemRef}
					variant={variant}
					pathname={pathname}
					isOptionToggled={isOptionToggled}
					contentElementId={selectState.contentElement?.id}
				/>
			</SlidingMenu>
		)
	}

	return (
		<>
			<SelectButton state={selectState} data-variant={variant}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>{`${label || 'Project'}: `}</span>
								<span data-selecteditems>
									{selectedProjectNames.length > 2
										? `${selectedProjectNames[0]} + ${selectedProjectNames.length - 1} others`
										: selectedProjectNames.join(', ')}
								</span>
							</>
						) : (
							`${label || 'Project'}`
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>{label || `Filter by ${label || 'Project'}`}</span>
						{isSelected && <ItemsSelected>{selectedProjects.length}</ItemsSelected>}
					</>
				)}

				<MenuButtonArrow />
			</SelectButton>

			<ComboboxSelectPopover
				state={selectState}
				modal={!isLarge}
				composite={false}
				initialFocusRef={focusItemRef}
				data-variant={variant}
			>
				<ComboboxSelectContent
					options={projectList}
					selectedOptions={selectedProjects}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					focusItemRef={focusItemRef}
					variant={variant}
					pathname={pathname}
					autoFocus
					isOptionToggled={isOptionToggled}
					contentElementId={selectState.contentElement?.id}
					isSlugValue
				/>
			</ComboboxSelectPopover>
		</>
	)
}
