import { attributeOptions, attributeOptionsMap } from '../Filters/Attributes'
import type { YieldPool, YieldTokenCategories, YieldView } from '../types'

const TETHER_SYMBOL_PATTERN = /₮0?/gu

export function normalizeYieldToken(token: string): string {
	const normalizedToken = token.normalize('NFKC').trim().toLowerCase().replaceAll(TETHER_SYMBOL_PATTERN, 't')

	return normalizedToken === 't' ? 'usdt' : normalizedToken
}

export function extractYieldPoolTokens(symbol: string): string[] {
	return symbol.split('(')[0].split('-').map(normalizeYieldToken).filter(Boolean)
}

type TokenCategory = { addresses: string[]; symbols: string[]; label: string; filterKey: string }

function findTokenCategory(token: string, tokenCategories: YieldTokenCategories): TokenCategory | undefined {
	return Object.values(tokenCategories).find((cat) => cat.filterKey?.toLowerCase() === token)
}

function poolMatchesTokenCategory(
	curr: YieldPool,
	tokensInPool: string[],
	category: TokenCategory,
	poolTokenIndex?: number
) {
	const { addresses: catAddresses, symbols: catSymbols } = category
	const underlyingTokens = curr.underlyingTokens ?? []
	const chainMapping: Record<string, string> = {
		avalanche: 'avax',
		gnosis: 'xdai'
	}
	let chain = curr.chain?.toLowerCase()
	chain = chainMapping[chain] ?? chain

	if (underlyingTokens.length > 0) {
		const addressSet = new Set(catAddresses)
		if (poolTokenIndex != null) {
			const addr = underlyingTokens[poolTokenIndex]
			return !!addr && addressSet.has(`${chain}:${addr.toLowerCase().replaceAll('/', ':')}`)
		}
		return underlyingTokens.some(
			(addr: string) => !!addr && addressSet.has(`${chain}:${addr.toLowerCase().replaceAll('/', ':')}`)
		)
	}

	if (catSymbols?.length > 0) {
		const symbolSet = new Set(catSymbols)
		if (poolTokenIndex != null) return symbolSet.has(tokensInPool[poolTokenIndex])
		return tokensInPool.some((sym) => symbolSet.has(sym))
	}

	return false
}

function poolTokenMatchesToken(
	poolToken: string,
	poolTokenIndex: number,
	token: string,
	curr: YieldPool,
	tokensInPool: string[],
	normalizedUsdPeggedSymbols: string[],
	tokenCategories: YieldTokenCategories
): boolean {
	if (token === 'all_bitcoins') {
		return poolToken.includes('btc')
	}

	if (token === 'all_usd_stables') {
		return normalizedUsdPeggedSymbols.some((usd) => poolToken.includes(usd))
	}

	const categoryEntry = findTokenCategory(token, tokenCategories)
	if (categoryEntry) {
		return poolMatchesTokenCategory(curr, tokensInPool, categoryEntry, poolTokenIndex)
	}

	return poolToken === token || poolToken === `w${token}`
}

function tokensMatchPair({
	curr,
	tokensInPool,
	pairParts,
	normalizedUsdPeggedSymbols,
	tokenCategories
}: {
	curr: YieldPool
	tokensInPool: string[]
	pairParts: string[]
	normalizedUsdPeggedSymbols: string[]
	tokenCategories: YieldTokenCategories
}): boolean {
	if (tokensInPool.length !== pairParts.length) return false

	const matchedPoolTokenIndexes = new Set<number>()

	const matchPairPart = (pairPartIndex: number): boolean => {
		if (pairPartIndex === pairParts.length) return true

		const pairPart = pairParts[pairPartIndex]
		for (let poolTokenIndex = 0; poolTokenIndex < tokensInPool.length; poolTokenIndex++) {
			if (matchedPoolTokenIndexes.has(poolTokenIndex)) continue
			if (
				!poolTokenMatchesToken(
					tokensInPool[poolTokenIndex],
					poolTokenIndex,
					pairPart,
					curr,
					tokensInPool,
					normalizedUsdPeggedSymbols,
					tokenCategories
				)
			) {
				continue
			}

			matchedPoolTokenIndexes.add(poolTokenIndex)
			if (matchPairPart(pairPartIndex + 1)) return true
			matchedPoolTokenIndexes.delete(poolTokenIndex)
		}

		return false
	}

	return matchPairPart(0)
}

