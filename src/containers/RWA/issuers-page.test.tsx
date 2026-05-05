import { describe, expect, it, vi } from 'vitest'
import type { RWAIssuerSegmentedRow } from './Issuers'

const fetchRWAActiveTVLsMock = vi.fn()

vi.mock('~/containers/RWA/api', () => ({
	fetchRWAActiveTVLs: (...args: unknown[]) => fetchRWAActiveTVLsMock(...args)
}))

import { getStaticProps } from '~/pages/rwa/issuers'

describe('/rwa/issuers', () => {
	it('builds issuer rows from the live dataset', async () => {
		fetchRWAActiveTVLsMock.mockResolvedValue([
			{
				id: 'a',
				issuer: 'IssuerA',
				chain: ['Ethereum'],
				onChainMcap: { Ethereum: 10 },
				activeMcap: { Ethereum: 9 },
				defiActiveTvl: { Ethereum: { Aave: 1 } }
			},
			{
				id: 'b',
				issuer: 'IssuerA',
				chain: ['Solana'],
				onChainMcap: { Solana: 5 },
				activeMcap: { Solana: 4 },
				defiActiveTvl: { Solana: { Kamino: 2 } }
			},
			{
				id: 'c',
				issuer: 'IssuerB',
				onChainMcap: { Ethereum: 7 },
				activeMcap: { Ethereum: 6 },
				defiActiveTvl: { Ethereum: { Morpho: 3 } }
			},
			{
				id: 'd',
				issuer: 'IssuerC',
				stablecoin: true,
				onChainMcap: { Ethereum: 100 },
				activeMcap: { Ethereum: 100 },
				defiActiveTvl: { Ethereum: { Aave: 10 } }
			}
		])

		const res = await getStaticProps({} as never)
		expect(res).toHaveProperty('props.rows')
		if (!('props' in res)) throw new Error('Expected props result')
		const rows = res.props.rows as RWAIssuerSegmentedRow[]
		expect(rows.map((r) => r.issuer)).toEqual(['IssuerA', 'IssuerB', 'IssuerC'])
		expect(rows[0].base.chains).toEqual(['Ethereum', 'Solana'])
		expect(rows[2].base.assetCount).toBe(0)
		expect(rows[2].stablecoinsOnly.assetCount).toBe(1)
	})
})
