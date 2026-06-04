import { describe, expect, it, vi } from 'vitest'
import type { IFetchedRWAProject } from '../api.types'
import { matchRwaYieldPools, type RWAYieldPoolData } from '../yieldMatching'

vi.mock('~/utils/metadata', () => ({
	default: {
		protocolMetadata: {
			'issuer-protocol': { name: 'issuer-slug' }
		}
	}
}))

const baseAsset: IFetchedRWAProject = {
	id: 'asset-1',
	ticker: 'USDY'
}

function pool(overrides: Partial<RWAYieldPoolData['allPools'][number]>): RWAYieldPoolData['allPools'][number] {
	return {
		pool: 'pool-id',
		project: 'defi-protocol',
		symbol: 'USDY',
		chain: 'Ethereum',
		apy: 5,
		apyBase: 4,
		exposure: 'single',
		ilRisk: 'no',
		underlyingTokens: [],
		tvlUsd: 100,
		...overrides
	}
}

function yieldPoolData(allPools: RWAYieldPoolData['allPools']): RWAYieldPoolData {
	return {
		allPools,
		configProtocols: {
			'defi-protocol': { name: 'DeFi Protocol' },
			'issuer-slug': { name: 'Issuer Native Yield' }
		},
		poolUrls: {
			'address-pool': 'https://example.com/address-pool',
			'project-pool': 'https://example.com/project-pool',
			'ticker-pool': 'https://example.com/ticker-pool',
			'native-pool': 'https://example.com/native-pool'
		}
	}
}

describe('matchRwaYieldPools', () => {
	it('matches pools by underlying token address', async () => {
		const result = await matchRwaYieldPools(
			{
				...baseAsset,
				contracts: { Ethereum: ['0xABC'] }
			},
			yieldPoolData([pool({ pool: 'address-pool', underlyingTokens: ['0xabc'], tvlUsd: 300 })])
		)

		expect(result.yieldPools?.[0]).toMatchObject({
			configID: 'address-pool',
			pool: 'USDY',
			project: 'DeFi Protocol',
			tvl: 300,
			url: 'https://example.com/address-pool'
		})
		expect(result.yieldPoolsTotal).toBe(1)
	})

	it('matches pools by project metadata and ticker', async () => {
		const result = await matchRwaYieldPools(
			{
				...baseAsset,
				projectId: 'issuer-protocol'
			},
			yieldPoolData([pool({ pool: 'project-pool', project: 'issuer-slug', symbol: 'sUSDY', tvlUsd: 200 })])
		)

		expect(result.nativeYieldPoolId).toBe('project-pool')
		expect(result.nativeYieldCurrent).toBe(4)
		expect(result.yieldPools).toBeNull()
		expect(result.yieldPoolsTotal).toBeNull()
	})

	it('uses exact ticker fallback across protocols', async () => {
		const result = await matchRwaYieldPools(
			baseAsset,
			yieldPoolData([pool({ pool: 'ticker-pool', symbol: 'USDC-USDY', tvlUsd: 150 })])
		)

		expect(result.yieldPools?.[0]).toMatchObject({
			configID: 'ticker-pool',
			projectslug: 'defi-protocol'
		})
		expect(result.nativeYieldPoolId).toBeNull()
	})

	it('keeps missing pool urls falsy', async () => {
		const result = await matchRwaYieldPools(
			baseAsset,
			yieldPoolData([pool({ pool: 'missing-url-pool', symbol: 'USDC-USDY', tvlUsd: 150 })])
		)

		expect(result.yieldPools?.[0]?.url).toBe('')
	})

	it('separates native issuer yield from DeFi yield opportunities', async () => {
		const result = await matchRwaYieldPools(
			{
				...baseAsset,
				issuer: 'Issuer Native Yield'
			},
			yieldPoolData([
				pool({ pool: 'native-pool', project: 'issuer-native-yield', tvlUsd: 1000, apyBase: 3 }),
				pool({ pool: 'ticker-pool', project: 'defi-protocol', tvlUsd: 500, apyBase: 8 })
			])
		)

		expect(result.nativeYieldPoolId).toBe('native-pool')
		expect(result.nativeYieldCurrent).toBe(3)
		expect(result.yieldPools?.map((row) => row.configID)).toEqual(['ticker-pool'])
		expect(result.yieldPoolsTotal).toBe(1)
	})

	it('returns null yield fields when yield data is unavailable or empty', async () => {
		await expect(matchRwaYieldPools(baseAsset, null)).resolves.toEqual({
			yieldPools: null,
			yieldPoolsTotal: null,
			nativeYieldPoolId: null,
			nativeYieldCurrent: null
		})
		await expect(matchRwaYieldPools(baseAsset, yieldPoolData([]))).resolves.toEqual({
			yieldPools: null,
			yieldPoolsTotal: null,
			nativeYieldPoolId: null,
			nativeYieldCurrent: null
		})
	})
})
