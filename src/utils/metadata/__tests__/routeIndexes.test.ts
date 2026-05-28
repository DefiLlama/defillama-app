import { describe, expect, it } from 'vitest'
import {
	buildDigitalAssetTreasuryRoutesMetadata,
	buildNarrativeCategoriesMetadata,
	buildOracleRoutesMetadata,
	buildStablecoinPeggedAssetSlugs
} from '../routeIndexes'

describe('metadata route indexes', () => {
	it('builds narrative category ids without slugging ids', () => {
		expect(
			buildNarrativeCategoriesMetadata([
				{ id: 'ai-agents', name: 'AI Agents', mcap: 1, volume1D: null, nbCoins: 1 },
				{ id: 'rwa', name: 'RWA', mcap: 1, volume1D: null, nbCoins: 1 }
			])
		).toEqual({
			ids: ['ai-agents', 'rwa'],
			nameById: {
				'ai-agents': 'AI Agents',
				rwa: 'RWA'
			}
		})
	})

	it('builds oracle route indexes from chainsByOracle memberships', () => {
		expect(
			buildOracleRoutesMetadata({
				oraclesTVS: {
					Chainlink: {},
					'Pyth Network': {}
				},
				chainsByOracle: {
					Chainlink: ['Ethereum', 'Arbitrum One'],
					'Pyth Network': ['Solana']
				}
			})
		).toEqual({
			oracleNameBySlug: {
				chainlink: 'Chainlink',
				'pyth-network': 'Pyth Network'
			},
			chainNameBySlug: {
				ethereum: 'Ethereum',
				'arbitrum-one': 'Arbitrum One',
				solana: 'Solana'
			},
			chainSlugsByOracleSlug: {
				chainlink: ['ethereum', 'arbitrum-one'],
				'pyth-network': ['solana']
			}
		})
	})

	it('builds DAT asset and company slugs using route slug semantics', () => {
		expect(
			buildDigitalAssetTreasuryRoutesMetadata({
				assetMetadata: {
					'Bitcoin Cash': {
						name: 'Bitcoin Cash',
						ticker: 'BCH',
						geckoId: 'bitcoin-cash',
						companies: 1,
						totalAmount: 1,
						totalUsdValue: 1,
						circSupplyPerc: 1
					}
				},
				institutionMetadata: {
					1: {
						institutionId: 1,
						ticker: 'MSTR',
						name: 'Strategy',
						type: 'Public',
						price: 1,
						priceChange24h: null,
						volume24h: 1,
						mcapRealized: null,
						mcapRealistic: null,
						mcapMax: null,
						realized_mNAV: null,
						realistic_mNAV: null,
						max_mNAV: null,
						totalUsdValue: 1,
						totalCost: 1,
						holdings: {}
					}
				},
				institutions: [],
				assets: {},
				totalCompanies: 1,
				flows: {},
				mNAV: {}
			})
		).toEqual({
			assetSlugs: ['bitcoin-cash'],
			companySlugs: ['mstr']
		})
	})

	it('builds stablecoin pegged asset slugs from config keys', () => {
		expect(buildStablecoinPeggedAssetSlugs({ Tether: '1', 'Curve USD': '2' })).toEqual(['tether', 'curve-usd'])
	})
})
