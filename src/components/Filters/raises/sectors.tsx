import { useRef } from 'react'
import { useRouter } from 'next/router'
import { Select, SelectArrow, SelectPopover, useSelectState } from 'ariakit/select'
import { useComboboxState } from 'ariakit/combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'
import { ComboboxSelectContent } from '../common/ComboboxSelectContent'

interface IFiltersBySectorsProps {
	sectors: string[]
	selectedSectors: string[]
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function Sectors({
	sectors = [],
	selectedSectors,
	pathname,
	variant = 'primary',
	subMenu
}: IFiltersBySectorsProps) {
	const router = useRouter()

	const { sector, ...queries } = router.query

	const addSector = (newSector) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					sector: newSector
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: sectors })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedSectors,
		setValue: addSector,
		gutter: 8,
		animated: isLarge ? false : true,
		renderCallback
	})

	const toggleAllOptions = () => {
		if (!sector || sector === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						sector: 'None'
					}
				},
				undefined,
				{ shallow: true }
			)
		} else {
			router.push(
				{
					pathname,
					query: {
						...queries,
						sector: 'All'
					}
				},
				undefined,
				{ shallow: true }
			)
		}
	}

	const clearAllOptions = () => {
		selectState.up(1)
		router.push(
			{
				pathname,
				query: {
					...queries,
					sector: 'None'
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
					sector: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	// Resets combobox value when popover is collapsed
	if (!selectState.mounted && combobox.value) {
		combobox.setValue('')
	}

	const focusItemRef = useRef(null)

	const isSelected = selectedSectors.length > 0 && selectedSectors.length !== sectors.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (sector || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label="Sectors" selectState={selectState}>
				<ComboboxSelectContent
					options={sectors}
					selectedOptions={selectedSectors}
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
						<span>Sector: </span>
						<span className="text-[var(--link)]">
							{selectedSectors.length > 2
								? `${selectedSectors[0]} + ${selectedSectors.length - 1} others`
								: selectedSectors.join(', ')}
						</span>
					</>
				) : (
					'Sector'
				)}

				<SelectArrow />
			</Select>

			{selectState.mounted ? (
				<SelectPopover
					state={selectState}
					composite={false}
					initialFocusRef={focusItemRef}
					className="flex flex-col bg-[var(--bg1)] rounded-md z-10 overflow-auto overscroll-contain min-w-[180px] max-h-[60vh] border border-[hsl(204,20%,88%)] dark:border-[hsl(204,3%,32%)] max-sm:drawer"
				>
					<ComboboxSelectContent
						options={sectors}
						selectedOptions={selectedSectors}
						clearAllOptions={clearAllOptions}
						toggleAllOptions={toggleAllOptions}
						selectOnlyOne={selectOnlyOne}
						focusItemRef={focusItemRef}
						variant={variant}
						pathname={pathname}
						autoFocus
						isOptionToggled={isOptionToggled}
						contentElementId={selectState.contentElement?.id}
					/>
				</SelectPopover>
			) : null}
		</>
	)
}
