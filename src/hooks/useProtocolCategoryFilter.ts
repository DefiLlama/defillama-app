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
			const final: T[] = []

			for (const protocol of protocolList) {
				if (protocol.childProtocols) {
					const childProtocols = protocol.childProtocols.filter(
						(childProtocol) => childProtocol.category && selectedCategories.includes(childProtocol.category)
					)

					if (childProtocols.length === protocol.childProtocols.length) {
						final.push(protocol)
					} else {
						for (const childProtocol of childProtocols) {
							final.push(childProtocol)
						}
					}

					continue
				}

				if (protocol.category && selectedCategories.includes(protocol.category)) {
					final.push(protocol)
					continue
				}
			}

			return final
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
