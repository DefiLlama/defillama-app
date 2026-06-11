import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fetchJsonMock } = vi.hoisted(() => ({ fetchJsonMock: vi.fn() }))

vi.mock('~/utils/async', () => ({ fetchJson: fetchJsonMock }))

import { fetchRWAActiveTVLs, fetchRWAAssetDataById, toUnixMsTimestamp } from '../api'

beforeEach(() => {
	vi.clearAllMocks()
})

describe('RWA api timestamp normalization', () => {
	it('keeps unix seconds versus milliseconds behavior unchanged', () => {
		expect(toUnixMsTimestamp(1_774_483_200)).toBe(1_774_483_200_000)
		expect(toUnixMsTimestamp(1_774_483_200_000)).toBe(1_774_483_200_000)
	})

	it('preserves malformed timestamp outputs at the raw timestamp boundary', () => {
		expect(toUnixMsTimestamp(Number.NaN)).toBeNaN()
		expect(toUnixMsTimestamp(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY)
	})
})

describe('RWA api project normalization', () => {
	it('normalizes raw numeric maps at the active TVL fetch boundary', async () => {
		fetchJsonMock.mockResolvedValueOnce([
			{
				id: 'alpha',
				ticker: 'ALPHA',
				onChainMcap: { Ethereum: '123', Bad: 'nope' },
				activeMcap: { Ethereum: 45, Nullish: null },
				defiActiveTvl: {
					Ethereum: { Aave: '10', Bad: 'nope' },
					Base: null
				}
			}
		])

		await expect(fetchRWAActiveTVLs()).resolves.toMatchObject([
			{
				id: 'alpha',
				onChainMcap: { Ethereum: 123, Bad: 0 },
				activeMcap: { Ethereum: 45, Nullish: 0 },
				defiActiveTvl: {
					Ethereum: { Aave: 10, Bad: 0 },
					Base: {}
				}
			}
		])
	})

	it('normalizes raw numeric maps for a single asset response', async () => {
		fetchJsonMock.mockResolvedValueOnce({
			id: 'beta',
			ticker: 'BETA',
			onChainMcap: { Ethereum: '5' },
			activeMcap: null,
			defiActiveTvl: null
		})

		await expect(fetchRWAAssetDataById('beta')).resolves.toMatchObject({
			id: 'beta',
			onChainMcap: { Ethereum: 5 },
			activeMcap: null,
			defiActiveTvl: null
		})
	})
})
