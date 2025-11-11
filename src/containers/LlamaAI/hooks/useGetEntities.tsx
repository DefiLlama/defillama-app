import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDebounce } from '~/hooks/useDebounce'
import { handleSimpleFetchResponse } from '~/utils/async'

async function fetchEntities(query: string) {
	const response: Array<{ id: string; name: string; logo: string; type: string }> = await fetch(
		'https://search.defillama.com/multi-search',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ee4d49e767f84c0d1c4eabd841e015f02d403e5abf7ea2a523827a46b02d5ad5`
			},
			body: JSON.stringify({
				queries: [
					{
						indexUid: 'pages',
						limit: 10,
						offset: 0,
						q: query,
						filter: [
							['type = Chain', 'type = Protocol', 'type = Stablecoin', 'type = Category'],
							['deprecated = false', 'NOT deprecated EXISTS'],
							'NOT subName EXISTS'
						]
					}
				]
			})
		}
	)
		.then(handleSimpleFetchResponse)
		.then((res) => res.json())
		.then((res) => res?.results?.[0]?.hits ?? [])

	return response
}

export async function fetchCoins(query: string, limit: number = 10) {
	const response: Array<{ id: string; name: string; logo: string; type: string }> = await fetch(
		'https://search.defillama.com/multi-search',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ee4d49e767f84c0d1c4eabd841e015f02d403e5abf7ea2a523827a46b02d5ad5`
			},
			body: JSON.stringify({
				queries: [
					{
						indexUid: 'pages',
						limit,
						offset: 0,
						q: query,
						filter: [['type = "Token Usage"']]
					}
				]
			})
		}
	)
		.then(handleSimpleFetchResponse)
		.then((res) => res.json())
		.then((res) => res?.results?.[0]?.hits ?? [])
		.then((hits) =>
			hits.map((hit) => ({
				id: hit.id.replace('_', ':'),
				name: hit.name,
				logo: null,
				type: 'Coin'
			}))
		)
	return response
}

export function useGetEntities(q: string) {
	const debouncedQuery = useDebounce(q, 200)

	// Check if query starts with $ to determine if we should fetch coins
	const isCoins = debouncedQuery.startsWith('$')
	// Remove $ prefix before making the API call
	const queryWithoutTrigger = isCoins ? debouncedQuery.slice(1) : debouncedQuery

	return useQuery({
		queryKey: ['get-entities', debouncedQuery],
		queryFn: () => (isCoins ? fetchCoins(queryWithoutTrigger) : fetchEntities(queryWithoutTrigger)),
		enabled: queryWithoutTrigger.length > 0, // Only fetch when there's a query (after removing trigger)
		staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
		refetchOnWindowFocus: false
	})
}
