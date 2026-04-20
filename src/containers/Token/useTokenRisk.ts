import { useQuery } from '@tanstack/react-query'
import { fetchJson } from '~/utils/async'
import type { TokenRiskResponse } from './tokenRisk.types'

async function fetchTokenRisk(geckoId: string, candidateKey: string | null): Promise<TokenRiskResponse> {
	const url = new URL('/api/datasets/token-risk', 'http://localhost')
	url.searchParams.set('geckoId', geckoId)

	if (candidateKey) {
		url.searchParams.set('candidate', candidateKey)
	}

	return fetchJson<TokenRiskResponse>(`${url.pathname}${url.search}`)
}

export function useTokenRisk(geckoId: string | null, candidateKey: string | null) {
	return useQuery({
		queryKey: ['token-risk', geckoId ?? 'unknown', candidateKey ?? 'all'],
		queryFn: () => fetchTokenRisk(geckoId!, candidateKey),
		staleTime: 5 * 60 * 1000,
		refetchOnWindowFocus: false,
		retry: false,
		enabled: Boolean(geckoId)
	})
}
