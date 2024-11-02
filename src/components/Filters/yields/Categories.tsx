import { useRef } from 'react'
import { useRouter } from 'next/router'
import { Select, SelectArrow, SelectPopover, useSelectState } from 'ariakit/select'
import { useComboboxState } from 'ariakit/combobox'
import { useSetPopoverStyles } from '~/components/Popover/utils'
import { ComboboxSelectContent } from '../common/ComboboxSelectContent'
import { SlidingMenu } from '~/components/SlidingMenu'

interface IFiltersByCategoryProps {
	categoryList: Array<string>
	selectedCategories: Array<string>
	pathname: string
	variant?: 'primary' | 'secondary'
	subMenu?: boolean
	hideSelectedCount?: boolean
}

export function FiltersByCategory({
	categoryList = [],
	selectedCategories,
	pathname,
	variant = 'primary',
	subMenu,
	hideSelectedCount = false
}: IFiltersByCategoryProps) {
	const router = useRouter()

	const { category, chain, ...queries } = router.query

	const addCategory = (newCategory) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
					...(!pathname.includes('/chains/') && chain ? { chain } : {}),
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

	const selectState = useSelectState({
		...selectProps,
		value: selectedCategories,
		setValue: addCategory,
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
					category: 'All'
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
					category: 'None'
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
					category: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const focusItemRef = useRef(null)

	const isSelected = selectedCategories.length > 0 && selectedCategories.length !== categoryList.length

	const isOptionToggled = (option) =>
		(selectState.value.includes(option) ? true : false) || (category || []).includes('All')

	if (subMenu) {
		return (
			<SlidingMenu label="Categories" selectState={selectState}>
				<ComboboxSelectContent
					options={categoryList}
					selectedOptions={selectedCategories}
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
				{isSelected && !hideSelectedCount ? (
					<>
						<span>Category: </span>
						<span className="text-[var(--link)]">
							{selectedCategories.length > 2
								? `${selectedCategories[0]} + ${selectedCategories.length - 1} others`
								: selectedCategories.join(', ')}
						</span>
					</>
				) : (
					<span>Category</span>
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
						options={categoryList}
						selectedOptions={selectedCategories}
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