interface YieldPoolQueryMatchOptions {
	curr: YieldPool
	selectedProjectsSet: Set<string>
	selectedChainsSet: Set<string>
	selectedAttributes: string[]
	includeTokens: string[]
	exactTokens: string[]
	selectedCategoriesSet: Set<string>
	excludeTokensSet: Set<string>
	view: YieldView
	minTvl: number | null
	maxTvl: number | null
	minApy: number | null
	maxApy: number | null
	pairTokens: string[]
	usdPeggedSymbols: string[]
	tokenCategories?: YieldTokenCategories
}

function viewPathForDefaultPredicates(view: YieldView): string | null {
	switch (view) {
		case 'main':
			return '/yields'
		case 'stablecoins':
			return '/yields/stablecoins'
		default:
			return null
	}
}

// Compatibility note: this module intentionally preserves legacy token and range quirks for a structure-only refactor.
// Broad include-token matching, stricter exact matching, exact exclude matching, pair-token precedence, inclusive TVL
// bounds, and exclusive APY bounds should only change in a separate behavior-change PR.
export function matchesYieldPoolForQuery({
	curr,
	selectedProjectsSet,
	selectedChainsSet,
	selectedAttributes,
	includeTokens,
	excludeTokensSet,
	exactTokens,
	selectedCategoriesSet,
	view,
	minTvl,
	maxTvl,
	minApy,
	maxApy,
	pairTokens,
	usdPeggedSymbols,
	tokenCategories = {}
}: YieldPoolQueryMatchOptions) {
	const tokensInPoolArray = extractYieldPoolTokens(curr.symbol)
	const tokensInPoolSet = new Set<string>(tokensInPoolArray)

	let toFilter = true
	const defaultPathname = viewPathForDefaultPredicates(view)

	for (const option of attributeOptions) {
		if (defaultPathname && option.defaultFilterFnOnPage[defaultPathname]) {
			toFilter = toFilter && option.defaultFilterFnOnPage[defaultPathname](curr)
		}

		if (view === 'main' && option.key === 'apy_zero' && !selectedAttributes.includes(option.key)) {
			toFilter = toFilter && curr.apy > 0
		}
	}

	for (const attribute of selectedAttributes) {
		const attributeOption = attributeOptionsMap.get(attribute)

		if (attributeOption) {
			toFilter = toFilter && attributeOption.filterFn(curr)
		}
	}

	toFilter = toFilter && selectedProjectsSet.has(curr.projectName)
	toFilter = toFilter && selectedCategoriesSet.has(curr.category)

	const tokensInPool: string[] = tokensInPoolArray

	if (pairTokens.length > 0) {
		let atLeastOnePairToken = false
		const normalizedUsdPeggedSymbols = usdPeggedSymbols.map(normalizeYieldToken)
		for (const pairToken of pairTokens) {
			const pt = pairToken.split('-')
			if (
				tokensMatchPair({
					curr,
					tokensInPool,
					pairParts: pt,
					normalizedUsdPeggedSymbols,
					tokenCategories
				})
			) {
				atLeastOnePairToken = true
				break
			}
		}

		toFilter = toFilter && atLeastOnePairToken
	} else if (exactTokens.length === 0) {
		const includeToken =
			includeTokens.length > 0 && includeTokens[0] !== 'all'
				? includeTokens.find((token) => {
						if (token === 'all_bitcoins') {
							return tokensInPool.some((x) => x.includes('btc'))
						} else if (token === 'all_usd_stables') {
							if (!curr.stablecoin) return false
							if (!Array.isArray(usdPeggedSymbols) || usdPeggedSymbols.length === 0) return false
							const normalizedUsdPeggedSymbols = usdPeggedSymbols.map(normalizeYieldToken)
							return (
								tokensInPool.length > 0 &&
								tokensInPool.every((sym) => normalizedUsdPeggedSymbols.some((usd) => sym.includes(usd)))
							)
						} else {
							const categoryEntry = findTokenCategory(token, tokenCategories)
							if (categoryEntry) {
								return poolMatchesTokenCategory(curr, tokensInPool, categoryEntry)
							}

							if (tokensInPool.some((x) => x.includes(token))) {
								return true
							} else if (token === 'eth') {
								return tokensInPool.find((x) => x.includes('weth') && x.includes(token))
							} else return false
						}
					})
				: true

		let hasExcludedToken = false
		for (const token of excludeTokensSet) {
			if (tokensInPoolSet.has(token)) {
				hasExcludedToken = true
				break
			}
		}

		toFilter = toFilter && selectedChainsSet.has(curr.chain) && includeToken && !hasExcludedToken
	} else {
		const exactToken = exactTokens.find((token) => {
			if (tokensInPoolSet.has(token)) {
				return true
			} else if (token === 'eth') {
				return tokensInPool.find((x) => x.includes('weth') && x === token)
			} else return false
		})

		toFilter = toFilter && !!(selectedChainsSet.has(curr.chain) && exactToken)
	}

	const isValidTvlRange = minTvl != null || maxTvl != null
	const isValidApyRange = minApy != null || maxApy != null

	if (isValidTvlRange) {
		toFilter =
			toFilter && (minTvl != null ? curr.tvlUsd >= minTvl : true) && (maxTvl != null ? curr.tvlUsd <= maxTvl : true)
	}

	if (isValidApyRange) {
		toFilter = toFilter && (minApy != null ? curr.apy > minApy : true) && (maxApy != null ? curr.apy < maxApy : true)
	}

	return toFilter
}

