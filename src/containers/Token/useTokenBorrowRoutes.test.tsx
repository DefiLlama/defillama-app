import { useQuery } from '@tanstack/react-query'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { useTokenBorrowRoutes } from './useTokenBorrowRoutes'

vi.mock('@tanstack/react-query', () => ({
	useQuery: vi.fn(() => ({ data: null, error: null, isLoading: false }))
}))

function Probe({ tokenSymbol }: { tokenSymbol: string }) {
	useTokenBorrowRoutes(tokenSymbol)
	return <div>probe</div>
}

describe('useTokenBorrowRoutes', () => {
	it('uses a stable token-page query key and shared cache settings', () => {
		renderToStaticMarkup(<Probe tokenSymbol="ETH" />)

		expect(useQuery).toHaveBeenCalledWith(
			expect.objectContaining({
				queryKey: ['token-borrow-routes', 'token-page', 'ETH'],
				staleTime: 60 * 60 * 1000,
				refetchOnWindowFocus: false,
				retry: false,
				enabled: true
			})
		)
	})
})
