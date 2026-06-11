import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useFinalTVL, getAdjustedTotals } from '../helpers'
import type { IProtocolOverviewPageData } from '../types'

let tvlFeesSettings: Record<string, boolean> = {}
let localStorageSettingKeys: string[] = []

vi.mock('~/contexts/LocalStorage', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/contexts/LocalStorage')>()
	return {
		...actual,
		useLocalStorageSettingsManager: (settingsKey: string) => {
			localStorageSettingKeys.push(settingsKey)
			return [tvlFeesSettings]
		}
	}
})

const baseProtocolOverviewData = {
	currentTvlByChain: null,
	oracleTvs: null,
	bribeRevenue: null,
	tokenTax: null
} as IProtocolOverviewPageData

function FinalTvlProbe({
	props,
	onResult
}: {
	props: IProtocolOverviewPageData
	onResult: (result: ReturnType<typeof useFinalTVL>) => void
}) {
	onResult(useFinalTVL(props))
	return null
}

function getFinalTvlResult(props: IProtocolOverviewPageData) {
	let result: ReturnType<typeof useFinalTVL> | null = null

	renderToStaticMarkup(
		createElement(FinalTvlProbe, {
			props,
			onResult: (value) => {
				result = value
			}
		})
	)

	if (result == null) throw new Error('Final TVL probe did not render')
	return result
}

beforeEach(() => {
	tvlFeesSettings = {}
	localStorageSettingKeys = []
})

describe('getAdjustedTotals', () => {
	it('keeps disabled extra-only periods null while preserving base periods', () => {
		const result = getAdjustedTotals(
			{ total24h: null, total7d: 700, total30d: null, totalAllTime: null },
			{ total24h: 10, total30d: 300, totalAllTime: 1000 },
			{ total24h: 5, total30d: 30 },
			{ bribes: false, tokentax: false }
		)

		expect(result).toMatchObject({
			total24h: null,
			total7d: 700,
			total30d: null,
			totalAllTime: null
		})
	})

	it('returns null when only disabled extras have totals', () => {
		const result = getAdjustedTotals(
			null,
			{ total24h: 10, total7d: 70 },
			{ total24h: 5, total30d: 30 },
			{ bribes: false, tokentax: false }
		)

		expect(result).toBeNull()
	})

	it('uses enabled extras as period values when base periods are missing', () => {
		const result = getAdjustedTotals(
			{ total24h: null, total7d: null, total30d: 300, totalAllTime: null },
			{ total24h: 10, totalAllTime: 1000 },
			{ total24h: 5, total7d: 70 },
			{ bribes: true, tokentax: true }
		)

		expect(result).toMatchObject({
			total24h: 15,
			total7d: 70,
			total30d: 300,
			totalAllTime: 1000
		})
	})

	it('includes enabled trailing 12-month extra revenue when base trailing 12-month revenue is missing', () => {
		const result = getAdjustedTotals(
			{ total30d: 300, total1y: null },
			{ total1y: 700 },
			{ total1y: 200 },
			{ bribes: true, tokentax: true }
		)

		expect(result?.total1y).toBe(900)
	})

	it('keeps trailing 12-month totals null when no selected source has that period', () => {
		const result = getAdjustedTotals(
			{ total30d: 300, total1y: null },
			{ total1y: 700 },
			{ total1y: 200 },
			{ bribes: false, tokentax: false }
		)

		expect(result?.total1y).toBeNull()
	})

	it('sums enabled annualized1y values from base and extra revenue sources', () => {
		const result = getAdjustedTotals(
			{ total30d: 300, annualized1y: 5000 },
			{ annualized1y: 700 },
			{ annualized1y: 200 },
			{ bribes: true, tokentax: true }
		)

		expect(result?.annualized1y).toBe(5900)
	})

	it('keeps annualized1y null when no selected source has it', () => {
		const result = getAdjustedTotals(
			{ total30d: 300, annualized1y: null },
			{ annualized1y: 700 },
			{ annualized1y: 200 },
			{ bribes: false, tokentax: false }
		)

		expect(result?.annualized1y).toBeNull()
	})

	it('returns annualized1y when it is the only selected period', () => {
		const result = getAdjustedTotals(null, { annualized1y: 700 }, null, { bribes: true, tokentax: false })

		expect(result).toMatchObject({
			total24h: null,
			total7d: null,
			total30d: null,
			total1y: null,
			annualized1y: 700,
			totalAllTime: null
		})
	})

	it('keeps enabled zero-only extra periods null when the base period is missing', () => {
		const result = getAdjustedTotals(null, { total24h: 0 }, null, { bribes: true, tokentax: false })

		expect(result?.total24h).toBeNull()
	})
})

