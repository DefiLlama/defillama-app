import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { useTokenStrategies } from './useTokenStrategies'

vi.mock('@tanstack/react-query', () => ({
	useQuery: vi.fn(() => ({ data: null, error: null, isLoading: false }))
}))

function Probe({ tokenSymbol }: { tokenSymbol: string }) {
	useTokenStrategies(tokenSymbol)
	return <div>probe</div>
}

describe('useTokenStrategies', () => {
	it('uses a stable token-page query key and shared cache settings', () => {
		renderToStaticMarkup(<Probe tokenSymbol="ETH" />)

		expect(useQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: ['token-strategies', 'token-page', 'ETH'],
				staleTime: 60 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: false,
				enabled: true
			})
		)
	})
})
