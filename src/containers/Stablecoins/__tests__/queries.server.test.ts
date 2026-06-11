import { describe, expect, it } from 'vitest'
import { normalizeStablecoinBridges } from '../queries.server'

describe('stablecoin server query helpers', () => {
	it('normalizes bridge payloads while ignoring optional or missing bridge fields', () => {
		expect(
			normalizeStablecoinBridges({
				celer: {
					Ethereum: { amount: 10 },
					Polygon: {},
					Base: null
				},
				layerzero: {
					Arbitrum: { amount: 0 },
					Optimism: { amount: '12' }
				},
				empty: {},
				invalid: null
			})
		).toEqual({
			celer: {
				Ethereum: { amount: 10 }
			},
			layerzero: {
				Arbitrum: { amount: 0 },
				Optimism: { amount: 12 }
			}
		})
	})

	it('returns null when no bridge source has a finite amount', () => {
		expect(
			normalizeStablecoinBridges({
				celer: {
					Ethereum: {},
					Polygon: { amount: 'not-a-number' }
				}
			})
		).toBeNull()
	})
})
