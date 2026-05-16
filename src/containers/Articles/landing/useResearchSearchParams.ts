import { useRouter } from 'next/router'
import { useCallback, useMemo } from 'react'

function getQueryParam(value: string | string[] | undefined) {
	return (Array.isArray(value) ? value[0] : value) ?? ''
}

function getPageParam(value: string | string[] | undefined): number {
	const raw = Array.isArray(value) ? value[0] : value
	const parsed = Number(raw)
	return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1
}

export type ResearchSearchQuery = {
	query: string
	tag: string
	section: string
	page: number
}

export function useResearchSearchParams() {
	const router = useRouter()

	const searchQuery = useMemo(
		(): ResearchSearchQuery => ({
			query: getQueryParam(router.query.q).trim(),
			tag: getQueryParam(router.query.tag).trim(),
			section: getQueryParam(router.query.section).trim(),
			page: getPageParam(router.query.page)
		}),
		[router.query.q, router.query.tag, router.query.section, router.query.page]
	)

	const showSearch = router.isReady && Boolean(searchQuery.query || searchQuery.tag || searchQuery.section)

	const clearSearchParams = useCallback(() => {
		void router.replace({ pathname: router.pathname, query: {} }, undefined, { scroll: false })
	}, [router])

	return { searchQuery, showSearch, clearSearchParams }
}
