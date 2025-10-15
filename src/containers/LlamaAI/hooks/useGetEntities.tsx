import { useQuery } from '@tanstack/react-query'
import { handleSimpleFetchResponse } from '~/utils/async'

export function useGetEntities(q: string) {
	return useQuery({
		queryKey: ['get-entities', q],
		queryFn: async () => {
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
								q,
								filter: [
									['type = Chain', 'type = Protocol', 'type = Stablecoin'],
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
		},
		enabled: q.length > 0, // Only fetch when there's a query
		staleTime: 5 * 60 * 1000, // Cache results for 5 minutes
		refetchOnWindowFocus: false
	})
}
