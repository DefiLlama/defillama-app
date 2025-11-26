import React from 'react'
import { useRouter } from 'next/router'
import { useProtocolCategoryFilter } from '~/hooks/useProtocolCategoryFilter'
import { SelectWithCombobox } from '../SelectWithCombobox'

// using generics to accept IProtocol, IProtocolRow, IFormattedProtocol, etc.
export function ProtocolCategoryFilter<T extends { category?: string | null }>({ protocols }: { protocols: Array<T> }) {
	const router = useRouter()
	const { categoryList, selectedCategories, queries } = useProtocolCategoryFilter(protocols)

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

	const selectCategory = (newCategory: string[]) => {
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
