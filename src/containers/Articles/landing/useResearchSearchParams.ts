import { useRouter } from 'next/router'
import { useCallback, useMemo } from 'react'

function getQueryParam(value: string | string[] | undefined) {
	return (Array.isArray(value) ? value[0] : value) ?? ''
}

export type ResearchSearchQuery = {
	query: string
	tag: string
	section: string
}

export function useResearchSearchParams() {
	const router = useRouter()

	const searchQuery = useMemo(
		(): ResearchSearchQuery => ({
			query: getQueryParam(router.query.q).trim(),
			tag: getQueryParam(router.query.tag).trim(),
			section: getQueryParam(router.query.section).trim()
		}),
		[router.query.q, router.query.tag, router.query.section]
	)

	const showSearch = router.isReady && Boolean(searchQuery.query || searchQuery.tag || searchQuery.section)

	const clearSearchParams = useCallback(() => {
		void router.replace({ pathname: router.pathname, query: {} }, undefined, { scroll: false })
	}, [router])

	return { searchQuery, showSearch, clearSearchParams }
}
