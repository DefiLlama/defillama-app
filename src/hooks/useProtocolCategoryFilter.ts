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
export function useProtocolCategoryFilter<T extends { category?: string | null; childProtocols?: Array<T> }>(
	protocols: Array<T>
): {
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
		const categories = new Set<string>()
		protocols.forEach((protocol) => {
			// get categories for top level protocols
			if (protocol.category) {
				categories.add(protocol.category)
			}
			// get categories for child protocols
			if (protocol.childProtocols && protocol.childProtocols.length > 0) {
				protocol.childProtocols.forEach((childProtocol) => {
					if (childProtocol.category) {
						categories.add(childProtocol.category)
					}
				})
			}
		})
		// turn set into alphabetically sorted array
		return Array.from(categories).sort((a: string, b: string) => a.localeCompare(b))
	}, [protocols])

	// get selected categories from url
	const selectedCategories = useMemo(() => getSelectedCategoryFilters(category, categoryList), [category, categoryList])

	const filterProtocolsByCategory = useCallback(
		(protocolList: Array<T>): T[] => {
			const isInFilter = (protocol: T) => protocol.category && selectedCategories.includes(protocol.category)

			// create a local list with child protocols removed that aren't in the filter
			const formattedProtocolList = protocolList.map((protocol) => {
				if (protocol.childProtocols && protocol.childProtocols.length > 0) {
					// create a copy of the original protocol entry
					const newProtocolEntry = {
						...protocol,
						// add new list of child protocols (excluding child protocols that aren't in the filter)
						childProtocols: protocol.childProtocols.filter((childProtocol) => isInFilter(childProtocol))
					}
					return newProtocolEntry
				} else {
					return protocol
				}
			})

			return formattedProtocolList.filter((protocol) => {
				// check if top level protcol is in filter
				if (isInFilter(protocol)) {
					return true
				}
				// check if any child protocols are in filter
				if (protocol.childProtocols && Array.isArray(protocol.childProtocols)) {
					return protocol.childProtocols.some((childProtocol) => isInFilter(childProtocol))
				}
				return false
			})
		},
		[selectedCategories]
	)

	return {
		categoryList,
		selectedCategories,
		queries,
		filterProtocolsByCategory
	}
}
