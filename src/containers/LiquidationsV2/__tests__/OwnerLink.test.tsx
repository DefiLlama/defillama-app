import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { LiquidationPosition } from '../api.types'
import { LiquidationsExplorerProvider, LiquidationsOwnerLink } from '../OwnerLink'

const basePosition: LiquidationPosition = {
	protocolId: 'aave',
	protocolName: 'Aave',
	protocolSlug: 'aave',
	chainId: 'arbitrum',
	chainName: 'Arbitrum One',
	chainSlug: 'arbitrum-one',
	owner: '0x1234567890abcdef1234567890abcdef12345678',
	ownerName: 'Treasury Wallet',
	ownerUrlOverride: null,
	liqPrice: 1234,
	collateral: 'WBTC',
	collateralAmount: 1.25,
	collateralAmountUsd: 110000
}

describe('LiquidationsOwnerLink', () => {
	it('prefers the explicit override url', () => {
		const html = renderToStaticMarkup(
			<LiquidationsExplorerProvider
				blockExplorers={[
					{
						displayName: 'Arbitrum',
						llamaChainId: 'arbitrum',
						evmChainId: 42161,
						blockExplorers: [{ name: 'Arbiscan', url: 'https://arbiscan.io' }]
					}
				]}
			>
				<LiquidationsOwnerLink position={{ ...basePosition, ownerUrlOverride: 'https://example.com/override' }} />
			</LiquidationsExplorerProvider>
		)

		expect(html).toContain('href="https://example.com/override"')
		expect(html).not.toContain('href="https://arbiscan.io/address/')
	})

	it('derives a block explorer url for supported chains', () => {
		const html = renderToStaticMarkup(
			<LiquidationsExplorerProvider
				blockExplorers={[
					{
						displayName: 'Arbitrum',
						llamaChainId: 'arbitrum',
						evmChainId: 42161,
						blockExplorers: [{ name: 'Arbiscan', url: 'https://arbiscan.io' }]
					}
				]}
			>
				<LiquidationsOwnerLink position={basePosition} />
			</LiquidationsExplorerProvider>
		)

		expect(html).toContain(`href="https://arbiscan.io/address/${basePosition.owner}"`)
	})

	it('renders plain text when no explorer match exists', () => {
		const html = renderToStaticMarkup(
			<LiquidationsExplorerProvider blockExplorers={[]}>
				<LiquidationsOwnerLink position={basePosition} />
			</LiquidationsExplorerProvider>
		)

		expect(html).toContain('Treasury Wallet')
		expect(html).not.toContain('href=')
	})
})
