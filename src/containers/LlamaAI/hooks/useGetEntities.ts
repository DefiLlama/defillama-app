import { useQuery } from '@tanstack/react-query'
import { SEARCH_API_TOKEN, SEARCH_API_URL } from '~/constants'
import { useDebounce } from '~/hooks/useDebounce'
import { handleSimpleFetchResponse } from '~/utils/async'

export interface EntityResult {
	id: string
	name: string
	logo: string | null
	type: string
}

interface SearchQuery {
	indexUid: string
	limit: number
	offset: number
	q: string
	filter: Array<string | string[]>
}

/**
 * Generic search API helper for DefiLlama multi-search endpoint.
 */
async function searchApi(query: SearchQuery): Promise<EntityResult[]> {
	const response = await fetch(SEARCH_API_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${SEARCH_API_TOKEN}`
		},
		body: JSON.stringify({ queries: [query] })
	})
		.then(handleSimpleFetchResponse)
		.then((res) => res.json())
		.then((res) => res?.results?.[0]?.hits ?? [])

	return response
}

/**
 * Fetch entities (chains, protocols, stablecoins, categories) matching the query.
 */
export async function fetchEntities(query: string): Promise<EntityResult[]> {
	return searchApi({
		indexUid: 'pages',
		limit: 10,
		offset: 0,
		q: query,
		filter: [
			['type = Chain', 'type = Protocol', 'type = Stablecoin', 'type = Category'],
			['deprecated = false', 'NOT deprecated EXISTS'],
			'NOT subName EXISTS'
		]
	})
}

/**
 * Fetch coins/tokens matching the query.
 */
export async function fetchCoins(query: string, limit: number = 10): Promise<EntityResult[]> {
	const hits = await searchApi({
		indexUid: 'pages',
		limit,
		offset: 0,
		q: query,
		filter: [['type = "Token Usage"']]
	})

	// Transform coin results to standard format
	// Use replaceAll to convert all underscores to colons (matching project's ID normalization pattern)
	return hits.map((hit) => ({
		id: hit.id.replaceAll('_', ':'),
		name: hit.name,
		logo: null,
		type: 'Coin'
	}))
}

/**
 * Hook for fetching entities or coins based on trigger character.
 * - @ prefix: fetches entities (chains, protocols, etc.)
 * - $ prefix: fetches coins/tokens
 */
export function useGetEntities(q: string) {
	const debouncedQuery = useDebounce(q, 200)

	const isCoins = debouncedQuery.startsWith('$')
	const isEntities = debouncedQuery.startsWith('@')
	const queryWithoutTrigger = isCoins || isEntities ? debouncedQuery.slice(1) : debouncedQuery
	const isBareTrigger = debouncedQuery === '$' || debouncedQuery === '@'

	return useQuery({
		queryKey: ['get-entities', debouncedQuery],
		queryFn: () => (isCoins ? fetchCoins(queryWithoutTrigger) : fetchEntities(queryWithoutTrigger)),
		// Fetch defaults when user typed a bare trigger (@ / $), otherwise only fetch when there's a query
		enabled: queryWithoutTrigger.length > 0 || isBareTrigger,
		staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
		refetchOnWindowFocus: false
	})
}
