import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { useFinalTVL, getAdjustedTotals } from '../helpers'
import type { IProtocolOverviewPageData } from '../types'

let tvlFeesSettings: Record<string, boolean> = {}

vi.mock('~/contexts/LocalStorage', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/contexts/LocalStorage')>()
	return {
		...actual,
		useLocalStorageSettingsManager: () => [tvlFeesSettings]
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

describe('getAdjustedTotals', () => {
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
})

describe('useFinalTVL', () => {
	it('adds enabled protocol overview TVL suffix extras while preserving non-setting suffixes', () => {
		tvlFeesSettings = { staking: true, doublecounted: true, liquidstaking: true }

		const result = getFinalTvlResult({
			...baseProtocolOverviewData,
			currentTvlByChain: {
				Ethereum: 100,
				'Arbitrum-staking': 20,
				'Base-doublecounted': 30,
				'Base-liquidstaking': 40,
				'Base-dcAndLsOverlap': 25,
				'OP-Mainnet': 7,
				borrowed: 9
			}
		})

		expect(result.tvl).toBe(222)
		expect(result.tvlByChain).toEqual([
			['Ethereum', 100],
			['Base', 70],
			['Base-dcAndLsOverlap', 25],
			['Arbitrum', 20],
			['OP-Mainnet', 7]
		])
		expect(result.toggleOptions.map((option) => option.key)).toEqual([
			'staking',
			'doublecounted',
			'liquidstaking',
			'borrowed'
		])
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

		expect(result.tvl).toBe(100)
		expect(result.tvlByChain).toEqual([['Ethereum', 100]])
		expect(result.toggleOptions.map((option) => option.key)).toEqual(['bribes', 'tokentax'])
	})

	it('applies tvl_fees TVL toggles to oracle TVS aggregation', () => {
		tvlFeesSettings = { staking: true, liquidstaking: false }

		const result = getFinalTvlResult({
			...baseProtocolOverviewData,
			oracleTvs: {
				Ethereum: 200,
				'Ethereum-staking': 30,
				'Ethereum-liquidstaking': 40
			}
		})

		expect(result.oracleTvs).toBe(230)
		expect(result.oracleTvsByChain).toEqual([['Ethereum', 230]])
		expect(result.toggleOptions.map((option) => option.key)).toEqual(['staking', 'liquidstaking'])
	})
})
