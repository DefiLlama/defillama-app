import { useRef } from 'react'
import { useRouter } from 'next/router'
import { MenuButtonArrow, useComboboxState, useSelectState } from 'ariakit'
import { ComboboxSelectPopover, ItemsSelected, SelectButton, SecondaryLabel } from '../common'
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

	const { category, ...queries } = router.query

	const addCategory = (newCategory) => {
		router.push(
			{
				pathname,
				query: {
					...queries,
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
			<SelectButton state={selectState} data-variant={variant}>
				{variant === 'secondary' ? (
					<SecondaryLabel>
						{isSelected ? (
							<>
								<span>Category: </span>
								<span data-selecteditems>
									{selectedCategories.length > 2
										? `${selectedCategories[0]} + ${selectedCategories.length - 1} others`
										: selectedCategories.join(', ')}
								</span>
							</>
						) : (
							'Category'
						)}
					</SecondaryLabel>
				) : (
					<>
						<span>Filter by Category</span>
						{isSelected && !hideSelectedCount && <ItemsSelected>{selectedCategories.length}</ItemsSelected>}
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
			</ComboboxSelectPopover>
		</>
	)
}
