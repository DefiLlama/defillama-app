import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useCalcCirculating, useGroupChainsPegged } from '../hooks'

let chainGroupSettings: Record<string, boolean> = {}

vi.mock('~/contexts/LocalStorage', async (importOriginal) => {
	const actual = await importOriginal<typeof import('~/contexts/LocalStorage')>()
	return {
		...actual,
		useLocalStorageSettingsManager: () => [chainGroupSettings]
	}
})

function CalcCirculatingProbe({
	assets,
	includeUnreleased,
	onResult
}: {
	assets: Parameters<typeof useCalcCirculating>[0]
	includeUnreleased: boolean
	onResult: (result: ReturnType<typeof useCalcCirculating>) => void
}) {
	onResult(useCalcCirculating(assets, includeUnreleased))
	return null
}

function getCalcCirculatingResult(assets: Parameters<typeof useCalcCirculating>[0], includeUnreleased: boolean) {
	let result: ReturnType<typeof useCalcCirculating> | null = null

	renderToStaticMarkup(
		createElement(CalcCirculatingProbe, {
			assets,
			includeUnreleased,
			onResult: (value) => {
				result = value
			}
		})
	)

	if (result == null) throw new Error('Calc circulating probe did not render')
	return result
}

function GroupChainsProbe({
	chains,
	groupData,
	onResult
}: {
	chains: Parameters<typeof useGroupChainsPegged>[0]
	groupData: Parameters<typeof useGroupChainsPegged>[1]
	onResult: (result: ReturnType<typeof useGroupChainsPegged>) => void
}) {
	onResult(useGroupChainsPegged(chains, groupData))
	return null
}

function getGroupChainsResult(
	chains: Parameters<typeof useGroupChainsPegged>[0],
	groupData: Parameters<typeof useGroupChainsPegged>[1]
) {
	let result: ReturnType<typeof useGroupChainsPegged> | null = null

	renderToStaticMarkup(
		createElement(GroupChainsProbe, {
			chains,
			groupData,
			onResult: (value) => {
				result = value
			}
		})
	)

	if (result == null) throw new Error('Group chains probe did not render')
	return result
}

beforeEach(() => {
	chainGroupSettings = {}
})

describe('useCalcCirculating', () => {
	it('adds unreleased supply before sorting and omits delisted assets', () => {
		const result = getCalcCirculatingResult(
			[
				{ name: 'Old', circulating: 999, unreleased: 1, mcap: 999, delisted: true },
				{ name: 'Beta', circulating: 50, unreleased: 10, mcap: 200, pegType: 'peggedVAR', pegDeviation: 3 },
				{ name: 'Alpha', circulating: 100, unreleased: 25, mcap: 100, pegDeviation: null }
			],
			true
		)

		expect(result.map((asset) => asset.name)).toEqual(['Beta', 'Alpha'])
		expect(result.map((asset) => asset.circulating)).toEqual([60, 125])
		expect(result[0].floatingPeg).toBe(true)
		expect(result[0].depeggedTwoPercent).toBe(true)
	})
})

describe('useGroupChainsPegged', () => {
	it('groups enabled child chains into their parent without duplicating subrows', () => {
		chainGroupSettings = { L2: true }

		const result = getGroupChainsResult(
			[
				{ name: 'Parent', mcap: 100, unreleased: 5, bridgedTo: 1, minted: 2 },
				{ name: 'Child', mcap: 40, unreleased: 3, bridgedTo: 4, minted: 5 },
				{ name: 'Solo', mcap: 70, unreleased: null, bridgedTo: null, minted: null }
			],
			{
				Parent: {
					L2: ['Child', 'Child']
				}
			}
		)

		expect(result.map((chain) => [chain.name, chain.mcap, chain.subRows?.map((subRow) => subRow.name)])).toEqual([
			['Parent', 140, ['Parent', 'Child']],
			['Solo', 70, undefined]
		])
	})
})
