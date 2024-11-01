import { useMemo, useRef } from 'react'
import { useRouter } from 'next/router'
import { useComboboxState } from 'ariakit/combobox'
import { Select, SelectArrow, SelectPopover, useSelectState } from 'ariakit/select'
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
		...(!subMenu && { animated: isLarge ? false : true })
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

	const selectOnlyOne = (option: string) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					...(query && (isFarmingProtocolFilter ? { lendingProtocol } : { farmProtocol })),
					[query || 'project']: option
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
					selectOnlyOne={selectOnlyOne}
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
			<Select
				state={selectState}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap"
			>
				{isSelected ? (
					<>
						<span>{`${label || 'Project'}: `}</span>
						<span className="text-[var(--link)]">
							{selectedProjectNames.length > 2
								? `${selectedProjectNames[0]} + ${selectedProjectNames.length - 1} others`
								: selectedProjectNames.join(', ')}
						</span>
					</>
				) : (
					<span>{`${label || 'Project'}`}</span>
				)}

				<SelectArrow />
			</Select>

			{selectState.mounted ? (
				<SelectPopover
					state={selectState}
					composite={false}
					initialFocusRef={focusItemRef}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-w-xs max-h-[60vh]"
				>
					<ComboboxSelectContent
						options={projectList}
						selectedOptions={selectedProjects}
						clearAllOptions={clearAllOptions}
						toggleAllOptions={toggleAllOptions}
						selectOnlyOne={selectOnlyOne}
						focusItemRef={focusItemRef}
						variant={variant}
						pathname={pathname}
						autoFocus
						isOptionToggled={isOptionToggled}
						contentElementId={selectState.contentElement?.id}
						isSlugValue
					/>
				</SelectPopover>
			) : null}
		</>
	)
}
