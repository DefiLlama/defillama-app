import { describe, expect, it } from 'vitest'
import { buildOracleProtocolChainExtraSeries } from '../queries.client'

describe('buildOracleProtocolChainExtraSeries', () => {
	it('treats sparse chain rows as zero for the selected chain', () => {
		expect(
			buildOracleProtocolChainExtraSeries({
				chain: 'BSC',
				chainBreakdown: [
					{ timestamp: 1, BSC: 10 },
					{ timestamp: 2, Ethereum: 20 },
					{ timestamp: 3, BSC: 0 }
				]
			})
		).toEqual([
			[1, 10],
			[2, 0],
			[3, 0]
		])
	})
})
