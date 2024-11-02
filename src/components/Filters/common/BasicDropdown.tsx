import { useRef } from 'react'
import { useRouter } from 'next/router'
import { Select, SelectArrow, SelectPopover, useSelectState } from 'ariakit/select'
import { useComboboxState } from 'ariakit/combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { ComboboxSelectContent } from './ComboboxSelectContent'

interface IFiltersByRoundsProps {
	options: string[]
	selectedOptions: string[]
	pathname: string
	label: string
	urlKey: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
}

export function BasicDropdown({
	options = [],
	selectedOptions,
	pathname,
	variant = 'primary',
	label,
	urlKey
}: IFiltersByRoundsProps) {
	const router = useRouter()

	const { [urlKey]: round, ...queries } = router.query

	const addRound = (newRound) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					[urlKey]: newRound
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const combobox = useComboboxState({ list: options })
	// value and setValue shouldn't be passed to the select state because the
	// select value and the combobox value are different things.
	const { value, setValue, ...selectProps } = combobox

	const [isLarge, renderCallback] = useSetPopoverStyles()

	const selectState = useSelectState({
		...selectProps,
		value: selectedOptions,
		setValue: addRound,
		gutter: 8,
		animated: isLarge ? false : true,
		renderCallback
	})

	const toggleAllOptions = () => {
		if (!round || round === 'All') {
			router.push(
				{
					pathname,
					query: {
						...queries,
						[urlKey]: 'None'
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
						[urlKey]: 'All'
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
					[urlKey]: 'None'
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
					[urlKey]: option
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

	const isSelected = selectedOptions.length > 0 && selectedOptions.length !== options.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (round || []).includes('All')

	return (
		<>
			<Select
				state={selectState}
				className="bg-[var(--btn-bg)] hover:bg-[var(--btn-hover-bg)] focus-visible:bg-[var(--btn-hover-bg)] flex items-center justify-between gap-2 py-2 px-3 rounded-md cursor-pointer text-[var(--text1)] text-xs flex-nowrap"
			>
				{variant === 'secondary' ? (
					<>
						{isSelected ? (
							<>
								<span>${label}: </span>
								<span className="text-[var(--link)]">
									{selectedOptions.length > 2
										? `${selectedOptions[0]} + ${selectedOptions.length - 1} others`
										: selectedOptions.join(', ')}
								</span>
							</>
						) : (
							label
						)}
					</>
				) : (
					<>
						<span>Filter by {label}</span>
						{isSelected ? (
							<span className="absolute -top-1 -right-1 text-[10px] rounded-full min-w-4 bg-[var(--bg4)]">
								{selectedOptions.length}
							</span>
						) : null}
					</>
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
						options={options}
						selectedOptions={selectedOptions}
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
