import { useRouter } from 'next/router'
import { useRef } from 'react'
import { SelectWithCombobox } from '~/components/SelectWithCombobox'
import { trackYieldsEvent, YIELDS_EVENTS } from '~/utils/analytics/yields'

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
	const prevSelectionRef = useRef<Set<string>>(new Set(selectedCategories))

	return (
		<SelectWithCombobox
			label="Category"
			allValues={categoryList}
			selectedValues={selectedCategories}
			nestedMenu={nestedMenu}
			labelType={labelType ? labelType : !category || category === 'All' ? 'none' : 'regular'}
			includeQueryKey="category"
			excludeQueryKey="excludeCategory"
			onValuesChange={(values) => {
				const prevSet = prevSelectionRef.current
				values.forEach((category) => {
					if (!prevSet.has(category)) {
						trackYieldsEvent(YIELDS_EVENTS.FILTER_CATEGORY, { category })
					}
				})
				prevSelectionRef.current = new Set(values)
			}}
		/>
	)
}
