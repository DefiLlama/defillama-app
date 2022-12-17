import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { SelectButton, ComboboxSelectPopover, ItemsSelected, SecondaryLabel } from '../shared'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { SlidingMenu } from '~/components/SlidingMenu'
import { ComboboxSelectContent } from '../shared/ComboboxSelectContent'

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
		animated: true,
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
								<span>Sector: </span>
								<span data-selecteditems>
									{selectedSectors.length > 2
										? `${selectedSectors[0]} + ${selectedSectors.length - 1} others`
										: selectedSectors.join(', ')}
								</span>
							</>
						) : (
							'Sector'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Sector</span>
						{isSelected && <ItemsSelected>{selectedSectors.length}</ItemsSelected>}
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
					options={sectors}
					selectedOptions={selectedSectors}
					clearAllOptions={clearAllOptions}
					toggleAllOptions={toggleAllOptions}
					focusItemRef={focusItemRef}
					variant={variant}
					pathname={pathname}
					autoFocus
					isOptionToggled={isOptionToggled}
					contentElementId={selectState.contentElement?.id}
				/>
			</ComboboxSelectPopover>
		</>
	)
}
