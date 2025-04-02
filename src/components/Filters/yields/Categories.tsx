import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersByCategoryProps {
	categoryList: Array<string>
	selectedCategories: Array<string>
	pathname: string
	nestedMenu?: boolean
	smolLabel?: boolean
}

export function FiltersByCategory({
	categoryList = [],
	selectedCategories,
	pathname,
	nestedMenu,
	smolLabel
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

	const toggleAll = () => {
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

	const clearAll = () => {
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

	return (
		<SelectWithCombobox
			label="Category"
			allValues={categoryList}
			selectedValues={selectedCategories}
			setSelectedValues={addCategory}
			toggleAll={toggleAll}
			clearAll={clearAll}
			selectOnlyOne={selectOnlyOne}
			nestedMenu={nestedMenu}
			smolLabel={smolLabel}
		/>
	)
}