export interface YieldPoolFilterState {
	selectedProjects: string[]
	selectedChains: string[]
	selectedAttributes: string[]
	includeTokens: string[]
	excludeTokens: string[]
	exactTokens?: string[]
	selectedCategories: string[]
	pairTokens?: string[]
	minTvl: number | null
	maxTvl: number | null
	minApy: number | null
	maxApy: number | null
}

export function filterYieldPools({
	pools,
	view,
	filters,
	usdPeggedSymbols = [],
	tokenCategories
}: {
	pools: YieldPool[]
	view: YieldView
	filters: YieldPoolFilterState
	usdPeggedSymbols?: string[]
	tokenCategories?: YieldTokenCategories
}): YieldPool[] {
	const selectedProjectsSet = new Set(filters.selectedProjects)
	const selectedChainsSet = new Set(filters.selectedChains)
	const selectedCategoriesSet = new Set(filters.selectedCategories)
	const includeTokens = filters.includeTokens.map((token) => normalizeYieldToken(token))
	const excludeTokensSet = new Set(filters.excludeTokens.map((token) => normalizeYieldToken(token)))
	const exactTokens = (filters.exactTokens ?? []).map((token) => normalizeYieldToken(token))
	const pairTokens = (filters.pairTokens ?? []).map((token) => normalizeYieldToken(token))
	const filteredPools: YieldPool[] = []

	for (const curr of pools) {
		if (
			matchesYieldPoolForQuery({
				curr,
				view,
				selectedProjectsSet,
				selectedChainsSet,
				selectedAttributes: filters.selectedAttributes,
				includeTokens,
				excludeTokensSet,
				exactTokens,
				selectedCategoriesSet,
				minTvl: filters.minTvl,
				maxTvl: filters.maxTvl,
				minApy: filters.minApy,
				maxApy: filters.maxApy,
				pairTokens,
				usdPeggedSymbols,
				tokenCategories
			})
		) {
			filteredPools.push(curr)
		}
	}

	return filteredPools
}