describe('useFinalTVL', () => {
	it('adds enabled protocol overview TVL suffix extras while preserving chain hyphen suffixes', () => {
		tvlFeesSettings = { staking: true, pool2: true, borrowed: false }

		const result = getFinalTvlResult({
			...baseProtocolOverviewData,
			currentTvlByChain: {
				Ethereum: 100,
				'Arbitrum-staking': 20,
				'Base-pool2': 30,
				'OP-Mainnet': 7,
				borrowed: 9
			}
		})

		expect(localStorageSettingKeys).toEqual(['tvl_fees'])
		expect(result.tvl).toBe(157)
		expect(result.tvlByChain).toEqual([
			['Ethereum', 100],
			['Base', 30],
			['Arbitrum', 20],
			['OP-Mainnet', 7]
		])
		expect(result.toggleOptions.map((option) => option.key)).toEqual(['staking', 'pool2', 'borrowed'])
	})

	it('keeps disabled protocol overview TVL extras out of totals but exposes their toggle options', () => {
		tvlFeesSettings = { staking: false, borrowed: false }

		const result = getFinalTvlResult({
			...baseProtocolOverviewData,
			currentTvlByChain: {
				Ethereum: 100,
				'Ethereum-staking': 20,
				borrowed: 9
			}
		})

		expect(localStorageSettingKeys).toEqual(['tvl_fees'])
		expect(result.tvl).toBe(100)
		expect(result.tvlByChain).toEqual([['Ethereum', 100]])
		expect(result.toggleOptions.map((option) => option.key)).toEqual(['staking', 'borrowed'])
	})

	it('exposes fee extra options from tvl_fees without changing TVL aggregation', () => {
		tvlFeesSettings = { bribes: true, tokentax: true }

		const result = getFinalTvlResult({
			...baseProtocolOverviewData,
			currentTvlByChain: {
				Ethereum: 100
			},
			bribeRevenue: { total24h: 1 } as IProtocolOverviewPageData['bribeRevenue'],
			tokenTax: { total7d: 2 } as IProtocolOverviewPageData['tokenTax']
		})

		expect(localStorageSettingKeys).toEqual(['tvl_fees'])
		expect(result.tvl).toBe(100)
		expect(result.tvlByChain).toEqual([['Ethereum', 100]])
		expect(result.toggleOptions.map((option) => option.key)).toEqual(['bribes', 'tokentax'])
	})

	it('applies tvl_fees TVL toggles to oracle TVS aggregation', () => {
		tvlFeesSettings = { staking: true, pool2: false }

		const result = getFinalTvlResult({
			...baseProtocolOverviewData,
			oracleTvs: {
				Ethereum: 200,
				'Ethereum-staking': 30,
				'Ethereum-pool2': 40
			}
		})

		expect(localStorageSettingKeys).toEqual(['tvl_fees'])
		expect(result.oracleTvs).toBe(230)
		expect(result.oracleTvsByChain).toEqual([['Ethereum', 230]])
		expect(result.toggleOptions.map((option) => option.key)).toEqual(['staking', 'pool2'])
	})
})
