import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchProtocolTreasuryChart, fetchProtocolTvlChart } from '../api'

const fetchJsonMock = vi.hoisted(() => vi.fn())

vi.mock('~/utils/async', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/utils/async')>()
	return {
		...actual,
		fetchJson: fetchJsonMock
	}
})

describe('ProtocolOverview API chart fetchers', () => {
	beforeEach(() => {
		fetchJsonMock.mockReset()
	})

	it('fetches and normalizes TVL value charts from the TVL namespace', async () => {
		fetchJsonMock.mockResolvedValue([
			[2, 20],
			[1, 10]
		])

		const result = await fetchProtocolTvlChart({ protocol: 'aave', key: 'pool2', currency: 'ETH' })

		const url = String(fetchJsonMock.mock.calls[0][0])
		expect(url).toContain('/chart/tvl/protocol/aave?key=pool2&currency=ETH')
		expect(url).not.toContain('/chart/treasury/')
		expect(result).toEqual([
			[1000, 10],
			[2000, 20]
		])
	})

	it('fetches and normalizes TVL chain breakdown charts from the TVL namespace', async () => {
		fetchJsonMock.mockResolvedValue([
			[2, { Ethereum: 20 }],
			[1, { Ethereum: 10 }]
		])

		const result = await fetchProtocolTvlChart({ protocol: 'aave', breakdownType: 'chain-breakdown' })

		const url = String(fetchJsonMock.mock.calls[0][0])
		expect(url).toContain('/chart/tvl/protocol/aave/chain-breakdown')
		expect(url).not.toContain('/chart/treasury/')
		expect(result).toEqual([
			[1000, { Ethereum: 10 }],
			[2000, { Ethereum: 20 }]
		])
	})

	it('fetches and normalizes treasury token breakdown charts from the treasury namespace', async () => {
		fetchJsonMock.mockResolvedValue([
			[2, { MKR: 20 }],
			[1, { MKR: 10 }]
		])

		const result = await fetchProtocolTreasuryChart({
			protocol: 'makerdao',
			key: 'ownTokens',
			currency: 'token',
			breakdownType: 'token-breakdown'
		})

		const url = String(fetchJsonMock.mock.calls[0][0])
		expect(url).toContain('/chart/treasury/protocol/makerdao/token-breakdown?key=ownTokens&currency=token')
		expect(url).not.toContain('/chart/tvl/')
		expect(result).toEqual([
			[1000, { MKR: 10 }],
			[2000, { MKR: 20 }]
		])
	})
})
