import { useRouter } from 'next/router'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'

interface IFiltersByCategoryProps {
	categoryList: Array<string>
	selectedCategories: Array<string>
	nestedMenu?: boolean
	labelType?: 'smol' | 'none'
}

export function FiltersByCategory({
	categoryList = [],
	selectedCategories,
	nestedMenu,
	labelType
}: IFiltersByCategoryProps) {
	const router = useRouter()
	const { category } = router.query

	return (
		<SelectWithCombobox
			label="Category"
			allValues={categoryList}
			selectedValues={selectedCategories}
			nestedMenu={nestedMenu}
			labelType={labelType ? labelType : !category || category === 'All' ? 'none' : 'regular'}
			includeQueryKey="category"
			excludeQueryKey="excludeCategory"
		/>
	)
}
