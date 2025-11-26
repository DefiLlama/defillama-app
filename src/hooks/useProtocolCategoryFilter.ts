import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'

function getSelectedCategoryFilters(categoryQueryParam: string | string[] | undefined, allCategories: string[]) {
	if (categoryQueryParam) {
		if (typeof categoryQueryParam === 'string') {
			return categoryQueryParam === 'All'
				? [...allCategories]
				: categoryQueryParam === 'None'
					? []
					: [categoryQueryParam]
		} else {
			return [...categoryQueryParam]
		}
	} else return [...allCategories]
}

// using generics to accept IProtocol, IProtocolRow, IFormattedProtocol, etc.
export function useProtocolCategoryFilter<T extends { category?: string | null }>(
	protocols: Array<T>
): {
	filteredProtocols: T[]
	categoryList: string[]
	selectedCategories: string[]
	queries: {
		[key: string]: string | string[]
	}
	filterProtocolsByCategory: (protocols: Array<T>) => T[]
} {
	const router = useRouter()
	const { category, ...queries } = router.query

	// get a unique list of protocols
	const categoryList = useMemo(() => {
		return [...new Set(protocols.map((p) => p.category).filter(Boolean))].sort((a: string, b: string) =>
			a.localeCompare(b)
		) as string[]
	}, [protocols])

	// get selected categories from url
	const selectedCategories = useMemo(() => getSelectedCategoryFilters(category, categoryList), [category, categoryList])

	// filter protocols by selected categories
	const filteredProtocols = useMemo(() => {
		return protocols.filter((protocol) => protocol.category && selectedCategories.includes(protocol.category))
	}, [protocols, selectedCategories])

	// utility method to filter protocols by selected categories
	const filterProtocolsByCategory = useCallback(
		(protocolList: Array<T>): T[] => {
			return protocolList.filter((protocol) => protocol.category && selectedCategories.includes(protocol.category))
		},
		[selectedCategories]
	)

	return {
		filteredProtocols,
		categoryList,
		selectedCategories,
		queries,
		filterProtocolsByCategory
	}
}
