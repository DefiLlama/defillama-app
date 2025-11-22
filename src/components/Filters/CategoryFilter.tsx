import React from 'react'
import { useRouter } from 'next/router'
import { SelectWithCombobox } from '../SelectWithCombobox'

export function CategoryFilter({
	categoryList,
	queries,
	selectedCategories
}: {
	categoryList: Array<string>
	queries: {
		[key: string]: string | string[]
	}
	selectedCategories: Array<string>
}) {
	const router = useRouter()

	const clearAllCategories = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					category: 'None'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const toggleAllCategories = () => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					category: 'All'
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const selectOnlyOneCategory = (option: string) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					category: option
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	const selectCategory = (newCategory) => {
		router.push(
			{
				pathname: router.pathname,
				query: {
					...queries,
					category: newCategory
				}
			},
			undefined,
			{ shallow: true }
		)
	}

	return (
		<SelectWithCombobox
			label="Categories"
			allValues={categoryList}
			clearAll={clearAllCategories}
			toggleAll={toggleAllCategories}
			selectOnlyOne={selectOnlyOneCategory}
			selectedValues={selectedCategories}
			setSelectedValues={selectCategory}
			labelType="smol"
			triggerProps={{
				className:
					'flex items-center justify-between gap-2 px-2 py-1.5 text-xs rounded-md cursor-pointer flex-nowrap relative border border-(--form-control-border) text-(--text-form) hover:bg-(--link-hover-bg) focus-visible:bg-(--link-hover-bg) font-medium w-full sm:w-auto'
			}}
		/>
	)
}
