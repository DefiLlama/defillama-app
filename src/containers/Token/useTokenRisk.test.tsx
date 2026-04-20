import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { useTokenRisk } from './useTokenRisk'

vi.mock('@tanstack/react-query', () => ({
	useQuery: vi.fn(() => ({ data: null, error: null, isLoading: false }))
}))

function Probe({ geckoId, candidateKey }: { geckoId: string | null; candidateKey: string | null }) {
	useTokenRisk(geckoId, candidateKey)
	return <div>probe</div>
}

describe('useTokenRisk', () => {
	it('uses a stable token-risk query key and cache settings', () => {
		renderToStaticMarkup(<Probe geckoId="usdc" candidateKey={null} />)

		expect(useQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: ['token-risk', 'usdc', 'all'],
				staleTime: 5 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: false,
				enabled: true
			})
		)
	})
})
